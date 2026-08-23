import Stripe from "stripe";
import { buildHeaders, resolveBaseUrl } from "@replit/connectors-sdk/identity";
import { StripeSync, runMigrations } from "stripe-replit-sync";
import { logger } from "./logger";

export type StripeContext = {
  stripe: Stripe;
};

type StripeCredentials = {
  secretKey: string;
};

let stripeSyncPromise: Promise<StripeSync> | null = null;

async function getConnectorHeaders(): Promise<Record<string, string>> {
  if (process.env.REPL_IDENTITY) {
    return {
      Accept: "application/json",
      X_REPLIT_TOKEN: `repl ${process.env.REPL_IDENTITY}`,
    };
  }
  if (process.env.WEB_REPL_RENEWAL) {
    return {
      Accept: "application/json",
      X_REPLIT_TOKEN: `depl ${process.env.WEB_REPL_RENEWAL}`,
    };
  }
  return buildHeaders();
}

async function getStripeCredentials(): Promise<StripeCredentials> {
  const response = await fetch(
    `${resolveBaseUrl()}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: await getConnectorHeaders(),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Unable to load the connected Stripe account (${response.status}).`);
  }

  const data = (await response.json()) as {
    items?: Array<{ settings?: { secret_key?: string; webhook_secret?: string } }>;
  };
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret_key) {
    throw new Error("The connected Stripe account is missing its Test Mode secret key.");
  }
  if (!settings.secret_key.startsWith("sk_test_")) {
    throw new Error("This feature accepts a Stripe Test Mode connection only.");
  }
  return { secretKey: settings.secret_key };
}

export async function getStripeContext(): Promise<StripeContext> {
  const { secretKey } = await getStripeCredentials();
  return { stripe: new Stripe(secretKey) };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return (await getStripeContext()).stripe;
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSyncPromise) {
    stripeSyncPromise = (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) throw new Error("DATABASE_URL is required for Stripe webhook processing.");
      const { secretKey } = await getStripeCredentials();
      return new StripeSync({
        stripeSecretKey: secretKey,
        poolConfig: { connectionString: databaseUrl },
        logger,
      });
    })().catch((error) => {
      stripeSyncPromise = null;
      throw error;
    });
  }
  return stripeSyncPromise;
}

export async function initializeStripeSync(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() || process.env.REPLIT_DEV_DOMAIN;
  if (!databaseUrl || !domain) {
    throw new Error("DATABASE_URL and a Replit domain are required to initialize Stripe webhooks.");
  }

  await runMigrations({ databaseUrl, logger });
  const stripeSync = await getStripeSync();
  await stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
  await stripeSync.syncBackfill();
}