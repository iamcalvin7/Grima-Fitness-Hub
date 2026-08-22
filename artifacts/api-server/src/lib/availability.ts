import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  availabilityExceptionsTable,
  availabilityOccurrencesTable,
  db,
  recurringAvailabilityRulesTable,
  trainingLocationsTable,
  trainingSessionTypesTable,
  trainingSessionsTable,
  type AvailabilityException,
  type RecurringAvailabilityRule,
} from "@workspace/db";

export const GENERATION_DAYS = 120;
export const BOOKING_HORIZON_DAYS = 90;
export const MINIMUM_LEAD_MINUTES = 12 * 60;
const MINUTES_PER_DAY = 24 * 60;

export type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isLocalTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseLocalTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

export function dateFromInstant(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function weekdayForDate(date: string): number {
  const value = new Date(`${date}T12:00:00Z`).getUTCDay();
  return value === 0 ? 7 : value;
}

function localPartsForInstant(instant: Date, timezone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function offsetMinutesForInstant(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/^GMT(?:(\+|-)(\d{2}):?(\d{2})?)?$/);
  if (!match) throw new Error(`Unable to resolve timezone offset for ${timezone}`);
  if (!match[1]) return 0;
  return (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/**
 * Resolve a local wall-clock time without relying on the host machine timezone.
 * Nonexistent times return null; ambiguous times return the earlier instant.
 */
export function resolveLocalDateTime(
  date: string,
  time: string,
  timezone: string,
): Date | null {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = { year, month, day, hour, minute };
  const wallClockMs = Date.UTC(year, month - 1, day, hour, minute);
  const sampledOffsets = new Set<number>();
  for (const delta of [-2, -1, 0, 1, 2]) {
    const probe = new Date(wallClockMs + delta * 24 * 60 * 60 * 1000);
    sampledOffsets.add(offsetMinutesForInstant(probe, timezone));
  }
  const candidates = [...sampledOffsets]
    .map((offset) => new Date(wallClockMs - offset * 60 * 1000))
    .filter((candidate) => sameParts(localPartsForInstant(candidate, timezone), desired))
    .sort((left, right) => left.getTime() - right.getTime());
  return candidates[0] ?? null;
}

export function validateTimezone(timezone: unknown): timezone is string {
  if (typeof timezone !== "string" || timezone.length === 0 || timezone.length > 100) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateRuleTimes(rule: {
  weekday: number;
  startsLocalTime: string;
  endsLocalTime: string;
  slotIntervalMinutes?: number | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
}): string | null {
  if (!Number.isInteger(rule.weekday) || rule.weekday < 1 || rule.weekday > 7) {
    return "weekday must be between 1 and 7";
  }
  if (!isLocalTime(rule.startsLocalTime) || !isLocalTime(rule.endsLocalTime)) {
    return "startsLocalTime and endsLocalTime must use HH:mm";
  }
  if (parseLocalTime(rule.endsLocalTime) <= parseLocalTime(rule.startsLocalTime)) {
    return "endsLocalTime must be after startsLocalTime";
  }
  if (
    rule.slotIntervalMinutes !== undefined &&
    rule.slotIntervalMinutes !== null &&
    (!Number.isInteger(rule.slotIntervalMinutes) || rule.slotIntervalMinutes <= 0)
  ) {
    return "slotIntervalMinutes must be a positive integer";
  }
  if (!isIsoDate(rule.effectiveFrom)) return "effectiveFrom must be YYYY-MM-DD";
  if (rule.effectiveUntil && (!isIsoDate(rule.effectiveUntil) || rule.effectiveUntil < rule.effectiveFrom)) {
    return "effectiveUntil must be on or after effectiveFrom";
  }
  return null;
}

export function generateLocalSlots(
  rule: Pick<
    RecurringAvailabilityRule,
    | "weekday"
    | "startsLocalTime"
    | "endsLocalTime"
    | "slotIntervalMinutes"
    | "effectiveFrom"
    | "effectiveUntil"
  >,
  durationMinutes: number,
  fromDate: string,
  toDate: string,
): Array<{ date: string; time: string }> {
  const slots: Array<{ date: string; time: string }> = [];
  const interval = rule.slotIntervalMinutes ?? durationMinutes;
  const firstDate = rule.effectiveFrom > fromDate ? rule.effectiveFrom : fromDate;
  const lastDate =
    rule.effectiveUntil && rule.effectiveUntil < toDate ? rule.effectiveUntil : toDate;
  for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
    if (weekdayForDate(date) !== rule.weekday) continue;
    for (
      let minute = parseLocalTime(rule.startsLocalTime);
      minute + durationMinutes <= parseLocalTime(rule.endsLocalTime);
      minute += interval
    ) {
      slots.push({ date, time: `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}` });
    }
  }
  return slots;
}

function exceptionApplies(
  exception: AvailabilityException,
  rule: RecurringAvailabilityRule,
  date: string,
  time: string,
  durationMinutes: number,
): boolean {
  if (exception.exceptionDate !== date) return false;
  if (exception.availabilityRuleId && exception.availabilityRuleId !== rule.id) return false;
  if (
    exception.locationId !== rule.locationId ||
    exception.sessionTypeId !== rule.sessionTypeId ||
    exception.ownerUserId !== rule.ownerUserId
  ) {
    return false;
  }
  if (!exception.startsLocalTime || !exception.endsLocalTime) return true;
  const start = parseLocalTime(time);
  const end = start + durationMinutes;
  return (
    start < parseLocalTime(exception.endsLocalTime) &&
    end > parseLocalTime(exception.startsLocalTime)
  );
}

export async function generateAvailability(
  tenantId: string,
  fromDate = dateFromInstant(new Date(), "UTC"),
  toDate = addDays(fromDate, GENERATION_DAYS),
): Promise<{ generated: number; skipped: number; conflicts: number }> {
  const rules = await db
    .select({
      rule: recurringAvailabilityRulesTable,
      timezone: trainingLocationsTable.timezone,
      durationMinutes: trainingSessionTypesTable.durationMinutes,
      defaultCapacity: trainingSessionTypesTable.defaultCapacity,
    })
    .from(recurringAvailabilityRulesTable)
    .innerJoin(
      trainingLocationsTable,
      and(
        eq(trainingLocationsTable.tenantId, recurringAvailabilityRulesTable.tenantId),
        eq(trainingLocationsTable.id, recurringAvailabilityRulesTable.locationId),
        eq(trainingLocationsTable.isActive, true),
      ),
    )
    .innerJoin(
      trainingSessionTypesTable,
      and(
        eq(trainingSessionTypesTable.tenantId, recurringAvailabilityRulesTable.tenantId),
        eq(trainingSessionTypesTable.id, recurringAvailabilityRulesTable.sessionTypeId),
        eq(trainingSessionTypesTable.isActive, true),
      ),
    )
    .where(
      and(
        eq(recurringAvailabilityRulesTable.tenantId, tenantId),
        eq(recurringAvailabilityRulesTable.isActive, true),
      ),
    );
  const exceptions = await db
    .select()
    .from(availabilityExceptionsTable)
    .where(
      and(
        eq(availabilityExceptionsTable.tenantId, tenantId),
        gte(availabilityExceptionsTable.exceptionDate, fromDate),
        lte(availabilityExceptionsTable.exceptionDate, toDate),
      ),
    );
  let generated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const { rule, timezone, durationMinutes, defaultCapacity } of rules) {
    const slots = generateLocalSlots(rule, durationMinutes, fromDate, toDate);
    for (const slot of slots) {
      const applicable = exceptions.filter((exception) =>
        exceptionApplies(exception, rule, slot.date, slot.time, durationMinutes),
      );
      const unavailable = applicable.find((exception) => exception.kind === "unavailable");
      const additionalOnly = applicable.length > 0 && !unavailable && !slots.length;
      if (additionalOnly) continue;
      const resolution = unavailable ? "suppressed" : "generated";
      const resolvedStart = resolveLocalDateTime(slot.date, slot.time, timezone);
      if (!resolvedStart && !unavailable) {
        skipped += 1;
        await db
          .insert(availabilityOccurrencesTable)
          .values({
            tenantId,
            availabilityRuleId: rule.id,
            localDate: slot.date,
            localStartTime: slot.time,
            timezone,
            resolution: "dst_skipped",
            exceptionId: applicable[0]?.id,
          })
          .onConflictDoNothing();
        continue;
      }
      if (unavailable) {
        await db
          .insert(availabilityOccurrencesTable)
          .values({
            tenantId,
            availabilityRuleId: rule.id,
            localDate: slot.date,
            localStartTime: slot.time,
            timezone,
            resolution,
            exceptionId: unavailable.id,
          })
          .onConflictDoNothing();
        continue;
      }
      if (!resolvedStart) continue;
      const resolvedEnd = new Date(resolvedStart.getTime() + durationMinutes * 60 * 1000);
      const result = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(availabilityOccurrencesTable)
          .values({
            tenantId,
            availabilityRuleId: rule.id,
            localDate: slot.date,
            localStartTime: slot.time,
            timezone,
            resolvedStartsAt: resolvedStart,
            resolvedEndsAt: resolvedEnd,
            resolution: "generated",
            exceptionId: applicable.find((exception) => exception.kind !== "additional")?.id,
          })
          .onConflictDoNothing()
          .returning({ id: availabilityOccurrencesTable.id });
        if (!inserted[0]) return "duplicate" as const;
        const capacity =
          applicable.find((exception) => exception.kind === "override")?.capacityOverride ??
          rule.capacityOverride ??
          defaultCapacity;
        const conflict = await tx
          .select({ id: trainingSessionsTable.id })
          .from(trainingSessionsTable)
          .where(
            and(
              eq(trainingSessionsTable.tenantId, tenantId),
              eq(trainingSessionsTable.createdByUserId, rule.ownerUserId),
              lte(trainingSessionsTable.startsAt, resolvedEnd),
              gte(trainingSessionsTable.endsAt, resolvedStart),
              sql`${trainingSessionsTable.status} <> 'cancelled'`,
            ),
          )
          .limit(1);
        if (conflict[0]) return "conflict" as const;
        const [session] = await tx
          .insert(trainingSessionsTable)
          .values({
            tenantId,
            sessionTypeId: rule.sessionTypeId,
            locationId: rule.locationId,
            startsAt: resolvedStart,
            endsAt: resolvedEnd,
            capacity,
            status: "scheduled",
            createdByUserId: rule.ownerUserId,
          })
          .returning({ id: trainingSessionsTable.id });
        if (!session) throw new Error("Failed to materialize availability session");
        await tx
          .update(availabilityOccurrencesTable)
          .set({ trainingSessionId: session.id, updatedAt: new Date() })
          .where(
            and(
              eq(availabilityOccurrencesTable.id, inserted[0].id),
              eq(availabilityOccurrencesTable.tenantId, tenantId),
            ),
          );
        return "generated" as const;
      });
      if (result === "generated") generated += 1;
      if (result === "conflict") conflicts += 1;
    }
  }
  return { generated, skipped, conflicts };
}

export async function availabilityPreview(tenantId: string, fromDate: string, toDate: string) {
  const rows = await db
    .select({
      id: availabilityOccurrencesTable.id,
      ruleId: availabilityOccurrencesTable.availabilityRuleId,
      localDate: availabilityOccurrencesTable.localDate,
      localStartTime: availabilityOccurrencesTable.localStartTime,
      timezone: availabilityOccurrencesTable.timezone,
      startsAt: availabilityOccurrencesTable.resolvedStartsAt,
      endsAt: availabilityOccurrencesTable.resolvedEndsAt,
      sessionId: availabilityOccurrencesTable.trainingSessionId,
      resolution: availabilityOccurrencesTable.resolution,
      locationName: trainingLocationsTable.name,
      sessionTypeName: trainingSessionTypesTable.name,
    })
    .from(availabilityOccurrencesTable)
    .innerJoin(
      recurringAvailabilityRulesTable,
      and(
        eq(recurringAvailabilityRulesTable.tenantId, availabilityOccurrencesTable.tenantId),
        eq(recurringAvailabilityRulesTable.id, availabilityOccurrencesTable.availabilityRuleId),
      ),
    )
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
    .where(
      and(
        eq(availabilityOccurrencesTable.tenantId, tenantId),
        gte(availabilityOccurrencesTable.localDate, fromDate),
        lte(availabilityOccurrencesTable.localDate, toDate),
      ),
    )
    .orderBy(asc(availabilityOccurrencesTable.localDate), asc(availabilityOccurrencesTable.localStartTime));
  return rows;
}