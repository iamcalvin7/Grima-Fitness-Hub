import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import {
  db,
  trainingValueLedgerTable,
  walletTopUpsTable,
} from "@workspace/db";
import {
  getClientWalletActivity,
  getCommercialSummary,
  getRevenueSummary,
} from "../../lib/commercial";
import { processWalletTopUpCheckout } from "../../lib/walletTopUps";
import {
  createTenant,
  createUser,
  type Tenant,
  type User,
} from "./harness";

type WalletTopUp = typeof walletTopUpsTable.$inferSelect;

const paymentEventTypes = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;

type PaymentEventType = (typeof paymentEventTypes)[number];

function checkoutEvent(
  topUp: WalletTopUp,
  type: PaymentEventType,
  options: {
    amountMinor?: number;
    currency?: string;
    metadata?: Record<string, string>;
  } = {},
): Stripe.Event {
  const paid =
    type === "checkout.session.completed" ||
    type === "checkout.session.async_payment_succeeded";
  return {
    id: `evt_wallet_${topUp.id}_${type.replaceAll(".", "_")}`,
    object: "event",
    type,
    data: {
      object: {
        id: topUp.stripeCheckoutSessionId,
        object: "checkout.session",
        metadata: {
          wallet_top_up_id: topUp.id,
          tenant_id: "tampered-tenant",
          client_user_id: "tampered-client",
          ...options.metadata,
        },
        payment_status: paid ? "paid" : "unpaid",
        amount_total: options.amountMinor ?? topUp.amountMinor,
        currency: options.currency ?? topUp.currency.toLowerCase(),
        payment_intent: `pi_wallet_${topUp.id}`,
      },
    },
  } as unknown as Stripe.Event;
}

describe("Stripe Test Mode wallet top-up safety", () => {
  let tenant: Tenant;
  let clientA: User;
  let clientB: User;

  async function createPendingTopUp(
    client: User,
    suffix: string,
    amountMinor = 5_000,
  ): Promise<WalletTopUp> {
    const [topUp] = await db
      .insert(walletTopUpsTable)
      .values({
        tenantId: tenant.id,
        clientUserId: client.id,
        amountMinor,
        status: "pending",
        clientIdempotencyKey: `wallet-test-${suffix}`,
        stripeCheckoutSessionId: `cs_test_wallet_${suffix}`,
      })
      .returning();
    if (!topUp) throw new Error("Failed to create wallet top-up fixture");
    return topUp;
  }

  async function ledgerFor(topUp: WalletTopUp) {
    return db
      .select()
      .from(trainingValueLedgerTable)
      .where(
        and(
          eq(trainingValueLedgerTable.tenantId, tenant.id),
          eq(
            trainingValueLedgerTable.externalReference,
            `stripe_checkout:${topUp.stripeCheckoutSessionId}`,
          ),
        ),
      );
  }

  beforeAll(async () => {
    tenant = await createTenant({
      slug: `wallet-payments-${crypto.randomUUID().slice(0, 8)}`,
      name: "Wallet payment safety",
    });
    clientA = await createUser(tenant.id, { role: "client" });
    clientB = await createUser(tenant.id, { role: "client" });
  });

  it("credits a successful €50 payment exactly once, records activity, and leaves revenue unchanged", async () => {
    const topUp = await createPendingTopUp(clientA, "success");
    const revenueBefore = await getRevenueSummary(db, tenant.id);

    const first = await processWalletTopUpCheckout(
      checkoutEvent(topUp, "checkout.session.completed"),
    );
    const [saved] = await db
      .select()
      .from(walletTopUpsTable)
      .where(eq(walletTopUpsTable.id, topUp.id));
    const ledger = await ledgerFor(topUp);
    const summary = await getCommercialSummary(db, tenant.id, clientA.id);
    const activity = await getClientWalletActivity(db, tenant.id, clientA.id);
    const revenueAfter = await getRevenueSummary(db, tenant.id);

    expect(first).toEqual({ credited: true, ignored: false });
    expect(saved).toMatchObject({
      tenantId: tenant.id,
      clientUserId: clientA.id,
      amountMinor: 5_000,
      currency: "EUR",
      status: "paid",
      stripePaymentIntentId: `pi_wallet_${topUp.id}`,
    });
    expect(saved?.paidAt).toBeInstanceOf(Date);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      clientUserId: clientA.id,
      amountMinor: 5_000,
      movementType: "stripe_top_up",
      externalReference: `stripe_checkout:${topUp.stripeCheckoutSessionId}`,
    });
    expect(summary.totalValueMinor).toBe(5_000);
    expect(activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "stripe_top_up",
          description: "Wallet top-up by card",
          amountMinor: 5_000,
        }),
      ]),
    );
    expect(revenueAfter).toEqual(revenueBefore);
  });

  it("ignores a duplicate successful event without adding a second ledger movement", async () => {
    const topUp = await createPendingTopUp(clientA, "duplicate");
    const event = checkoutEvent(topUp, "checkout.session.completed");

    const first = await processWalletTopUpCheckout(event);
    const second = await processWalletTopUpCheckout(event);

    expect(first.credited).toBe(true);
    expect(second).toEqual({ credited: false, ignored: false });
    expect(await ledgerFor(topUp)).toHaveLength(1);
  });

  it("keeps simultaneous successful and failed webhook delivery financially consistent", async () => {
    const topUp = await createPendingTopUp(clientA, "concurrent-terminal");

    await Promise.all([
      processWalletTopUpCheckout(
        checkoutEvent(topUp, "checkout.session.completed"),
      ),
      processWalletTopUpCheckout(
        checkoutEvent(topUp, "checkout.session.async_payment_failed"),
      ),
    ]);

    const [saved] = await db
      .select()
      .from(walletTopUpsTable)
      .where(eq(walletTopUpsTable.id, topUp.id));
    const ledger = await ledgerFor(topUp);

    expect(saved?.status).toMatch(/^(paid|failed)$/);
    expect(ledger).toHaveLength(saved?.status === "paid" ? 1 : 0);
  });

  it("marks a failed payment terminally without crediting the wallet", async () => {
    const topUp = await createPendingTopUp(clientA, "failed");

    const result = await processWalletTopUpCheckout(
      checkoutEvent(topUp, "checkout.session.async_payment_failed"),
    );
    const [saved] = await db
      .select()
      .from(walletTopUpsTable)
      .where(eq(walletTopUpsTable.id, topUp.id));

    expect(result).toEqual({ credited: false, ignored: false });
    expect(saved).toMatchObject({
      status: "failed",
      failureReason: "checkout.session.async_payment_failed",
    });
    expect(await ledgerFor(topUp)).toHaveLength(0);
  });

  it("marks an expired Checkout terminally without crediting the wallet", async () => {
    const topUp = await createPendingTopUp(clientA, "expired");

    await processWalletTopUpCheckout(
      checkoutEvent(topUp, "checkout.session.expired"),
    );
    const [saved] = await db
      .select()
      .from(walletTopUpsTable)
      .where(eq(walletTopUpsTable.id, topUp.id));

    expect(saved).toMatchObject({
      status: "cancelled",
      failureReason: "checkout.session.expired",
    });
    expect(await ledgerFor(topUp)).toHaveLength(0);
  });

  it.each([
    ["checkout.session.async_payment_failed", "failed"],
    ["checkout.session.expired", "cancelled"],
  ] as const)(
    "never credits a %s top-up after a terminal state receives a late paid event",
    async (terminalEvent, terminalStatus) => {
      const topUp = await createPendingTopUp(clientA, `late-${terminalStatus}`);

      await processWalletTopUpCheckout(checkoutEvent(topUp, terminalEvent));
      const lateResult = await processWalletTopUpCheckout(
        checkoutEvent(topUp, "checkout.session.completed"),
      );
      const [saved] = await db
        .select()
        .from(walletTopUpsTable)
        .where(eq(walletTopUpsTable.id, topUp.id));

      expect(lateResult).toEqual({ credited: false, ignored: false });
      expect(saved?.status).toBe(terminalStatus);
      expect(await ledgerFor(topUp)).toHaveLength(0);
    },
  );

  it("credits only the server-authoritative client record despite tampered event metadata", async () => {
    const topUp = await createPendingTopUp(clientA, "isolation");

    await processWalletTopUpCheckout(
      checkoutEvent(topUp, "checkout.session.completed", {
        metadata: {
          wallet_top_up_id: topUp.id,
          tenant_id: "another-tenant",
          client_user_id: clientB.id,
        },
      }),
    );

    const clientASummary = await getCommercialSummary(db, tenant.id, clientA.id);
    const clientBSummary = await getCommercialSummary(db, tenant.id, clientB.id);
    const ledger = await ledgerFor(topUp);

    expect(clientASummary.totalValueMinor).toBeGreaterThanOrEqual(5_000);
    expect(clientBSummary.totalValueMinor).toBe(0);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.clientUserId).toBe(clientA.id);
  });
});