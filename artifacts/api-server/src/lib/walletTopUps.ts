import { and, desc, eq } from "drizzle-orm";
import {
  db,
  trainingValueLedgerTable,
  usersTable,
  walletTopUpsTable,
} from "@workspace/db";
import { writeAuditLog } from "./audit";
import { getUncachableStripeClient } from "./stripeClient";
import type Stripe from "stripe";

export const WALLET_TOP_UP_AMOUNTS = [5_000, 10_000, 20_000] as const;
export type WalletTopUpAmount = (typeof WALLET_TOP_UP_AMOUNTS)[number];

export class WalletTopUpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function applicationBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const domain = process.env.REPLIT_DEV_DOMAIN ?? process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) throw new WalletTopUpError(500, "Wallet top-ups are not configured with an application URL.");
  return `https://${domain.trim()}`;
}

async function ensureTopUpPrice(
  stripe: Stripe,
  amountMinor: WalletTopUpAmount,
): Promise<string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(
    (candidate) => candidate.metadata.training_wallet_product === "true",
  );
  if (!product) {
    product = await stripe.products.create({
      name: "Marcus Training Wallet",
      metadata: { training_wallet_product: "true" },
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = prices.data.find(
    (price) =>
      price.currency === "eur" &&
      price.unit_amount === amountMinor &&
      price.type === "one_time" &&
      price.metadata.training_wallet_top_up_amount_minor === String(amountMinor),
  );
  if (existing) return existing.id;

  const price = await stripe.prices.create({
    currency: "eur",
    unit_amount: amountMinor,
    product: product.id,
    metadata: { training_wallet_top_up_amount_minor: String(amountMinor) },
  });
  return price.id;
}

export async function createWalletTopUpCheckout(input: {
  tenantId: string;
  clientUserId: string;
  amountMinor: WalletTopUpAmount;
  idempotencyKey: string;
}) {
  const [client] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.tenantId, input.tenantId),
        eq(usersTable.id, input.clientUserId),
        eq(usersTable.role, "client"),
      ),
    )
    .limit(1);
  if (!client) throw new WalletTopUpError(404, "Client account not found.");

  const [inserted] = await db
    .insert(walletTopUpsTable)
    .values({
      tenantId: input.tenantId,
      clientUserId: input.clientUserId,
      amountMinor: input.amountMinor,
      clientIdempotencyKey: input.idempotencyKey,
    })
    .onConflictDoNothing()
    .returning();

  const topUp = inserted ?? (await db
    .select()
    .from(walletTopUpsTable)
    .where(
      and(
        eq(walletTopUpsTable.tenantId, input.tenantId),
        eq(walletTopUpsTable.clientUserId, input.clientUserId),
        eq(walletTopUpsTable.clientIdempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1))[0];

  if (!topUp) throw new Error("Unable to start the wallet top-up.");
  if (topUp.amountMinor !== input.amountMinor) {
    throw new WalletTopUpError(409, "This request key has already been used for a different amount.");
  }
  if (topUp.checkoutUrl && topUp.status !== "failed" && topUp.status !== "cancelled") {
    return { topUp, checkoutUrl: topUp.checkoutUrl, replayed: true };
  }

  let stripe: Stripe;
  try {
    stripe = await getUncachableStripeClient();
  } catch {
    throw new WalletTopUpError(
      503,
      "Stripe Test Mode checkout is not configured yet. Please try again after it has been connected.",
    );
  }
  const price = await ensureTopUpPrice(stripe, input.amountMinor);
  const baseUrl = applicationBaseUrl();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client.email,
      client_reference_id: topUp.id,
      line_items: [{ price, quantity: 1 }],
      success_url: `${baseUrl}/?topup=success&top_up_id=${topUp.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?topup=cancelled&top_up_id=${topUp.id}`,
      metadata: {
        wallet_top_up_id: topUp.id,
        tenant_id: input.tenantId,
        client_user_id: input.clientUserId,
      },
      payment_intent_data: {
        metadata: {
          wallet_top_up_id: topUp.id,
          tenant_id: input.tenantId,
          client_user_id: input.clientUserId,
        },
      },
    },
    { idempotencyKey: `wallet-top-up-checkout:${topUp.id}` },
  );
  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");

  const [saved] = await db
    .update(walletTopUpsTable)
    .set({
      stripeCheckoutSessionId: session.id,
      checkoutUrl: session.url,
      status: "pending",
      updatedAt: new Date(),
    })
    .where(eq(walletTopUpsTable.id, topUp.id))
    .returning();
  if (!saved) throw new Error("Unable to save the Checkout Session.");
  return { topUp: saved, checkoutUrl: session.url, replayed: false };
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

export async function processWalletTopUpCheckout(
  event: Stripe.Event,
): Promise<{ credited: boolean; ignored: boolean }> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed" &&
    event.type !== "checkout.session.expired"
  ) {
    return { credited: false, ignored: true };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const topUpId = session.metadata?.wallet_top_up_id;
  if (!topUpId) return { credited: false, ignored: true };

  const [topUp] = await db
    .select()
    .from(walletTopUpsTable)
    .where(eq(walletTopUpsTable.id, topUpId))
    .limit(1);
  if (!topUp || topUp.stripeCheckoutSessionId !== session.id) {
    throw new WalletTopUpError(400, "Stripe Checkout Session does not match a known wallet top-up.");
  }

  if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    await db
      .update(walletTopUpsTable)
      .set({
        status: event.type === "checkout.session.expired" ? "cancelled" : "failed",
        failureReason: event.type,
        updatedAt: new Date(),
      })
      .where(and(eq(walletTopUpsTable.id, topUp.id), eq(walletTopUpsTable.status, "pending")));
    return { credited: false, ignored: false };
  }

  if (session.payment_status !== "paid") {
    return { credited: false, ignored: false };
  }
  if (
    session.amount_total !== topUp.amountMinor ||
    session.currency?.toUpperCase() !== topUp.currency
  ) {
    throw new WalletTopUpError(400, "Stripe Checkout amount or currency does not match the wallet top-up.");
  }

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(walletTopUpsTable)
      .where(eq(walletTopUpsTable.id, topUp.id))
      .limit(1);
    if (!current || current.status !== "pending") return { credited: false, ignored: false };

    const [entry] = await tx
      .insert(trainingValueLedgerTable)
      .values({
        tenantId: current.tenantId,
        clientUserId: current.clientUserId,
        amountMinor: current.amountMinor,
        movementType: "stripe_top_up",
        externalReference: `stripe_checkout:${session.id}`,
        reason: "Stripe Checkout wallet top-up",
      })
      .onConflictDoNothing()
      .returning();

    await tx
      .update(walletTopUpsTable)
      .set({
        status: "paid",
        stripePaymentIntentId: paymentIntentId(session),
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(walletTopUpsTable.id, current.id));

    if (entry) {
      await writeAuditLog(
        {
          tenantId: current.tenantId,
          actorType: "system",
          actorId: null,
          action: "training_value:stripe_top_up",
          targetType: "wallet_top_up",
          targetId: current.id,
          metadata: { amountMinor: current.amountMinor, currency: current.currency },
        },
        tx,
      );
    }
    return { credited: Boolean(entry), ignored: false };
  });
}

export async function listWalletTopUps(tenantId: string, limit = 50) {
  return db
    .select({
      id: walletTopUpsTable.id,
      amountMinor: walletTopUpsTable.amountMinor,
      currency: walletTopUpsTable.currency,
      status: walletTopUpsTable.status,
      stripeCheckoutSessionId: walletTopUpsTable.stripeCheckoutSessionId,
      paidAt: walletTopUpsTable.paidAt,
      createdAt: walletTopUpsTable.createdAt,
      clientUserId: walletTopUpsTable.clientUserId,
      clientFirstName: usersTable.firstName,
      clientLastName: usersTable.lastName,
      clientEmail: usersTable.email,
    })
    .from(walletTopUpsTable)
    .innerJoin(
      usersTable,
      and(
        eq(usersTable.id, walletTopUpsTable.clientUserId),
        eq(usersTable.tenantId, walletTopUpsTable.tenantId),
      ),
    )
    .where(eq(walletTopUpsTable.tenantId, tenantId))
    .orderBy(desc(walletTopUpsTable.createdAt))
    .limit(limit);
}