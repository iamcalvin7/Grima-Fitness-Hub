import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";
import {
  db,
  bookingsTable,
  trainingLocationsTable,
  trainingSessionsTable,
  trainingSessionTypesTable,
  usersTable,
  type BookingStatus,
  type TrainingSessionStatus,
} from "@workspace/db";
import {
  attachUser,
  requireAuth,
  requireCapability,
  requireRole,
} from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";

const router: IRouter = Router();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed"];
const MAX_NAME_LENGTH = 160;
const MAX_REASON_LENGTH = 500;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function hasDatabaseCode(error: unknown, code: string): boolean {
  const candidate = error as {
    code?: string;
    cause?: { code?: string; cause?: { code?: string } };
  };
  return (
    candidate?.code === code ||
    candidate?.cause?.code === code ||
    candidate?.cause?.cause?.code === code
  );
}

function stringValue(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const valueTrimmed = value.trim();
  return valueTrimmed.length > 0 && valueTrimmed.length <= maxLength
    ? valueTrimmed
    : null;
}

function uuidValue(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function sendError(req: Request, res: Response, error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  req.log.error({ err: error }, fallback);
  res.status(500).json({ error: fallback });
}

async function lockTrainingSessions(
  tx: Transaction,
  tenantId: string,
  sessionIds: string[],
): Promise<void> {
  if (sessionIds.length === 0) throw new HttpError(404, "Training session not found");
  await tx.execute(sql`
    SELECT id
    FROM training_sessions
    WHERE tenant_id = ${tenantId}
      AND id IN (${sql.join(sessionIds.map((id) => sql`${id}::uuid`), sql`, `)})
    ORDER BY id
    FOR UPDATE
  `);
}

async function activeReservationCount(
  executor: typeof db | Transaction,
  tenantId: string,
  trainingSessionId: string,
): Promise<number> {
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        eq(bookingsTable.trainingSessionId, trainingSessionId),
        inArray(bookingsTable.status, ACTIVE_BOOKING_STATUSES),
      ),
    );
  return Number(row?.count ?? 0);
}

async function activeReservationCounts(
  tenantId: string,
  sessionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (sessionIds.length === 0) return counts;
  const rows = await db
    .select({
      sessionId: bookingsTable.trainingSessionId,
      count: sql<number>`count(*)::int`,
    })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        inArray(bookingsTable.trainingSessionId, sessionIds),
        inArray(bookingsTable.status, ACTIVE_BOOKING_STATUSES),
      ),
    )
    .groupBy(bookingsTable.trainingSessionId);
  for (const row of rows) counts.set(row.sessionId, Number(row.count));
  return counts;
}

function sessionOutput(
  row: {
    id: string;
    tenantId: string;
    sessionTypeId: string;
    locationId: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number;
    status: TrainingSessionStatus;
    marcusNotes: string | null;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
    sessionTypeName: string;
    sessionTypeDescription: string | null;
    durationMinutes: number;
    locationName: string;
    locationTimezone: string;
    locationAddressDetails: string | null;
  },
  activeCount: number,
  includePrivateFields = false,
) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    sessionTypeId: row.sessionTypeId,
    locationId: row.locationId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    capacity: row.capacity,
    reservedCapacity: activeCount,
    remainingCapacity: Math.max(0, row.capacity - activeCount),
    status: row.status,
    sessionType: {
      id: row.sessionTypeId,
      name: row.sessionTypeName,
      description: row.sessionTypeDescription,
      durationMinutes: row.durationMinutes,
    },
    location: {
      id: row.locationId,
      name: row.locationName,
      timezone: row.locationTimezone,
      addressDetails: row.locationAddressDetails,
    },
    ...(includePrivateFields
      ? {
          marcusNotes: row.marcusNotes,
          createdByUserId: row.createdByUserId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      : {}),
  };
}

const sessionSelection = {
  id: trainingSessionsTable.id,
  tenantId: trainingSessionsTable.tenantId,
  sessionTypeId: trainingSessionsTable.sessionTypeId,
  locationId: trainingSessionsTable.locationId,
  startsAt: trainingSessionsTable.startsAt,
  endsAt: trainingSessionsTable.endsAt,
  capacity: trainingSessionsTable.capacity,
  status: trainingSessionsTable.status,
  marcusNotes: trainingSessionsTable.marcusNotes,
  createdByUserId: trainingSessionsTable.createdByUserId,
  createdAt: trainingSessionsTable.createdAt,
  updatedAt: trainingSessionsTable.updatedAt,
  sessionTypeName: trainingSessionTypesTable.name,
  sessionTypeDescription: trainingSessionTypesTable.description,
  durationMinutes: trainingSessionTypesTable.durationMinutes,
  locationName: trainingLocationsTable.name,
  locationTimezone: trainingLocationsTable.timezone,
  locationAddressDetails: trainingLocationsTable.addressDetails,
};

async function getSession(
  executor: typeof db | Transaction,
  tenantId: string,
  id: string,
  requireActiveReferences = false,
) {
  const [row] = await executor
    .select(sessionSelection)
    .from(trainingSessionsTable)
    .innerJoin(
      trainingSessionTypesTable,
      and(
        eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
        eq(trainingSessionTypesTable.tenantId, trainingSessionsTable.tenantId),
      ),
    )
    .innerJoin(
      trainingLocationsTable,
      and(
        eq(trainingLocationsTable.id, trainingSessionsTable.locationId),
        eq(trainingLocationsTable.tenantId, trainingSessionsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(trainingSessionsTable.id, id),
        eq(trainingSessionsTable.tenantId, tenantId),
        ...(requireActiveReferences
          ? [
              eq(trainingSessionTypesTable.isActive, true),
              eq(trainingLocationsTable.isActive, true),
            ]
          : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function getBooking(
  executor: typeof db | Transaction,
  tenantId: string,
  id: string,
) {
  const [row] = await executor
    .select({
      id: bookingsTable.id,
      tenantId: bookingsTable.tenantId,
      trainingSessionId: bookingsTable.trainingSessionId,
      clientUserId: bookingsTable.clientUserId,
      status: bookingsTable.status,
      idempotencyKey: bookingsTable.idempotencyKey,
      cancellationReason: bookingsTable.cancellationReason,
      rejectionReason: bookingsTable.rejectionReason,
      rescheduledFromBookingId: bookingsTable.rescheduledFromBookingId,
      createdAt: bookingsTable.createdAt,
      updatedAt: bookingsTable.updatedAt,
      confirmedAt: bookingsTable.confirmedAt,
      cancelledAt: bookingsTable.cancelledAt,
      attendanceAt: bookingsTable.attendanceAt,
      sessionStartsAt: trainingSessionsTable.startsAt,
      sessionEndsAt: trainingSessionsTable.endsAt,
      sessionStatus: trainingSessionsTable.status,
      sessionTypeId: trainingSessionsTable.sessionTypeId,
      sessionTypeName: trainingSessionTypesTable.name,
      locationId: trainingSessionsTable.locationId,
      locationName: trainingLocationsTable.name,
      locationTimezone: trainingLocationsTable.timezone,
      clientEmail: usersTable.email,
      clientFirstName: usersTable.firstName,
      clientLastName: usersTable.lastName,
    })
    .from(bookingsTable)
    .innerJoin(
      trainingSessionsTable,
      and(
        eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
        eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .innerJoin(
      trainingSessionTypesTable,
      and(
        eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
        eq(trainingSessionTypesTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .innerJoin(
      trainingLocationsTable,
      and(
        eq(trainingLocationsTable.id, trainingSessionsTable.locationId),
        eq(trainingLocationsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .innerJoin(
      usersTable,
      and(
        eq(usersTable.id, bookingsTable.clientUserId),
        eq(usersTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .where(
      and(eq(bookingsTable.id, id), eq(bookingsTable.tenantId, tenantId)),
    )
    .limit(1);
  return row ?? null;
}

function bookingOutput(row: Awaited<ReturnType<typeof getBooking>>) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    trainingSessionId: row.trainingSessionId,
    clientUserId: row.clientUserId,
    status: row.status,
    cancellationReason: row.cancellationReason,
    rejectionReason: row.rejectionReason,
    rescheduledFromBookingId: row.rescheduledFromBookingId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    confirmedAt: row.confirmedAt,
    cancelledAt: row.cancelledAt,
    attendanceAt: row.attendanceAt,
    session: {
      startsAt: row.sessionStartsAt,
      endsAt: row.sessionEndsAt,
      status: row.sessionStatus,
      sessionType: { id: row.sessionTypeId, name: row.sessionTypeName },
      location: {
        id: row.locationId,
        name: row.locationName,
        timezone: row.locationTimezone,
      },
    },
    client: {
      id: row.clientUserId,
      email: row.clientEmail,
      firstName: row.clientFirstName,
      lastName: row.clientLastName,
    },
  };
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

async function verifyAdminReference(
  tenantId: string,
  table: typeof trainingLocationsTable | typeof trainingSessionTypesTable,
  id: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.tenantId, tenantId), eq(table.isActive, true)))
    .limit(1);
  return Boolean(rows[0]);
}

// ---------------------------------------------------------------------------
// Client APIs
// ---------------------------------------------------------------------------

router.use(
  "/training-sessions",
  attachUser,
  requireAuth,
  requireRole("client"),
);
router.use("/bookings", attachUser, requireAuth, requireRole("client"));

router.get("/training-sessions", async (req, res) => {
  const from = req.query.from === undefined ? new Date() : dateValue(req.query.from);
  const to =
    req.query.to === undefined
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : dateValue(req.query.to);
  if (!from || !to || from >= to) {
    res.status(400).json({ error: "from and to must be valid dates with from before to" });
    return;
  }

  try {
    const rows = await db
      .select(sessionSelection)
      .from(trainingSessionsTable)
      .innerJoin(
        trainingSessionTypesTable,
        and(
          eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
          eq(trainingSessionTypesTable.tenantId, trainingSessionsTable.tenantId),
          eq(trainingSessionTypesTable.isActive, true),
        ),
      )
      .innerJoin(
        trainingLocationsTable,
        and(
          eq(trainingLocationsTable.id, trainingSessionsTable.locationId),
          eq(trainingLocationsTable.tenantId, trainingSessionsTable.tenantId),
          eq(trainingLocationsTable.isActive, true),
        ),
      )
      .where(
        and(
          eq(trainingSessionsTable.tenantId, req.user!.tenantId),
          eq(trainingSessionsTable.status, "scheduled"),
          gte(trainingSessionsTable.startsAt, from),
          lte(trainingSessionsTable.startsAt, to),
        ),
      )
      .orderBy(asc(trainingSessionsTable.startsAt));
    const counts = await activeReservationCounts(
      req.user!.tenantId,
      rows.map((row) => row.id),
    );
    res.json({
      sessions: rows.map((row) =>
        sessionOutput(row, counts.get(row.id) ?? 0),
      ),
      from,
      to,
    });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch training sessions");
  }
});

router.get("/training-sessions/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    const row = await getSession(db, req.user!.tenantId, id, true);
    if (!row || row.status !== "scheduled" || row.startsAt <= new Date()) {
      res.status(404).json({ error: "Training session not found" });
      return;
    }
    const count = await activeReservationCount(db, req.user!.tenantId, id);
    res.json({ session: sessionOutput(row, count) });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch training session");
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const rows = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .innerJoin(
        trainingSessionsTable,
        and(
          eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
          eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
        ),
      )
      .where(eq(bookingsTable.clientUserId, req.user!.id))
      .orderBy(desc(trainingSessionsTable.startsAt));
    const bookings = [];
    for (const row of rows) {
      const booking = await getBooking(db, req.user!.tenantId, row.id);
      if (booking) bookings.push(bookingOutput(booking));
    }
    res.json({ bookings });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch bookings");
  }
});

router.get("/bookings/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  try {
    const booking = await getBooking(db, req.user!.tenantId, id);
    if (!booking || booking.clientUserId !== req.user!.id) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json({ booking: bookingOutput(booking) });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch booking");
  }
});

router.post("/bookings", async (req, res) => {
  const trainingSessionId = uuidValue(req.body?.trainingSessionId);
  const idempotencyKey =
    stringValue(
      req.body?.idempotencyKey ?? req.get("Idempotency-Key"),
      200,
    );
  if (!trainingSessionId || !idempotencyKey) {
    res.status(400).json({ error: "trainingSessionId and idempotencyKey are required" });
    return;
  }

  const tenantId = req.user!.tenantId;
  const clientUserId = req.user!.id;
  const existing = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        eq(bookingsTable.clientUserId, clientUserId),
        eq(bookingsTable.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const booking = await getBooking(db, tenantId, existing[0].id);
    res.status(200).json({ booking: bookingOutput(booking), replayed: true });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      await lockTrainingSessions(tx, tenantId, [trainingSessionId]);
      const replay = await tx
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.tenantId, tenantId),
            eq(bookingsTable.clientUserId, clientUserId),
            eq(bookingsTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (replay[0]) return { id: replay[0].id, replayed: true };

      const session = await getSession(tx, tenantId, trainingSessionId, true);
      if (!session || session.status !== "scheduled" || session.startsAt <= new Date()) {
        throw new HttpError(409, "Training session is not bookable");
      }
      const reserved = await activeReservationCount(tx, tenantId, trainingSessionId);
      if (reserved >= session.capacity) {
        throw new HttpError(409, "Training session is full");
      }
      const [created] = await tx
        .insert(bookingsTable)
        .values({
          tenantId,
          trainingSessionId,
          clientUserId,
          idempotencyKey,
          status: "pending",
        })
        .returning({ id: bookingsTable.id });
      if (!created) throw new Error("Failed to create booking");
      await writeAuditLog(
        auditParams(req, "booking:create", "booking", created.id, {
          trainingSessionId,
          status: "pending",
        }),
        tx,
      );
      return { id: created.id, replayed: false };
    });
    const booking = await getBooking(db, tenantId, result.id);
    res.status(result.replayed ? 200 : 201).json({
      booking: bookingOutput(booking),
      replayed: result.replayed,
    });
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      const replay = await db
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.tenantId, tenantId),
            eq(bookingsTable.clientUserId, clientUserId),
            eq(bookingsTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (replay[0]) {
        const booking = await getBooking(db, tenantId, replay[0].id);
        res.status(200).json({ booking: bookingOutput(booking), replayed: true });
        return;
      }
      res.status(409).json({ error: "Client already has an active booking for this session" });
      return;
    }
    sendError(req, res, error, "Failed to create booking");
  }
});

router.post("/bookings/:id/cancel", async (req, res) => {
  const bookingId = uuidValue(req.params.id);
  const reason = req.body?.reason === undefined
    ? null
    : stringValue(req.body.reason, MAX_REASON_LENGTH);
  if (!bookingId || (req.body?.reason !== undefined && !reason)) {
    res.status(400).json({ error: "Invalid booking id or cancellation reason" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const booking = await getBooking(tx, req.user!.tenantId, bookingId);
      if (!booking || booking.clientUserId !== req.user!.id) {
        throw new HttpError(404, "Booking not found");
      }
      await lockTrainingSessions(tx, req.user!.tenantId, [booking.trainingSessionId]);
      const locked = await getBooking(tx, req.user!.tenantId, bookingId);
      if (!locked) throw new HttpError(404, "Booking not found");
      if (locked.status === "cancelled") {
        return { booking: locked, replayed: true };
      }
      if (
        locked.sessionStartsAt <= new Date() ||
        locked.sessionStatus !== "scheduled" ||
        !ACTIVE_BOOKING_STATUSES.includes(locked.status)
      ) {
        throw new HttpError(409, "Booking cannot be cancelled");
      }
      await tx
        .update(bookingsTable)
        .set({
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookingsTable.id, bookingId),
            eq(bookingsTable.tenantId, req.user!.tenantId),
          ),
        );
      await writeAuditLog(
        auditParams(req, "booking:cancel", "booking", bookingId, {
          reason: reason ?? undefined,
        }),
        tx,
      );
      return {
        booking: await getBooking(tx, req.user!.tenantId, bookingId),
        replayed: false,
      };
    });
    res.json({ booking: bookingOutput(result.booking), replayed: result.replayed });
  } catch (error) {
    sendError(req, res, error, "Failed to cancel booking");
  }
});

router.post("/bookings/:id/reschedule", async (req, res) => {
  const originalId = uuidValue(req.params.id);
  const replacementId = uuidValue(req.body?.replacementTrainingSessionId);
  const idempotencyKey =
    stringValue(
      req.body?.idempotencyKey ?? req.get("Idempotency-Key"),
      200,
    );
  if (!originalId || !replacementId || !idempotencyKey || originalId === replacementId) {
    res.status(400).json({
      error: "Valid replacementTrainingSessionId and idempotencyKey are required",
    });
    return;
  }

  const tenantId = req.user!.tenantId;
  const clientUserId = req.user!.id;
  const replay = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        eq(bookingsTable.clientUserId, clientUserId),
        eq(bookingsTable.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  if (replay[0]) {
    const booking = await getBooking(db, tenantId, replay[0].id);
    res.status(200).json({ booking: bookingOutput(booking), replayed: true });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const beforeLock = await getBooking(tx, tenantId, originalId);
      if (!beforeLock || beforeLock.clientUserId !== clientUserId) {
        throw new HttpError(404, "Booking not found");
      }
      await lockTrainingSessions(
        tx,
        tenantId,
        [beforeLock.trainingSessionId, replacementId].sort(),
      );
      const lockedReplay = await tx
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.tenantId, tenantId),
            eq(bookingsTable.clientUserId, clientUserId),
            eq(bookingsTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (lockedReplay[0]) return { id: lockedReplay[0].id, replayed: true };

      const original = await getBooking(tx, tenantId, originalId);
      if (!original || original.clientUserId !== clientUserId) {
        throw new HttpError(404, "Booking not found");
      }
      if (
        original.sessionStartsAt <= new Date() ||
        original.sessionStatus !== "scheduled" ||
        !ACTIVE_BOOKING_STATUSES.includes(original.status)
      ) {
        throw new HttpError(409, "Booking cannot be rescheduled");
      }
      const replacement = await getSession(tx, tenantId, replacementId, true);
      if (
        !replacement ||
        replacement.status !== "scheduled" ||
        replacement.startsAt <= new Date()
      ) {
        throw new HttpError(409, "Replacement session is not bookable");
      }
      const reserved = await activeReservationCount(tx, tenantId, replacementId);
      if (reserved >= replacement.capacity) {
        throw new HttpError(409, "Replacement session is full");
      }
      const [created] = await tx
        .insert(bookingsTable)
        .values({
          tenantId,
          trainingSessionId: replacementId,
          clientUserId,
          status: "pending",
          idempotencyKey,
          rescheduledFromBookingId: originalId,
        })
        .returning({ id: bookingsTable.id });
      if (!created) throw new Error("Failed to create replacement booking");
      await tx
        .update(bookingsTable)
        .set({ status: "rescheduled", updatedAt: new Date() })
        .where(
          and(
            eq(bookingsTable.id, originalId),
            eq(bookingsTable.tenantId, tenantId),
          ),
        );
      await writeAuditLog(
        auditParams(req, "booking:reschedule", "booking", created.id, {
          originalBookingId: originalId,
          replacementTrainingSessionId: replacementId,
        }),
        tx,
      );
      return { id: created.id, replayed: false };
    });
    const booking = await getBooking(db, tenantId, result.id);
    res.status(result.replayed ? 200 : 201).json({
      booking: bookingOutput(booking),
      replayed: result.replayed,
    });
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      const replay = await db
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.tenantId, tenantId),
            eq(bookingsTable.clientUserId, clientUserId),
            eq(bookingsTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (replay[0]) {
        const booking = await getBooking(db, tenantId, replay[0].id);
        res.status(200).json({ booking: bookingOutput(booking), replayed: true });
        return;
      }
      res.status(409).json({ error: "Client already has an active booking for this session" });
      return;
    }
    sendError(req, res, error, "Failed to reschedule booking");
  }
});

// ---------------------------------------------------------------------------
// Marcus/admin management APIs
// ---------------------------------------------------------------------------

router.use(
  "/admin",
  attachUser,
  requireAuth,
  requireCapability("bookings:manage"),
);

router.get("/admin/training-locations", async (req, res) => {
  try {
    const locations = await db
      .select()
      .from(trainingLocationsTable)
      .where(eq(trainingLocationsTable.tenantId, req.user!.tenantId))
      .orderBy(asc(trainingLocationsTable.name));
    res.json({ locations });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch training locations");
  }
});

router.post("/admin/training-locations", async (req, res) => {
  const name = stringValue(req.body?.name, MAX_NAME_LENGTH);
  const timezone = stringValue(req.body?.timezone ?? "Europe/Malta", 100);
  const addressDetails =
    req.body?.addressDetails === undefined
      ? null
      : stringValue(req.body.addressDetails, 1000);
  if (!name || !timezone || (req.body?.addressDetails !== undefined && !addressDetails)) {
    res.status(400).json({ error: "name and valid location details are required" });
    return;
  }
  try {
    const location = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(trainingLocationsTable)
        .values({
          tenantId: req.user!.tenantId,
          name,
          timezone,
          addressDetails,
        })
        .returning();
      if (!created) throw new Error("Failed to create training location");
      await writeAuditLog(
        auditParams(req, "training_location:create", "training_location", created.id, {
          name: created.name,
        }),
        tx,
      );
      return created;
    });
    res.status(201).json({ location });
  } catch (error) {
    sendError(req, res, error, "Failed to create training location");
  }
});

router.patch("/admin/training-locations/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training location id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (req.body?.name !== undefined) {
    const value = stringValue(req.body.name, MAX_NAME_LENGTH);
    if (!value) {
      res.status(400).json({ error: "Invalid name" });
      return;
    }
    updates.name = value;
  }
  if (req.body?.timezone !== undefined) {
    const value = stringValue(req.body.timezone, 100);
    if (!value) {
      res.status(400).json({ error: "Invalid timezone" });
      return;
    }
    updates.timezone = value;
  }
  if (req.body?.addressDetails !== undefined) {
    const value = req.body.addressDetails === null
      ? null
      : stringValue(req.body.addressDetails, 1000);
    if (req.body.addressDetails !== null && !value) {
      res.status(400).json({ error: "Invalid addressDetails" });
      return;
    }
    updates.addressDetails = value;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  try {
    const location = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trainingLocationsTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(trainingLocationsTable.id, id),
            eq(trainingLocationsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Training location not found");
      await writeAuditLog(
        auditParams(req, "training_location:update", "training_location", id, {
          fields: Object.keys(updates),
        }),
        tx,
      );
      return updated;
    });
    res.json({ location });
  } catch (error) {
    sendError(req, res, error, "Failed to update training location");
  }
});

router.post("/admin/training-locations/:id/deactivate", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training location id" });
    return;
  }
  try {
    const location = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trainingLocationsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(trainingLocationsTable.id, id),
            eq(trainingLocationsTable.tenantId, req.user!.tenantId),
            eq(trainingLocationsTable.isActive, true),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Active training location not found");
      await writeAuditLog(
        auditParams(req, "training_location:deactivate", "training_location", id),
        tx,
      );
      return updated;
    });
    res.json({ location });
  } catch (error) {
    sendError(req, res, error, "Failed to deactivate training location");
  }
});

router.get("/admin/session-types", async (req, res) => {
  try {
    const sessionTypes = await db
      .select()
      .from(trainingSessionTypesTable)
      .where(eq(trainingSessionTypesTable.tenantId, req.user!.tenantId))
      .orderBy(asc(trainingSessionTypesTable.name));
    res.json({ sessionTypes });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch session types");
  }
});

router.post("/admin/session-types", async (req, res) => {
  const name = stringValue(req.body?.name, MAX_NAME_LENGTH);
  const description =
    req.body?.description === undefined
      ? null
      : stringValue(req.body.description, 2000);
  const durationMinutes = Number(req.body?.durationMinutes);
  const defaultCapacity = Number(req.body?.defaultCapacity);
  if (
    !name ||
    (req.body?.description !== undefined && !description) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 24 * 60 ||
    !Number.isInteger(defaultCapacity) ||
    defaultCapacity <= 0 ||
    defaultCapacity > 10000
  ) {
    res.status(400).json({ error: "Invalid session type fields" });
    return;
  }
  try {
    const sessionType = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(trainingSessionTypesTable)
        .values({
          tenantId: req.user!.tenantId,
          name,
          description,
          durationMinutes,
          defaultCapacity,
        })
        .returning();
      if (!created) throw new Error("Failed to create session type");
      await writeAuditLog(
        auditParams(req, "training_session_type:create", "training_session_type", created.id, {
          name: created.name,
          durationMinutes: created.durationMinutes,
          defaultCapacity: created.defaultCapacity,
        }),
        tx,
      );
      return created;
    });
    res.status(201).json({ sessionType });
  } catch (error) {
    sendError(req, res, error, "Failed to create session type");
  }
});

router.patch("/admin/session-types/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid session type id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (req.body?.name !== undefined) {
    const value = stringValue(req.body.name, MAX_NAME_LENGTH);
    if (!value) {
      res.status(400).json({ error: "Invalid name" });
      return;
    }
    updates.name = value;
  }
  if (req.body?.description !== undefined) {
    const value = req.body.description === null
      ? null
      : stringValue(req.body.description, 2000);
    if (req.body.description !== null && !value) {
      res.status(400).json({ error: "Invalid description" });
      return;
    }
    updates.description = value;
  }
  for (const [key, max] of [["durationMinutes", 24 * 60], ["defaultCapacity", 10000]] as const) {
    if (req.body?.[key] !== undefined) {
      const value = Number(req.body[key]);
      if (!Number.isInteger(value) || value <= 0 || value > max) {
        res.status(400).json({ error: `Invalid ${key}` });
        return;
      }
      updates[key] = value;
    }
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  try {
    const sessionType = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trainingSessionTypesTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(trainingSessionTypesTable.id, id),
            eq(trainingSessionTypesTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Session type not found");
      await writeAuditLog(
        auditParams(req, "training_session_type:update", "training_session_type", id, {
          fields: Object.keys(updates),
        }),
        tx,
      );
      return updated;
    });
    res.json({ sessionType });
  } catch (error) {
    sendError(req, res, error, "Failed to update session type");
  }
});

router.post("/admin/session-types/:id/deactivate", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid session type id" });
    return;
  }
  try {
    const sessionType = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trainingSessionTypesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(trainingSessionTypesTable.id, id),
            eq(trainingSessionTypesTable.tenantId, req.user!.tenantId),
            eq(trainingSessionTypesTable.isActive, true),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Active session type not found");
      await writeAuditLog(
        auditParams(req, "training_session_type:deactivate", "training_session_type", id),
        tx,
      );
      return updated;
    });
    res.json({ sessionType });
  } catch (error) {
    sendError(req, res, error, "Failed to deactivate session type");
  }
});

router.get("/admin/training-sessions", async (req, res) => {
  try {
    const rows = await db
      .select(sessionSelection)
      .from(trainingSessionsTable)
      .innerJoin(
        trainingSessionTypesTable,
        and(
          eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
          eq(trainingSessionTypesTable.tenantId, trainingSessionsTable.tenantId),
        ),
      )
      .innerJoin(
        trainingLocationsTable,
        and(
          eq(trainingLocationsTable.id, trainingSessionsTable.locationId),
          eq(trainingLocationsTable.tenantId, trainingSessionsTable.tenantId),
        ),
      )
      .where(eq(trainingSessionsTable.tenantId, req.user!.tenantId))
      .orderBy(asc(trainingSessionsTable.startsAt));
    const counts = await activeReservationCounts(
      req.user!.tenantId,
      rows.map((row) => row.id),
    );
    res.json({
      sessions: rows.map((row) =>
        sessionOutput(row, counts.get(row.id) ?? 0, true),
      ),
    });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch managed sessions");
  }
});

router.get("/admin/training-sessions/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  try {
    const row = await getSession(db, req.user!.tenantId, id);
    if (!row) {
      res.status(404).json({ error: "Training session not found" });
      return;
    }
    const count = await activeReservationCount(db, req.user!.tenantId, id);
    const bookings = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.tenantId, req.user!.tenantId),
          eq(bookingsTable.trainingSessionId, id),
        ),
      )
      .orderBy(asc(bookingsTable.createdAt));
    const details = [];
    for (const booking of bookings) {
      const detail = await getBooking(db, req.user!.tenantId, booking.id);
      if (detail) details.push(bookingOutput(detail));
    }
    res.json({
      session: sessionOutput(row, count, true),
      bookings: details,
    });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch managed session");
  }
});

router.post("/admin/training-sessions", async (req, res) => {
  const sessionTypeId = uuidValue(req.body?.sessionTypeId);
  const locationId = uuidValue(req.body?.locationId);
  const startsAt = dateValue(req.body?.startsAt);
  const endsAt = dateValue(req.body?.endsAt);
  const capacity =
    req.body?.capacity === undefined ? null : Number(req.body.capacity);
  if (
    !sessionTypeId ||
    !locationId ||
    !startsAt ||
    !endsAt ||
    endsAt <= startsAt ||
    startsAt <= new Date() ||
    (capacity !== null &&
      (!Number.isInteger(capacity) || capacity <= 0 || capacity > 10000))
  ) {
    res.status(400).json({ error: "Invalid scheduled session fields" });
    return;
  }
  if (
    !(await verifyAdminReference(req.user!.tenantId, trainingSessionTypesTable, sessionTypeId)) ||
    !(await verifyAdminReference(req.user!.tenantId, trainingLocationsTable, locationId))
  ) {
    res.status(400).json({ error: "Active session type and location are required" });
    return;
  }
  try {
    const session = await db.transaction(async (tx) => {
      const [type] = await tx
        .select({ defaultCapacity: trainingSessionTypesTable.defaultCapacity })
        .from(trainingSessionTypesTable)
        .where(
          and(
            eq(trainingSessionTypesTable.id, sessionTypeId),
            eq(trainingSessionTypesTable.tenantId, req.user!.tenantId),
            eq(trainingSessionTypesTable.isActive, true),
          ),
        )
        .limit(1);
      if (!type) throw new HttpError(400, "Active session type is required");
      const [created] = await tx
        .insert(trainingSessionsTable)
        .values({
          tenantId: req.user!.tenantId,
          sessionTypeId,
          locationId,
          startsAt,
          endsAt,
          capacity: capacity ?? type.defaultCapacity,
          createdByUserId: req.user!.id,
          status: "scheduled",
        })
        .returning();
      if (!created) throw new Error("Failed to create training session");
      await writeAuditLog(
        auditParams(req, "training_session:create", "training_session", created.id, {
          sessionTypeId,
          locationId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          capacity: created.capacity,
        }),
        tx,
      );
      return created;
    });
    res.status(201).json({ session });
  } catch (error) {
    sendError(req, res, error, "Failed to create training session");
  }
});

router.patch("/admin/training-sessions/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (req.body?.startsAt !== undefined) {
    const value = dateValue(req.body.startsAt);
    if (!value) {
      res.status(400).json({ error: "Invalid startsAt" });
      return;
    }
    updates.startsAt = value;
  }
  if (req.body?.endsAt !== undefined) {
    const value = dateValue(req.body.endsAt);
    if (!value) {
      res.status(400).json({ error: "Invalid endsAt" });
      return;
    }
    updates.endsAt = value;
  }
  if (req.body?.capacity !== undefined) {
    const value = Number(req.body.capacity);
    if (!Number.isInteger(value) || value <= 0 || value > 10000) {
      res.status(400).json({ error: "Invalid capacity" });
      return;
    }
    updates.capacity = value;
  }
  if (req.body?.sessionTypeId !== undefined) {
    const value = uuidValue(req.body.sessionTypeId);
    if (!value) {
      res.status(400).json({ error: "Invalid sessionTypeId" });
      return;
    }
    updates.sessionTypeId = value;
  }
  if (req.body?.locationId !== undefined) {
    const value = uuidValue(req.body.locationId);
    if (!value) {
      res.status(400).json({ error: "Invalid locationId" });
      return;
    }
    updates.locationId = value;
  }
  if (req.body?.marcusNotes !== undefined) {
    const value = req.body.marcusNotes === null
      ? null
      : stringValue(req.body.marcusNotes, 5000);
    if (req.body.marcusNotes !== null && !value) {
      res.status(400).json({ error: "Invalid marcusNotes" });
      return;
    }
    updates.marcusNotes = value;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  try {
    const session = await db.transaction(async (tx) => {
      await lockTrainingSessions(tx, req.user!.tenantId, [id]);
      const current = await getSession(tx, req.user!.tenantId, id);
      if (!current) throw new HttpError(404, "Training session not found");
      if (current.status !== "scheduled") {
        throw new HttpError(409, "Only scheduled sessions can be updated");
      }
      const nextStartsAt = (updates.startsAt as Date | undefined) ?? current.startsAt;
      const nextEndsAt = (updates.endsAt as Date | undefined) ?? current.endsAt;
      if (nextEndsAt <= nextStartsAt) {
        throw new HttpError(400, "endsAt must be after startsAt");
      }
      if (nextStartsAt <= new Date()) {
        throw new HttpError(400, "Scheduled sessions must be in the future");
      }
      if (updates.sessionTypeId !== undefined &&
        !(await verifyAdminReference(req.user!.tenantId, trainingSessionTypesTable, updates.sessionTypeId as string))) {
        throw new HttpError(400, "Active session type is required");
      }
      if (updates.locationId !== undefined &&
        !(await verifyAdminReference(req.user!.tenantId, trainingLocationsTable, updates.locationId as string))) {
        throw new HttpError(400, "Active location is required");
      }
      const nextCapacity = (updates.capacity as number | undefined) ?? current.capacity;
      const reserved = await activeReservationCount(tx, req.user!.tenantId, id);
      if (nextCapacity < reserved) {
        throw new HttpError(409, "Capacity cannot be below active reservations");
      }
      const [updated] = await tx
        .update(trainingSessionsTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(trainingSessionsTable.id, id),
            eq(trainingSessionsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Training session not found");
      await writeAuditLog(
        auditParams(req, "training_session:update", "training_session", id, {
          fields: Object.keys(updates),
        }),
        tx,
      );
      return updated;
    });
    res.json({ session });
  } catch (error) {
    sendError(req, res, error, "Failed to update training session");
  }
});

async function transitionSession(
  req: Request,
  res: Response,
  id: string,
  nextStatus: "cancelled" | "completed",
  action: string,
) {
  try {
    const session = await db.transaction(async (tx) => {
      await lockTrainingSessions(tx, req.user!.tenantId, [id]);
      const current = await getSession(tx, req.user!.tenantId, id);
      if (!current) throw new HttpError(404, "Training session not found");
      if (current.status !== "scheduled") {
        throw new HttpError(409, "Invalid training session status transition");
      }
      if (nextStatus === "completed" && current.startsAt > new Date()) {
        throw new HttpError(409, "A future session cannot be completed");
      }
      const [updated] = await tx
        .update(trainingSessionsTable)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(
          and(
            eq(trainingSessionsTable.id, id),
            eq(trainingSessionsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Training session not found");
      await writeAuditLog(
        auditParams(req, action, "training_session", id),
        tx,
      );
      return updated;
    });
    res.json({ session });
  } catch (error) {
    sendError(req, res, error, "Failed to update training session status");
  }
}

router.post("/admin/training-sessions/:id/cancel", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  await transitionSession(req, res, id, "cancelled", "training_session:cancel");
});

router.post("/admin/training-sessions/:id/complete", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid training session id" });
    return;
  }
  await transitionSession(req, res, id, "completed", "training_session:complete");
});

router.get("/admin/bookings", async (req, res) => {
  const status = req.query.status;
  const sessionId = req.query.trainingSessionId;
  const conditions = [eq(bookingsTable.tenantId, req.user!.tenantId)];
  if (status !== undefined) {
    if (
      typeof status !== "string" ||
      !(
        [
          "pending",
          "confirmed",
          "rejected",
          "cancelled",
          "rescheduled",
          "attended",
          "no_show",
        ] as string[]
      ).includes(status)
    ) {
      res.status(400).json({ error: "Invalid booking status" });
      return;
    }
    conditions.push(eq(bookingsTable.status, status as BookingStatus));
  }
  if (sessionId !== undefined) {
    const parsed = uuidValue(sessionId);
    if (!parsed) {
      res.status(400).json({ error: "Invalid training session id" });
      return;
    }
    conditions.push(eq(bookingsTable.trainingSessionId, parsed));
  }
  try {
    const rows = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(and(...conditions))
      .orderBy(desc(bookingsTable.createdAt));
    const bookings = [];
    for (const row of rows) {
      const booking = await getBooking(db, req.user!.tenantId, row.id);
      if (booking) bookings.push(bookingOutput(booking));
    }
    res.json({ bookings });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch managed bookings");
  }
});

router.get("/admin/bookings/:id", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  try {
    const booking = await getBooking(db, req.user!.tenantId, id);
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json({ booking: bookingOutput(booking) });
  } catch (error) {
    sendError(req, res, error, "Failed to fetch managed booking");
  }
});

async function transitionBooking(
  req: Request,
  res: Response,
  id: string,
  nextStatus: "confirmed" | "rejected" | "attended" | "no_show",
  action: string,
  reason?: string | null,
) {
  try {
    const booking = await db.transaction(async (tx) => {
      const current = await getBooking(tx, req.user!.tenantId, id);
      if (!current) throw new HttpError(404, "Booking not found");
      await lockTrainingSessions(tx, req.user!.tenantId, [current.trainingSessionId]);
      const locked = await getBooking(tx, req.user!.tenantId, id);
      if (!locked) throw new HttpError(404, "Booking not found");
      const expected =
        nextStatus === "confirmed" || nextStatus === "rejected"
          ? ["pending"]
          : ["confirmed"];
      if (!expected.includes(locked.status)) {
        throw new HttpError(409, "Invalid booking status transition");
      }
      if (locked.sessionStatus !== "scheduled") {
        throw new HttpError(409, "The training session is not scheduled");
      }
      if (nextStatus === "confirmed" && locked.sessionStartsAt <= new Date()) {
        throw new HttpError(409, "A past booking cannot be confirmed");
      }
      const [updated] = await tx
        .update(bookingsTable)
        .set({
          status: nextStatus,
          rejectionReason: nextStatus === "rejected" ? reason ?? null : undefined,
          confirmedAt: nextStatus === "confirmed" ? new Date() : undefined,
          attendanceAt:
            nextStatus === "attended" || nextStatus === "no_show"
              ? new Date()
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookingsTable.id, id),
            eq(bookingsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new HttpError(404, "Booking not found");
      await writeAuditLog(
        auditParams(req, action, "booking", id, {
          ...(reason ? { reason } : {}),
          status: nextStatus,
        }),
        tx,
      );
      return await getBooking(tx, req.user!.tenantId, id);
    });
    res.json({ booking: bookingOutput(booking) });
  } catch (error) {
    sendError(req, res, error, "Failed to update booking status");
  }
}

router.post("/admin/bookings/:id/confirm", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  await transitionBooking(req, res, id, "confirmed", "booking:confirm");
});

router.post("/admin/bookings/:id/reject", async (req, res) => {
  const id = uuidValue(req.params.id);
  const reason = req.body?.reason === undefined
    ? null
    : stringValue(req.body.reason, MAX_REASON_LENGTH);
  if (!id || (req.body?.reason !== undefined && !reason)) {
    res.status(400).json({ error: "Invalid booking id or rejection reason" });
    return;
  }
  await transitionBooking(req, res, id, "rejected", "booking:reject", reason);
});

router.post("/admin/bookings/:id/attended", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  await transitionBooking(req, res, id, "attended", "booking:attended");
});

router.post("/admin/bookings/:id/no-show", async (req, res) => {
  const id = uuidValue(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }
  await transitionBooking(req, res, id, "no_show", "booking:no_show");
});

export default router;