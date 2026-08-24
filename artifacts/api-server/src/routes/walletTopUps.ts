import express, { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { attachUser, requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { getStripeSync } from "../lib/stripeClient";
import {
  createWalletTopUpCheckout,
  getClientWalletTopUp,
  processWalletTopUpCheckout,
  WALLET_TOP_UP_AMOUNTS,
  WalletTopUpError,
} from "../lib/walletTopUps";

const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function idempotencyKey(req: Request): string | null {
  const value = req.body?.idempotencyKey ?? req.get("Idempotency-Key");
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_IDEMPOTENCY_KEY_LENGTH ? trimmed : null;
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof WalletTopUpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  logger.error({ err: error }, "Wallet top-up request failed");
  res.status(500).json({ error: "Unable to process the wallet top-up. Please try again." });
}

const topUpRouter = Router();

topUpRouter.post(
  "/commercial/wallet/top-ups/checkout",
  attachUser,
  requireAuth,
  requireRole("client"),
  async (req, res) => {
    const amountMinor = Number(req.body?.amountMinor);
    const key = idempotencyKey(req);
    const bookingSessionId =
      typeof req.body?.bookingSessionId === "string" &&
      UUID_RE.test(req.body.bookingSessionId)
        ? req.body.bookingSessionId
        : undefined;
    if (!Number.isInteger(amountMinor) || !WALLET_TOP_UP_AMOUNTS.includes(amountMinor as 5_000 | 10_000 | 20_000) || !key) {
      res.status(400).json({ error: "Choose €50, €100, or €200 and provide a request key." });
      return;
    }
    try {
      const result = await createWalletTopUpCheckout({
        tenantId: req.user!.tenantId,
        clientUserId: req.user!.id,
        amountMinor: amountMinor as 5_000 | 10_000 | 20_000,
        idempotencyKey: key,
        bookingSessionId,
      });
      res.status(result.replayed ? 200 : 201).json({
        checkoutUrl: result.checkoutUrl,
        topUp: {
          id: result.topUp.id,
          amountMinor: result.topUp.amountMinor,
          status: result.topUp.status,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

topUpRouter.get(
  "/commercial/wallet/top-ups/:id",
  attachUser,
  requireAuth,
  requireRole("client"),
  async (req, res) => {
    const topUpId = typeof req.params.id === "string" ? req.params.id : null;
    if (!topUpId || !UUID_RE.test(topUpId)) {
      res.status(400).json({ error: "Invalid wallet top-up id." });
      return;
    }
    try {
      res.json(
        await getClientWalletTopUp(
          req.user!.tenantId,
          req.user!.id,
          topUpId,
        ),
      );
    } catch (error) {
      sendError(res, error);
    }
  },
);

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.get("stripe-signature");
    if (!signature || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Missing Stripe signature or raw payload." });
      return;
    }
    try {
      const stripeSync = await getStripeSync();
      await stripeSync.processWebhook(req.body, signature);
      const event = JSON.parse(req.body.toString("utf8")) as Stripe.Event;
      const result = await processWalletTopUpCheckout(event);
      logger.info(
        { stripeEventType: event.type, stripeEventId: event.id, ...result },
        "Processed Stripe wallet top-up webhook",
      );
      res.status(200).json({ received: true });
    } catch (error) {
      if (error instanceof WalletTopUpError) {
        logger.warn({ err: error }, "Rejected Stripe wallet top-up webhook");
        res.status(error.status).json({ error: "Wallet top-up webhook rejected." });
        return;
      }
      logger.warn({ err: error }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: "Invalid Stripe webhook." });
    }
  },
);

export default topUpRouter;