import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  clientPricingAssignmentsTable,
  bookingsTable,
  db,
  pricingPlansTable,
  pricingRatesTable,
  trainingValueLedgerTable,
  usersTable,
} from "@workspace/db";
import { attachUser, requireAuth, requireCapability, requireRole } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import {
  CommercialError,
  closeSessionCommercial,
  getClassPricingSummary,
  getClientWalletActivity,
  getCommercialSummary,
  getRevenueActivity,
  getRevenueSummary,
  getSessionRevenueSummary,
  getSessionCommercialRows,
  recordNoShowDecision,
  settleSessionCommercial,
} from "../lib/commercial";
import { listWalletTopUps } from "../lib/walletTopUps";

const router: IRouter = Router();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_NAME_LENGTH = 160;
const MAX_REASON_LENGTH = 500;

function uuidValue(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function textValue(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function amountValue(value: unknown, allowNegative = false): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(amount)) return null;
  if (allowNegative ? amount === 0 : amount < 0) return null;
  return amount;
}

function sendError(res: Response, error: unknown, fallback: string): void {
  if (error instanceof CommercialError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }
  res.status(500).json({ error: fallback });
}

function auditParams(
  req: Request,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
) {
  return {
    tenantId: req.user!.tenantId,
    actorType: "user" as const,
    actorId: req.user!.id,
    action,
    targetType,
    targetId,
    metadata,
  };
}

type RateInput = { participantCount: number; amountMinor: number };

function parseRates(value: unknown): RateInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    return null;
  }
  const seen = new Set<number>();
  const rates: RateInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    const participantCount = amountValue(candidate.participantCount);
    const amountMinor = amountValue(candidate.amountMinor);
    if (
      participantCount === null ||
      participantCount <= 0 ||
      participantCount > 10000 ||
      amountMinor === null ||
      amountMinor > 10_000_000 ||
      seen.has(participantCount)
    ) {
      return null;
    }
    seen.add(participantCount);
    rates.push({ participantCount, amountMinor });
  }
  const oneToOne = rates.find((rate) => rate.participantCount === 1);
  if (!oneToOne || rates.some((rate) => rate.amountMinor > oneToOne.amountMinor)) {
    return null;
  }
  return rates.sort((left, right) => left.participantCount - right.participantCount);
}

function planOutput(
  plan: {
    id: string;
    name: string;
    kind: "default" | "tier" | "custom";
    currency: string;
    version: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  rates: RateInput[],
) {
  return { ...plan, rates };
}

// Client-facing balance and quote data.
router.get(
  "/commercial/balance",
  attachUser,
  requireAuth,
  requireRole("client"),
  async (req, res) => {
    try {
      const balance = await getCommercialSummary(
        db,
        req.user!.tenantId,
        req.user!.id,
      );
      const activity = await getClientWalletActivity(
        db,
        req.user!.tenantId,
        req.user!.id,
      );
      res.json({ balance, activity });
    } catch (error) {
      sendError(res, error, "Failed to load training balance");
    }
  },
);

router.get(
  "/commercial/wallet",
  attachUser,
  requireAuth,
  requireRole("client"),
  async (req, res) => {
    try {
      const balance = await getCommercialSummary(
        db,
        req.user!.tenantId,
        req.user!.id,
      );
      res.json({ wallet: balance });
    } catch (error) {
      sendError(res, error, "Failed to load training wallet");
    }
  },
);

router.get(
  "/commercial/wallet/activity",
  attachUser,
  requireAuth,
  requireRole("client"),
  async (req, res) => {
    try {
      const activity = await getClientWalletActivity(
        db,
        req.user!.tenantId,
        req.user!.id,
      );
      res.json({ activity });
    } catch (error) {
      sendError(res, error, "Failed to load wallet activity");
    }
  },
);

router.use(
  "/admin/commercial",
  attachUser,
  requireAuth,
  requireCapability("payments:manage"),
);

router.get("/admin/commercial/wallet-top-ups", async (req, res) => {
  try {
    res.json({ topUps: await listWalletTopUps(req.user!.tenantId) });
  } catch (error) {
    sendError(res, error, "Failed to load wallet top-ups");
  }
});

router.get("/admin/commercial/pricing-plans", async (req, res) => {
  try {
    const plans = await db
      .select()
      .from(pricingPlansTable)
      .where(eq(pricingPlansTable.tenantId, req.user!.tenantId))
      .orderBy(asc(pricingPlansTable.kind), asc(pricingPlansTable.name));
    const rates = await db
      .select({
        pricingPlanId: pricingRatesTable.pricingPlanId,
        participantCount: pricingRatesTable.participantCount,
        amountMinor: pricingRatesTable.amountMinor,
      })
      .from(pricingRatesTable)
      .where(eq(pricingRatesTable.tenantId, req.user!.tenantId))
      .orderBy(asc(pricingRatesTable.participantCount));
    const byPlan = new Map<string, RateInput[]>();
    for (const rate of rates) {
      const current = byPlan.get(rate.pricingPlanId) ?? [];
      current.push({
        participantCount: rate.participantCount,
        amountMinor: rate.amountMinor,
      });
      byPlan.set(rate.pricingPlanId, current);
    }
    res.json({
      pricingPlans: plans.map((plan) =>
        planOutput(plan, byPlan.get(plan.id) ?? []),
      ),
    });
  } catch (error) {
    sendError(res, error, "Failed to load pricing plans");
  }
});

router.post("/admin/commercial/pricing-plans", async (req, res) => {
  const name = textValue(req.body?.name, MAX_NAME_LENGTH);
  const kind =
    req.body?.kind === "default" ||
    req.body?.kind === "tier" ||
    req.body?.kind === "custom"
      ? req.body.kind
      : null;
  const rates = parseRates(req.body?.rates);
  if (!name || !kind || !rates) {
    res.status(400).json({
      error:
        "Provide a name, plan kind, and valid rates with a 1-person maximum rate.",
    });
    return;
  }
  try {
    const plan = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(pricingPlansTable)
        .values({
          tenantId: req.user!.tenantId,
          name,
          kind,
          currency: "EUR",
          createdByUserId: req.user!.id,
        })
        .returning();
      if (!created) throw new Error("Failed to create pricing plan");
      await tx.insert(pricingRatesTable).values(
        rates.map((rate) => ({
          tenantId: req.user!.tenantId,
          pricingPlanId: created.id,
          participantCount: rate.participantCount,
          amountMinor: rate.amountMinor,
        })),
      );
      await writeAuditLog(
        auditParams(req, "pricing_plan:create", "pricing_plan", created.id, {
          kind,
          version: created.version,
          rateCounts: rates.map((rate) => rate.participantCount),
        }),
        tx,
      );
      return created;
    });
    res.status(201).json({ pricingPlan: planOutput(plan, rates) });
  } catch (error) {
    sendError(res, error, "Failed to create pricing plan");
  }
});

router.patch("/admin/commercial/pricing-plans/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  const name =
    req.body?.name === undefined ? undefined : textValue(req.body.name, MAX_NAME_LENGTH);
  const isActive =
    req.body?.isActive === undefined
      ? undefined
      : typeof req.body.isActive === "boolean"
        ? req.body.isActive
        : null;
  const rates = req.body?.rates === undefined ? undefined : parseRates(req.body.rates);
  if (
    !id ||
    (req.body?.name !== undefined && !name) ||
    isActive === null ||
    (req.body?.rates !== undefined && !rates)
  ) {
    res.status(400).json({ error: "Invalid pricing plan update" });
    return;
  }
  if (name === undefined && isActive === undefined && rates === undefined) {
    res.status(400).json({ error: "No pricing plan changes supplied" });
    return;
  }
  try {
    const plan = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(pricingPlansTable)
        .where(
          and(
            eq(pricingPlansTable.id, id),
            eq(pricingPlansTable.tenantId, req.user!.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new CommercialError(404, "Pricing plan not found");
      const [updated] = await tx
        .update(pricingPlansTable)
        .set({
          ...(name === undefined ? {} : { name: name ?? undefined }),
          ...(isActive === undefined ? {} : { isActive }),
          ...(rates === undefined ? {} : { version: existing.version + 1 }),
          updatedAt: new Date(),
        })
        .where(eq(pricingPlansTable.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update pricing plan");
      if (rates) {
        await tx
          .delete(pricingRatesTable)
          .where(
            and(
              eq(pricingRatesTable.tenantId, req.user!.tenantId),
              eq(pricingRatesTable.pricingPlanId, id),
            ),
          );
        await tx.insert(pricingRatesTable).values(
          rates.map((rate) => ({
            tenantId: req.user!.tenantId,
            pricingPlanId: id,
            participantCount: rate.participantCount,
            amountMinor: rate.amountMinor,
          })),
        );
      }
      await writeAuditLog(
        auditParams(req, "pricing_plan:update", "pricing_plan", id, {
          fields: [
            ...(name === undefined ? [] : ["name"]),
            ...(isActive === undefined ? [] : ["isActive"]),
            ...(rates === undefined ? [] : ["rates"]),
          ],
          version: updated.version,
        }),
        tx,
      );
      return updated;
    });
    res.json({ pricingPlan: planOutput(plan, rates ?? []) });
  } catch (error) {
    sendError(res, error, "Failed to update pricing plan");
  }
});

router.get("/admin/commercial/clients", async (req, res) => {
  try {
    const clients = await db
      .select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        assignmentPlanId: clientPricingAssignmentsTable.pricingPlanId,
        assignmentPlanName: pricingPlansTable.name,
      })
      .from(usersTable)
      .leftJoin(
        clientPricingAssignmentsTable,
        and(
          eq(clientPricingAssignmentsTable.clientUserId, usersTable.id),
          eq(clientPricingAssignmentsTable.tenantId, usersTable.tenantId),
        ),
      )
      .leftJoin(
        pricingPlansTable,
        and(
          eq(pricingPlansTable.id, clientPricingAssignmentsTable.pricingPlanId),
          eq(pricingPlansTable.tenantId, usersTable.tenantId),
        ),
      )
      .where(
        and(
          eq(usersTable.tenantId, req.user!.tenantId),
          eq(usersTable.role, "client"),
          eq(usersTable.isActive, true),
        ),
      )
      .orderBy(asc(usersTable.firstName), asc(usersTable.lastName));
    const enriched = await Promise.all(
      clients.map(async (client) => ({
        ...client,
        balance: await getCommercialSummary(db, req.user!.tenantId, client.id),
      })),
    );
    res.json({ clients: enriched });
  } catch (error) {
    sendError(res, error, "Failed to load commercial clients");
  }
});

router.put("/admin/commercial/clients/:id/pricing", async (req, res) => {
  const clientUserId = uuidValue(req.params.id);
  const pricingPlanId = uuidValue(req.body?.pricingPlanId);
  if (!clientUserId || !pricingPlanId) {
    res.status(400).json({ error: "Valid client and pricing plan are required" });
    return;
  }
  try {
    const assignment = await db.transaction(async (tx) => {
      const [client] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, clientUserId),
            eq(usersTable.tenantId, req.user!.tenantId),
            eq(usersTable.role, "client"),
          ),
        )
        .limit(1);
      if (!client) throw new CommercialError(404, "Client not found");
      const [plan] = await tx
        .select({ id: pricingPlansTable.id, name: pricingPlansTable.name })
        .from(pricingPlansTable)
        .where(
          and(
            eq(pricingPlansTable.id, pricingPlanId),
            eq(pricingPlansTable.tenantId, req.user!.tenantId),
            eq(pricingPlansTable.isActive, true),
          ),
        )
        .limit(1);
      if (!plan) throw new CommercialError(404, "Active pricing plan not found");
      const [saved] = await tx
        .insert(clientPricingAssignmentsTable)
        .values({
          tenantId: req.user!.tenantId,
          clientUserId,
          pricingPlanId,
          assignedByUserId: req.user!.id,
        })
        .onConflictDoUpdate({
          target: [
            clientPricingAssignmentsTable.tenantId,
            clientPricingAssignmentsTable.clientUserId,
          ],
          set: {
            pricingPlanId,
            assignedByUserId: req.user!.id,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!saved) throw new Error("Failed to save client pricing assignment");
      await writeAuditLog(
        auditParams(
          req,
          "client_pricing_assignment:upsert",
          "client_pricing_assignment",
          saved.id,
          { clientUserId, pricingPlanId, pricingPlanName: plan.name },
        ),
        tx,
      );
      return saved;
    });
    res.json({ assignment });
  } catch (error) {
    sendError(res, error, "Failed to assign client pricing");
  }
});

router.post("/admin/commercial/clients/:id/value", async (req, res) => {
  const clientUserId = uuidValue(req.params.id);
  const amountMinor = amountValue(req.body?.amountMinor, true);
  const reason = textValue(req.body?.reason, MAX_REASON_LENGTH);
  const idempotencyKey = textValue(
    req.body?.idempotencyKey ?? req.get("Idempotency-Key"),
    200,
  );
  if (!clientUserId || amountMinor === null || !reason || !idempotencyKey) {
    res.status(400).json({
      error: "Provide a client, non-zero integer minor-unit amount, reason, and idempotency key.",
    });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [replayed] = await tx
        .select()
        .from(trainingValueLedgerTable)
        .where(
          and(
            eq(trainingValueLedgerTable.tenantId, req.user!.tenantId),
            eq(trainingValueLedgerTable.actorUserId, req.user!.id),
            eq(trainingValueLedgerTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (replayed) {
        if (
          replayed.clientUserId !== clientUserId ||
          replayed.amountMinor !== amountMinor ||
          replayed.reason !== reason
        ) {
          throw new CommercialError(
            409,
            "This idempotency key has already been used for a different adjustment.",
          );
        }
        return {
          entry: replayed,
          balance: await getCommercialSummary(tx, req.user!.tenantId, clientUserId),
          replayed: true,
        };
      }
      const [client] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, clientUserId),
            eq(usersTable.tenantId, req.user!.tenantId),
            eq(usersTable.role, "client"),
          ),
        )
        .limit(1);
      if (!client) throw new CommercialError(404, "Client not found");
      const [entry] = await tx
        .insert(trainingValueLedgerTable)
        .values({
          tenantId: req.user!.tenantId,
          clientUserId,
          amountMinor,
          movementType: amountMinor > 0 ? "manual_grant" : "manual_adjustment",
          actorUserId: req.user!.id,
          idempotencyKey,
          reason,
        })
        .returning();
      if (!entry) throw new Error("Failed to record training value");
      await writeAuditLog(
        auditParams(req, "training_value:manual_adjustment", "training_value_ledger", entry.id, {
          clientUserId,
          amountMinor,
          reason,
        }),
        tx,
      );
      return {
        entry,
        balance: await getCommercialSummary(
          tx,
          req.user!.tenantId,
          clientUserId,
        ),
        replayed: false,
      };
    });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) {
    sendError(res, error, "Failed to adjust training value");
  }
});

router.get("/admin/commercial/sessions/:id/pricing-summary", async (req, res) => {
  const trainingSessionId = uuidValue(req.params.id);
  if (!trainingSessionId) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    res.json({
      classPricing: await getClassPricingSummary(
        db,
        req.user!.tenantId,
        trainingSessionId,
      ),
    });
  } catch (error) {
    sendError(res, error, "Failed to load class pricing summary");
  }
});

router.get("/admin/commercial/revenue/summary", async (req, res) => {
  try {
    res.json({ revenue: await getRevenueSummary(db, req.user!.tenantId) });
  } catch (error) {
    sendError(res, error, "Failed to load revenue summary");
  }
});

router.get("/admin/commercial/revenue/activity", async (req, res) => {
  const period =
    req.query.period === "today" ||
    req.query.period === "week" ||
    req.query.period === "month"
      ? req.query.period
      : undefined;
  try {
    res.json({
      activity: await getRevenueActivity(db, req.user!.tenantId, { period }),
    });
  } catch (error) {
    sendError(res, error, "Failed to load revenue activity");
  }
});

router.get("/admin/commercial/sessions/:id/revenue", async (req, res) => {
  const trainingSessionId = uuidValue(req.params.id);
  if (!trainingSessionId) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    res.json({
      revenue: await getSessionRevenueSummary(
        db,
        req.user!.tenantId,
        trainingSessionId,
      ),
    });
  } catch (error) {
    sendError(res, error, "Failed to load session revenue");
  }
});

router.post("/admin/commercial/sessions/:id/close", async (req, res) => {
  const trainingSessionId = uuidValue(req.params.id);
  if (!trainingSessionId) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const close = await closeSessionCommercial(tx, {
        tenantId: req.user!.tenantId,
        trainingSessionId,
      });
      if (!close.replayed) {
        await writeAuditLog(
          auditParams(req, "class:manually_closed", "training_session", trainingSessionId, {
            participantCount: close.participantCount,
            source: "marcus_manual",
          }),
          tx,
        );
        for (const release of close.releases) {
          await writeAuditLog(
            auditParams(req, "commercial_hold:release", "booking", release.bookingId, {
              participantCount: close.participantCount,
              releasedAmountMinor: release.releasedAmountMinor,
              source: "marcus_manual",
            }),
            tx,
          );
        }
      }
      return close;
    });
    res.status(result.replayed ? 200 : 201).json({ classClose: result });
  } catch (error) {
    sendError(res, error, "Failed to close class pricing");
  }
});

router.get("/admin/commercial/sessions/:id/settlement-preview", async (req, res) => {
  const trainingSessionId = uuidValue(req.params.id);
  if (!trainingSessionId) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    const rows = await getSessionCommercialRows(
      db,
      req.user!.tenantId,
      trainingSessionId,
    );
    const classPricing = await getClassPricingSummary(
      db,
      req.user!.tenantId,
      trainingSessionId,
    );
    const attendanceCount = rows.filter(
      (row) => row.bookingStatus === "attended",
    ).length;
    const preview = rows
      .filter(
        (row) =>
          row.bookingStatus === "attended" || row.bookingStatus === "no_show",
      )
      .map((row) => {
        const finalChargeAmountMinor =
          row.settlementId
            ? row.finalChargeAmountMinor
            : row.bookingStatus === "attended"
              ? row.lockedChargeAmountMinor
              : row.noShowChargeAmountMinor;
        const heldAmountMinor = row.reservedAmountMinor;
        return {
          bookingId: row.bookingId,
          clientName: `${row.clientFirstName} ${row.clientLastName}`,
          outcome: row.bookingStatus,
          heldAmountMinor,
          finalChargeAmountMinor,
          releasedAmountMinor:
            heldAmountMinor !== null && finalChargeAmountMinor !== null
              ? heldAmountMinor - finalChargeAmountMinor
              : null,
          noShowDecisionRequired:
            row.bookingStatus === "no_show" && !row.noShowDecisionId,
          settled: Boolean(row.settlementId),
        };
      });
    const unresolvedCount = rows.filter(
      (row) => row.bookingStatus === "pending" || row.bookingStatus === "confirmed",
    ).length;
    res.json({
      attendanceCount,
      classPricing,
      unresolvedCount,
      canSettle:
        classPricing.state === "closed" &&
        unresolvedCount === 0 &&
        preview.length > 0 &&
        preview.every(
          (row) =>
            !row.noShowDecisionRequired &&
            row.finalChargeAmountMinor !== null &&
            row.heldAmountMinor !== null,
        ),
      rows: preview,
    });
  } catch (error) {
    sendError(res, error, "Failed to load settlement preview");
  }
});

router.post("/admin/commercial/bookings/:id/no-show-decision", async (req, res) => {
  const bookingId = uuidValue(req.params.id);
  const waived = req.body?.waived === true;
  const selectedChargeAmountMinor = waived
    ? 0
    : amountValue(req.body?.selectedChargeAmountMinor);
  const note =
    req.body?.note === undefined || req.body?.note === null
      ? null
      : textValue(req.body.note, MAX_REASON_LENGTH);
  if (
    !bookingId ||
    selectedChargeAmountMinor === null ||
    (req.body?.note !== undefined && req.body?.note !== null && !note)
  ) {
    res.status(400).json({ error: "Invalid no-show decision" });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({ status: bookingsTable.status })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.id, bookingId),
            eq(bookingsTable.tenantId, req.user!.tenantId),
          ),
        )
        .limit(1);
      if (!booking) throw new CommercialError(404, "Booking not found");
      if (booking.status !== "no_show") {
        throw new CommercialError(409, "Mark this booking as no-show first.");
      }
      const decision = await recordNoShowDecision(tx, {
        tenantId: req.user!.tenantId,
        bookingId,
        actorUserId: req.user!.id,
        selectedChargeAmountMinor,
        waived,
        note,
      });
      if (!decision.replayed) {
        await writeAuditLog(
          auditParams(
            req,
            "booking_no_show:financial_decision",
            "booking",
            bookingId,
            {
              heldAmountMinor: decision.decision.heldAmountMinor,
              selectedChargeAmountMinor:
                decision.decision.selectedChargeAmountMinor,
              releasedAmountMinor: decision.decision.releasedAmountMinor,
              waived,
              ...(note ? { note } : {}),
            },
          ),
          tx,
        );
      }
      return decision;
    });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) {
    sendError(res, error, "Failed to record no-show decision");
  }
});

router.post("/admin/commercial/sessions/:id/settle", async (req, res) => {
  const trainingSessionId = uuidValue(req.params.id);
  if (!trainingSessionId) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const settlement = await settleSessionCommercial(tx, {
        tenantId: req.user!.tenantId,
        trainingSessionId,
        actorUserId: req.user!.id,
      });
      if (!settlement.replayed) {
        await writeAuditLog(
          auditParams(req, "training_session:settle", "training_session", trainingSessionId, {
            bookings: settlement.rows.map((row) => row.bookingId),
          }),
          tx,
        );
      }
      return settlement;
    });
    res.json({ settlement: result });
  } catch (error) {
    sendError(res, error, "Failed to settle session");
  }
});

export default router;