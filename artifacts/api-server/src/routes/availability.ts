import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, eq, gte, lte, ne, sql } from "drizzle-orm";
import {
  availabilityExceptionsTable,
  availabilityOccurrencesTable,
  bookingsTable,
  db,
  recurringAvailabilityRulesTable,
  trainingLocationsTable,
  trainingSessionTypesTable,
  trainingSessionsTable,
} from "@workspace/db";
import { attachUser, requireAuth, requireCapability } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import {
  addDays,
  availabilityPreview,
  dateFromInstant,
  generateAvailability,
  GENERATION_DAYS,
  isIsoDate,
  isLocalTime,
  validateRuleTimes,
  validateTimezone,
} from "../lib/availability";

const router: IRouter = Router();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"] as const;
const MAX_REASON_LENGTH = 500;

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function uuidValue(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function stringValue(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function optionalString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return stringValue(value, maxLength);
}

function integerValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function sendError(req: Request, res: Response, error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  req.log.error({ err: error }, fallback);
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

async function activeReferences(
  tenantId: string,
  locationId: string,
  sessionTypeId: string,
) {
  const [location, type] = await Promise.all([
    db
      .select({ timezone: trainingLocationsTable.timezone })
      .from(trainingLocationsTable)
      .where(
        and(
          eq(trainingLocationsTable.tenantId, tenantId),
          eq(trainingLocationsTable.id, locationId),
          eq(trainingLocationsTable.isActive, true),
        ),
      )
      .limit(1),
    db
      .select({ id: trainingSessionTypesTable.id })
      .from(trainingSessionTypesTable)
      .where(
        and(
          eq(trainingSessionTypesTable.tenantId, tenantId),
          eq(trainingSessionTypesTable.id, sessionTypeId),
          eq(trainingSessionTypesTable.isActive, true),
        ),
      )
      .limit(1),
  ]);
  if (!location[0] || !type[0]) throw new HttpError(400, "Active location and session type are required");
  if (!validateTimezone(location[0].timezone)) {
    throw new HttpError(409, "The selected location has an invalid IANA timezone");
  }
  return location[0];
}

async function ruleOverlaps(
  tenantId: string,
  ownerUserId: string,
  weekday: number,
  startsLocalTime: string,
  endsLocalTime: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db
    .select({
      startsLocalTime: recurringAvailabilityRulesTable.startsLocalTime,
      endsLocalTime: recurringAvailabilityRulesTable.endsLocalTime,
    })
    .from(recurringAvailabilityRulesTable)
    .where(
      and(
        eq(recurringAvailabilityRulesTable.tenantId, tenantId),
        eq(recurringAvailabilityRulesTable.ownerUserId, ownerUserId),
        eq(recurringAvailabilityRulesTable.weekday, weekday),
        eq(recurringAvailabilityRulesTable.isActive, true),
        ...(excludeId ? [ne(recurringAvailabilityRulesTable.id, excludeId)] : []),
      ),
    );
  return rows.some(
    (row) => startsLocalTime < row.endsLocalTime && endsLocalTime > row.startsLocalTime,
  );
}

async function impactForRule(tenantId: string, ruleId: string) {
  const today = dateFromInstant(new Date(), "UTC");
  const rows = await db
    .select({
      occurrenceId: availabilityOccurrencesTable.id,
      sessionId: availabilityOccurrencesTable.trainingSessionId,
      localDate: availabilityOccurrencesTable.localDate,
      startsAt: availabilityOccurrencesTable.resolvedStartsAt,
      activeBookings: sql<number>`count(${bookingsTable.id})::int`,
    })
    .from(availabilityOccurrencesTable)
    .leftJoin(
      bookingsTable,
      and(
        eq(bookingsTable.tenantId, availabilityOccurrencesTable.tenantId),
        eq(bookingsTable.trainingSessionId, availabilityOccurrencesTable.trainingSessionId),
        sql`${bookingsTable.status} in ('pending', 'confirmed')`,
      ),
    )
    .where(
      and(
        eq(availabilityOccurrencesTable.tenantId, tenantId),
        eq(availabilityOccurrencesTable.availabilityRuleId, ruleId),
        gte(availabilityOccurrencesTable.localDate, today),
      ),
    )
    .groupBy(availabilityOccurrencesTable.id);
  const booked = rows.filter((row) => Number(row.activeBookings) > 0);
  return {
    totalOccurrences: rows.length,
    unbookedSessionIds: rows
      .filter((row) => row.sessionId && Number(row.activeBookings) === 0)
      .map((row) => row.sessionId!),
    booked,
  };
}

async function impactForException(
  tenantId: string,
  input: {
    availabilityRuleId: string | null;
    ownerUserId: string;
    locationId: string;
    sessionTypeId: string;
    exceptionDate: string;
    startsLocalTime: string | null;
    endsLocalTime: string | null;
  },
) {
  const rows = await db
    .select({
      occurrenceId: availabilityOccurrencesTable.id,
      sessionId: availabilityOccurrencesTable.trainingSessionId,
      localStartTime: availabilityOccurrencesTable.localStartTime,
      activeBookings: sql<number>`count(${bookingsTable.id})::int`,
    })
    .from(availabilityOccurrencesTable)
    .innerJoin(
      recurringAvailabilityRulesTable,
      and(
        eq(recurringAvailabilityRulesTable.tenantId, availabilityOccurrencesTable.tenantId),
        eq(recurringAvailabilityRulesTable.id, availabilityOccurrencesTable.availabilityRuleId),
      ),
    )
    .leftJoin(
      bookingsTable,
      and(
        eq(bookingsTable.tenantId, availabilityOccurrencesTable.tenantId),
        eq(bookingsTable.trainingSessionId, availabilityOccurrencesTable.trainingSessionId),
        sql`${bookingsTable.status} in ('pending', 'confirmed')`,
      ),
    )
    .where(
      and(
        eq(availabilityOccurrencesTable.tenantId, tenantId),
        eq(availabilityOccurrencesTable.localDate, input.exceptionDate),
        eq(recurringAvailabilityRulesTable.ownerUserId, input.ownerUserId),
        eq(recurringAvailabilityRulesTable.locationId, input.locationId),
        eq(recurringAvailabilityRulesTable.sessionTypeId, input.sessionTypeId),
        ...(input.availabilityRuleId
          ? [eq(recurringAvailabilityRulesTable.id, input.availabilityRuleId)]
          : []),
      ),
    )
    .groupBy(availabilityOccurrencesTable.id);
  const windowed = rows.filter((row) => {
    if (!input.startsLocalTime || !input.endsLocalTime) return true;
    return row.localStartTime >= input.startsLocalTime && row.localStartTime < input.endsLocalTime;
  });
  return {
    booked: windowed.filter((row) => Number(row.activeBookings) > 0),
    unbookedSessionIds: windowed
      .filter((row) => row.sessionId && Number(row.activeBookings) === 0)
      .map((row) => row.sessionId!),
  };
}

router.use("/admin/availability", attachUser, requireAuth, requireCapability("bookings:manage"));

router.get("/admin/availability/rules", async (req, res) => {
  try {
    const rules = await db
      .select({
        id: recurringAvailabilityRulesTable.id,
        ownerUserId: recurringAvailabilityRulesTable.ownerUserId,
        locationId: recurringAvailabilityRulesTable.locationId,
        sessionTypeId: recurringAvailabilityRulesTable.sessionTypeId,
        weekday: recurringAvailabilityRulesTable.weekday,
        startsLocalTime: recurringAvailabilityRulesTable.startsLocalTime,
        endsLocalTime: recurringAvailabilityRulesTable.endsLocalTime,
        slotIntervalMinutes: recurringAvailabilityRulesTable.slotIntervalMinutes,
        capacityOverride: recurringAvailabilityRulesTable.capacityOverride,
        effectiveFrom: recurringAvailabilityRulesTable.effectiveFrom,
        effectiveUntil: recurringAvailabilityRulesTable.effectiveUntil,
        isActive: recurringAvailabilityRulesTable.isActive,
        locationName: trainingLocationsTable.name,
        timezone: trainingLocationsTable.timezone,
        sessionTypeName: trainingSessionTypesTable.name,
        durationMinutes: trainingSessionTypesTable.durationMinutes,
      })
      .from(recurringAvailabilityRulesTable)
      .innerJoin(
        trainingLocationsTable,
        and(
          eq(trainingLocationsTable.tenantId, recurringAvailabilityRulesTable.tenantId),
          eq(trainingLocationsTable.id, recurringAvailabilityRulesTable.locationId),
        ),
      )
      .innerJoin(
        trainingSessionTypesTable,
        and(
          eq(trainingSessionTypesTable.tenantId, recurringAvailabilityRulesTable.tenantId),
          eq(trainingSessionTypesTable.id, recurringAvailabilityRulesTable.sessionTypeId),
        ),
      )
      .where(eq(recurringAvailabilityRulesTable.tenantId, req.user!.tenantId))
      .orderBy(asc(recurringAvailabilityRulesTable.weekday), asc(recurringAvailabilityRulesTable.startsLocalTime));
    res.json({ rules });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch availability rules");
  }
});

router.post("/admin/availability/rules", async (req, res) => {
  const locationId = uuidValue(req.body?.locationId);
  const sessionTypeId = uuidValue(req.body?.sessionTypeId);
  const weekday = integerValue(req.body?.weekday);
  const startsLocalTime = stringValue(req.body?.startsLocalTime, 5);
  const endsLocalTime = stringValue(req.body?.endsLocalTime, 5);
  const effectiveFrom = stringValue(req.body?.effectiveFrom, 10);
  const effectiveUntil =
    req.body?.effectiveUntil === undefined
      ? null
      : optionalString(req.body.effectiveUntil, 10);
  const slotIntervalMinutes =
    req.body?.slotIntervalMinutes === undefined ? null : integerValue(req.body.slotIntervalMinutes);
  const capacityOverride =
    req.body?.capacityOverride === undefined || req.body?.capacityOverride === null
      ? null
      : integerValue(req.body.capacityOverride);
  if (
    !locationId ||
    !sessionTypeId ||
    weekday === null ||
    !startsLocalTime ||
    !endsLocalTime ||
    !effectiveFrom ||
    effectiveUntil === undefined ||
    (req.body?.slotIntervalMinutes !== undefined && slotIntervalMinutes === null) ||
    (req.body?.capacityOverride !== undefined && req.body?.capacityOverride !== null && capacityOverride === null)
  ) {
    res.status(400).json({ error: "Invalid availability rule fields" });
    return;
  }
  const timeError = validateRuleTimes({
    weekday,
    startsLocalTime,
    endsLocalTime,
    slotIntervalMinutes,
    effectiveFrom,
    effectiveUntil,
  });
  if (timeError || (capacityOverride !== null && capacityOverride <= 0)) {
    res.status(400).json({ error: timeError ?? "capacityOverride must be positive" });
    return;
  }
  try {
    await activeReferences(req.user!.tenantId, locationId, sessionTypeId);
    if (
      await ruleOverlaps(
        req.user!.tenantId,
        req.user!.id,
        weekday,
        startsLocalTime,
        endsLocalTime,
      )
    ) {
      throw new HttpError(409, "This availability overlaps another active Marcus rule");
    }
    const rule = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(recurringAvailabilityRulesTable)
        .values({
          tenantId: req.user!.tenantId,
          ownerUserId: req.user!.id,
          locationId,
          sessionTypeId,
          weekday,
          startsLocalTime,
          endsLocalTime,
          slotIntervalMinutes,
          capacityOverride,
          effectiveFrom,
          effectiveUntil,
          createdByUserId: req.user!.id,
        })
        .returning();
      if (!created) throw new Error("Failed to create availability rule");
      await writeAuditLog(
        auditParams(req, "availability_rule:create", "availability_rule", created.id),
        tx,
      );
      return created;
    });
    await generateAvailability(req.user!.tenantId);
    res.status(201).json({ rule });
  } catch (error) {
    sendError(req, res, error, "Failed to create availability rule");
  }
});

router.get("/admin/availability/rules/:id/impact", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid availability rule id" });
    return;
  }
  try {
    const [rule] = await db
      .select({ id: recurringAvailabilityRulesTable.id })
      .from(recurringAvailabilityRulesTable)
      .where(
        and(
          eq(recurringAvailabilityRulesTable.id, id),
          eq(recurringAvailabilityRulesTable.tenantId, req.user!.tenantId),
        ),
      )
      .limit(1);
    if (!rule) throw new HttpError(404, "Availability rule not found");
    res.json({ impact: await impactForRule(req.user!.tenantId, id) });
  } catch (error) {
    sendError(req, res, error, "Failed to preview availability impact");
  }
});

router.patch("/admin/availability/rules/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid availability rule id" });
    return;
  }
  try {
    const [current] = await db
      .select()
      .from(recurringAvailabilityRulesTable)
      .where(
        and(
          eq(recurringAvailabilityRulesTable.id, id),
          eq(recurringAvailabilityRulesTable.tenantId, req.user!.tenantId),
        ),
      )
      .limit(1);
    if (!current) throw new HttpError(404, "Availability rule not found");
    const updates = {
      locationId: req.body?.locationId === undefined ? current.locationId : uuidValue(req.body.locationId),
      sessionTypeId:
        req.body?.sessionTypeId === undefined ? current.sessionTypeId : uuidValue(req.body.sessionTypeId),
      weekday: req.body?.weekday === undefined ? current.weekday : integerValue(req.body.weekday),
      startsLocalTime:
        req.body?.startsLocalTime === undefined
          ? current.startsLocalTime
          : stringValue(req.body.startsLocalTime, 5),
      endsLocalTime:
        req.body?.endsLocalTime === undefined
          ? current.endsLocalTime
          : stringValue(req.body.endsLocalTime, 5),
      slotIntervalMinutes:
        req.body?.slotIntervalMinutes === undefined
          ? current.slotIntervalMinutes
          : req.body.slotIntervalMinutes === null
            ? null
            : integerValue(req.body.slotIntervalMinutes),
      capacityOverride:
        req.body?.capacityOverride === undefined
          ? current.capacityOverride
          : req.body.capacityOverride === null
            ? null
            : integerValue(req.body.capacityOverride),
      effectiveFrom:
        req.body?.effectiveFrom === undefined
          ? current.effectiveFrom
          : stringValue(req.body.effectiveFrom, 10),
      effectiveUntil:
        req.body?.effectiveUntil === undefined
          ? current.effectiveUntil
          : optionalString(req.body.effectiveUntil, 10),
      isActive:
        req.body?.isActive === undefined ? current.isActive : req.body.isActive === true,
    };
    if (
      !updates.locationId ||
      !updates.sessionTypeId ||
      updates.weekday === null ||
      !updates.startsLocalTime ||
      !updates.endsLocalTime ||
      !updates.effectiveFrom ||
      updates.effectiveUntil === undefined ||
      updates.slotIntervalMinutes === null && req.body?.slotIntervalMinutes !== null && req.body?.slotIntervalMinutes !== undefined ||
      updates.capacityOverride === null && req.body?.capacityOverride !== null && req.body?.capacityOverride !== undefined
    ) {
      throw new HttpError(400, "Invalid availability rule update");
    }
    const validatedUpdates = {
      locationId: updates.locationId,
      sessionTypeId: updates.sessionTypeId,
      weekday: updates.weekday,
      startsLocalTime: updates.startsLocalTime,
      endsLocalTime: updates.endsLocalTime,
      slotIntervalMinutes: updates.slotIntervalMinutes,
      capacityOverride: updates.capacityOverride,
      effectiveFrom: updates.effectiveFrom,
      effectiveUntil: updates.effectiveUntil,
      isActive: updates.isActive,
    };
    const timeError = validateRuleTimes(validatedUpdates);
    if (
      timeError ||
      (validatedUpdates.capacityOverride !== null &&
        validatedUpdates.capacityOverride <= 0)
    ) {
      throw new HttpError(400, timeError ?? "capacityOverride must be positive");
    }
    await activeReferences(
      req.user!.tenantId,
      validatedUpdates.locationId,
      validatedUpdates.sessionTypeId,
    );
    if (
      validatedUpdates.isActive &&
      await ruleOverlaps(
        req.user!.tenantId,
        current.ownerUserId,
        validatedUpdates.weekday,
        validatedUpdates.startsLocalTime,
        validatedUpdates.endsLocalTime,
        id,
      )
    ) {
      throw new HttpError(409, "This availability overlaps another active Marcus rule");
    }
    const impact = await impactForRule(req.user!.tenantId, id);
    if (impact.booked.length > 0) {
      throw new HttpError(
        409,
        "This change affects booked sessions. Review and resolve those sessions individually before editing the rule.",
      );
    }
    if (!req.body?.confirmImpact && impact.unbookedSessionIds.length > 0) {
      res.status(409).json({ error: "Review the impact and resubmit with confirmImpact: true", impact });
      return;
    }
    const rule = await db.transaction(async (tx) => {
      if (impact.unbookedSessionIds.length > 0) {
        await tx
          .delete(availabilityOccurrencesTable)
          .where(
            and(
              eq(availabilityOccurrencesTable.tenantId, req.user!.tenantId),
              eq(availabilityOccurrencesTable.availabilityRuleId, id),
              gte(availabilityOccurrencesTable.localDate, dateFromInstant(new Date(), "UTC")),
              sql`${availabilityOccurrencesTable.trainingSessionId} is not null`,
            ),
          );
        await tx
          .delete(trainingSessionsTable)
          .where(
            and(
              eq(trainingSessionsTable.tenantId, req.user!.tenantId),
              sql`${trainingSessionsTable.id} in (${sql.join(
                impact.unbookedSessionIds.map((sessionId) => sql`${sessionId}::uuid`),
                sql`, `,
              )})`,
            ),
          );
      }
      const [updated] = await tx
        .update(recurringAvailabilityRulesTable)
        .set({ ...validatedUpdates, updatedAt: new Date() })
        .where(
          and(
            eq(recurringAvailabilityRulesTable.id, id),
            eq(recurringAvailabilityRulesTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Availability rule not found");
      await writeAuditLog(
        auditParams(req, "availability_rule:update", "availability_rule", id, {
          regeneratedUnbookedCount: impact.unbookedSessionIds.length,
        }),
        tx,
      );
      return updated;
    });
    await generateAvailability(req.user!.tenantId);
    res.json({ rule });
  } catch (error) {
    sendError(req, res, error, "Failed to update availability rule");
  }
});

router.get("/admin/availability/exceptions", async (req, res) => {
  try {
    const exceptions = await db
      .select()
      .from(availabilityExceptionsTable)
      .where(eq(availabilityExceptionsTable.tenantId, req.user!.tenantId))
      .orderBy(asc(availabilityExceptionsTable.exceptionDate));
    res.json({ exceptions });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch availability exceptions");
  }
});

router.post("/admin/availability/exceptions", async (req, res) => {
  const availabilityRuleId =
    req.body?.availabilityRuleId === undefined || req.body?.availabilityRuleId === null
      ? null
      : uuidValue(req.body.availabilityRuleId);
  const locationId = uuidValue(req.body?.locationId);
  const sessionTypeId = uuidValue(req.body?.sessionTypeId);
  const exceptionDate = stringValue(req.body?.exceptionDate, 10);
  const kind = stringValue(req.body?.kind, 20);
  const startsLocalTime = optionalString(req.body?.startsLocalTime, 5);
  const endsLocalTime = optionalString(req.body?.endsLocalTime, 5);
  const capacityOverride =
    req.body?.capacityOverride === undefined || req.body?.capacityOverride === null
      ? null
      : integerValue(req.body.capacityOverride);
  const reason = optionalString(req.body?.reason, MAX_REASON_LENGTH);
  if (
    availabilityRuleId === null && req.body?.availabilityRuleId !== undefined && req.body?.availabilityRuleId !== null ||
    !locationId ||
    !sessionTypeId ||
    !exceptionDate ||
    !isIsoDate(exceptionDate) ||
    !kind ||
    !["unavailable", "override", "additional"].includes(kind) ||
    startsLocalTime === undefined ||
    endsLocalTime === undefined ||
    reason === undefined ||
    (capacityOverride === null && req.body?.capacityOverride !== undefined && req.body?.capacityOverride !== null)
  ) {
    res.status(400).json({ error: "Invalid availability exception fields" });
    return;
  }
  if (
    (startsLocalTime && (!isLocalTime(startsLocalTime) || !endsLocalTime || !isLocalTime(endsLocalTime))) ||
    (startsLocalTime && endsLocalTime && startsLocalTime >= endsLocalTime) ||
    (kind === "additional" && (!startsLocalTime || !endsLocalTime)) ||
    (capacityOverride !== null && capacityOverride <= 0)
  ) {
    res.status(400).json({ error: "Invalid exception time window or capacity" });
    return;
  }
  try {
    await activeReferences(req.user!.tenantId, locationId, sessionTypeId);
    if (availabilityRuleId) {
      const [rule] = await db
        .select({ id: recurringAvailabilityRulesTable.id })
        .from(recurringAvailabilityRulesTable)
        .where(
          and(
            eq(recurringAvailabilityRulesTable.tenantId, req.user!.tenantId),
            eq(recurringAvailabilityRulesTable.id, availabilityRuleId),
          ),
        )
        .limit(1);
      if (!rule) throw new HttpError(404, "Availability rule not found");
    }
    const affectsMaterializedSessions = kind === "unavailable" || kind === "override";
    const impact = affectsMaterializedSessions
      ? await impactForException(req.user!.tenantId, {
          availabilityRuleId,
          ownerUserId: req.user!.id,
          locationId,
          sessionTypeId,
          exceptionDate,
          startsLocalTime,
          endsLocalTime,
        })
      : { booked: [], unbookedSessionIds: [] };
    if (impact.booked.length > 0) {
      throw new HttpError(
        409,
        "This exception affects booked sessions. Resolve those sessions individually before applying the exception.",
      );
    }
    if (!req.body?.confirmImpact && impact.unbookedSessionIds.length > 0) {
      res.status(409).json({ error: "Review the impact and resubmit with confirmImpact: true", impact });
      return;
    }
    const exception = await db.transaction(async (tx) => {
      if (impact.unbookedSessionIds.length > 0) {
        await tx
          .delete(availabilityOccurrencesTable)
          .where(
            and(
              eq(availabilityOccurrencesTable.tenantId, req.user!.tenantId),
              sql`${availabilityOccurrencesTable.trainingSessionId} in (${sql.join(
                impact.unbookedSessionIds.map((sessionId) => sql`${sessionId}::uuid`),
                sql`, `,
              )})`,
            ),
          );
        await tx
          .delete(trainingSessionsTable)
          .where(
            and(
              eq(trainingSessionsTable.tenantId, req.user!.tenantId),
              sql`${trainingSessionsTable.id} in (${sql.join(
                impact.unbookedSessionIds.map((sessionId) => sql`${sessionId}::uuid`),
                sql`, `,
              )})`,
            ),
          );
      }
      const [created] = await tx
        .insert(availabilityExceptionsTable)
        .values({
          tenantId: req.user!.tenantId,
          availabilityRuleId,
          ownerUserId: req.user!.id,
          locationId,
          sessionTypeId,
          exceptionDate,
          kind: kind as "unavailable" | "override" | "additional",
          startsLocalTime,
          endsLocalTime,
          capacityOverride,
          reason,
          createdByUserId: req.user!.id,
        })
        .returning();
      if (!created) throw new Error("Failed to create availability exception");
      await writeAuditLog(
        auditParams(req, "availability_exception:create", "availability_exception", created.id, {
          regeneratedUnbookedCount: impact.unbookedSessionIds.length,
        }),
        tx,
      );
      return created;
    });
    await generateAvailability(req.user!.tenantId);
    res.status(201).json({ exception });
  } catch (error) {
    sendError(req, res, error, "Failed to create availability exception");
  }
});

router.get("/admin/availability/preview", async (req, res) => {
  const from = typeof req.query.from === "string" && isIsoDate(req.query.from)
    ? req.query.from
    : dateFromInstant(new Date(), "UTC");
  const to = typeof req.query.to === "string" && isIsoDate(req.query.to)
    ? req.query.to
    : addDays(from, GENERATION_DAYS);
  if (to < from || to > addDays(from, GENERATION_DAYS)) {
    res.status(400).json({ error: "Preview range must be within 120 days" });
    return;
  }
  try {
    res.json({ occurrences: await availabilityPreview(req.user!.tenantId, from, to), from, to });
  } catch (error) {
    sendError(req, res, error, "Failed to preview availability");
  }
});

router.post("/admin/availability/refresh", async (req, res) => {
  try {
    const summary = await generateAvailability(req.user!.tenantId);
    await db.transaction(async (tx) => {
      await writeAuditLog(
        auditParams(req, "availability:refresh", "availability", null, summary),
        tx,
      );
    });
    res.json({ summary });
  } catch (error) {
    sendError(req, res, error, "Failed to refresh availability");
  }
});

export default router;