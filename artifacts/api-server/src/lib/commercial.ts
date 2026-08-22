import {
  and,
  asc,
  eq,
  sql,
} from "drizzle-orm";
import {
  bookingCommercialsTable,
  bookingsTable,
  clientPricingAssignmentsTable,
  commercialClassLocksTable,
  commercialNoShowDecisionsTable,
  commercialSettlementsTable,
  db,
  pricingPlansTable,
  pricingRatesTable,
  trainingSessionsTable,
  trainingValueLedgerTable,
  usersTable,
  type PricingRateSnapshot,
} from "@workspace/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

export class CommercialError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export type CommercialSummary = {
  currency: "EUR";
  totalValueMinor: number;
  heldValueMinor: number;
  availableValueMinor: number;
  pricing: {
    planId: string;
    planName: string;
    planVersion: number;
    maximumHoldAmountMinor: number;
    rateTable: PricingRateSnapshot;
  } | null;
};

export type ResolvedPricing = NonNullable<CommercialSummary["pricing"]>;

function numericValue(value: unknown): number {
  return Number(value ?? 0);
}

function asRateTable(
  rows: Array<{ participantCount: number; amountMinor: number }>,
): PricingRateSnapshot {
  return Object.fromEntries(
    rows.map((row) => [String(row.participantCount), row.amountMinor]),
  );
}

async function lockClient(
  tx: Transaction,
  tenantId: string,
  clientUserId: string,
): Promise<void> {
  const result = await tx.execute(
    sql`SELECT id FROM users WHERE tenant_id = ${tenantId} AND id = ${clientUserId} FOR UPDATE`,
  );
  if (result.rows.length === 0) {
    throw new CommercialError(404, "Client not found");
  }
}

export async function resolveClientPricing(
  executor: Executor,
  tenantId: string,
  clientUserId: string,
): Promise<ResolvedPricing | null> {
  const [assigned] = await executor
    .select({
      id: pricingPlansTable.id,
      name: pricingPlansTable.name,
      version: pricingPlansTable.version,
    })
    .from(clientPricingAssignmentsTable)
    .innerJoin(
      pricingPlansTable,
      and(
        eq(pricingPlansTable.id, clientPricingAssignmentsTable.pricingPlanId),
        eq(pricingPlansTable.tenantId, clientPricingAssignmentsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(clientPricingAssignmentsTable.tenantId, tenantId),
        eq(clientPricingAssignmentsTable.clientUserId, clientUserId),
        eq(pricingPlansTable.isActive, true),
      ),
    )
    .limit(1);

  const [defaultPlan] = assigned
    ? []
    : await executor
        .select({
          id: pricingPlansTable.id,
          name: pricingPlansTable.name,
          version: pricingPlansTable.version,
        })
        .from(pricingPlansTable)
        .where(
          and(
            eq(pricingPlansTable.tenantId, tenantId),
            eq(pricingPlansTable.kind, "default"),
            eq(pricingPlansTable.isActive, true),
          ),
        )
        .limit(1);
  const plan = assigned ?? defaultPlan;
  if (!plan) return null;

  const rates = await executor
    .select({
      participantCount: pricingRatesTable.participantCount,
      amountMinor: pricingRatesTable.amountMinor,
    })
    .from(pricingRatesTable)
    .where(
      and(
        eq(pricingRatesTable.tenantId, tenantId),
        eq(pricingRatesTable.pricingPlanId, plan.id),
      ),
    )
    .orderBy(asc(pricingRatesTable.participantCount));
  const rateTable = asRateTable(rates);
  const maximumHoldAmountMinor = rateTable["1"];
  if (
    !Number.isInteger(maximumHoldAmountMinor) ||
    maximumHoldAmountMinor < 0
  ) {
    throw new CommercialError(
      409,
      "Your training pricing is not ready for booking yet",
    );
  }
  return {
    planId: plan.id,
    planName: plan.name,
    planVersion: plan.version,
    maximumHoldAmountMinor,
    rateTable,
  };
}

export async function getCommercialSummary(
  executor: Executor,
  tenantId: string,
  clientUserId: string,
): Promise<CommercialSummary> {
  const [ledger] = await executor
    .select({
      total: sql<number>`coalesce(sum(${trainingValueLedgerTable.amountMinor}), 0)::int`,
    })
    .from(trainingValueLedgerTable)
    .where(
      and(
        eq(trainingValueLedgerTable.tenantId, tenantId),
        eq(trainingValueLedgerTable.clientUserId, clientUserId),
      ),
    );
  const [holds] = await executor
    .select({
      total: sql<number>`coalesce(sum(${bookingCommercialsTable.heldAmountMinor}), 0)::int`,
    })
    .from(bookingCommercialsTable)
    .where(
      and(
        eq(bookingCommercialsTable.tenantId, tenantId),
        eq(bookingCommercialsTable.clientUserId, clientUserId),
        eq(bookingCommercialsTable.holdStatus, "active"),
      ),
    );
  const totalValueMinor = numericValue(ledger?.total);
  const heldValueMinor = numericValue(holds?.total);
  const pricing = await resolveClientPricing(executor, tenantId, clientUserId);
  return {
    currency: "EUR",
    totalValueMinor,
    heldValueMinor,
    availableValueMinor: totalValueMinor - heldValueMinor,
    pricing,
  };
}

export async function createBookingCommercial(
  tx: Transaction,
  input: {
    tenantId: string;
    bookingId: string;
    clientUserId: string;
  },
): Promise<ResolvedPricing> {
  await lockClient(tx, input.tenantId, input.clientUserId);
  const summary = await getCommercialSummary(
    tx,
    input.tenantId,
    input.clientUserId,
  );
  const pricing = summary.pricing;
  if (!pricing) {
    throw new CommercialError(
      409,
      "Training pricing is not available yet. Please contact Marcus.",
    );
  }
  if (summary.availableValueMinor < pricing.maximumHoldAmountMinor) {
    throw new CommercialError(
      409,
      "Insufficient training balance is available for this booking.",
      {
        availableValueMinor: summary.availableValueMinor,
        requiredHoldAmountMinor: pricing.maximumHoldAmountMinor,
      },
    );
  }
  await tx.insert(bookingCommercialsTable).values({
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    clientUserId: input.clientUserId,
    pricingPlanId: pricing.planId,
    pricingPlanName: pricing.planName,
    pricingPlanVersion: pricing.planVersion,
    pricingRule: "class_close_confirmed_count",
    currency: "EUR",
    rateTable: pricing.rateTable,
    maximumHeldAmountMinor: pricing.maximumHoldAmountMinor,
    heldAmountMinor: pricing.maximumHoldAmountMinor,
    holdStatus: "active",
  });
  return pricing;
}

export async function releaseBookingHold(
  tx: Transaction,
  input: {
    tenantId: string;
    bookingId: string;
    reason: string;
  },
): Promise<number | null> {
  const [commercial] = await tx
    .select()
    .from(bookingCommercialsTable)
    .where(
      and(
        eq(bookingCommercialsTable.tenantId, input.tenantId),
        eq(bookingCommercialsTable.bookingId, input.bookingId),
      ),
    )
    .limit(1);
  if (!commercial) return null;
  await lockClient(tx, input.tenantId, commercial.clientUserId);
  if (commercial.holdStatus !== "active") {
    return commercial.heldAmountMinor;
  }
  await tx
    .update(bookingCommercialsTable)
    .set({
      holdStatus: "released",
      holdReleasedAt: new Date(),
      holdReleaseReason: input.reason,
      updatedAt: new Date(),
    })
    .where(eq(bookingCommercialsTable.id, commercial.id));
  return commercial.heldAmountMinor;
}

export async function transferBookingCommercial(
  tx: Transaction,
  input: {
    tenantId: string;
    originalBookingId: string;
    replacementBookingId: string;
  },
): Promise<number | null> {
  const [commercial] = await tx
    .select()
    .from(bookingCommercialsTable)
    .where(
      and(
        eq(bookingCommercialsTable.tenantId, input.tenantId),
        eq(bookingCommercialsTable.bookingId, input.originalBookingId),
      ),
    )
    .limit(1);
  if (!commercial) return null;
  await lockClient(tx, input.tenantId, commercial.clientUserId);
  const [replacement] = await tx
    .select({ id: bookingCommercialsTable.id })
    .from(bookingCommercialsTable)
    .where(
      and(
        eq(bookingCommercialsTable.tenantId, input.tenantId),
        eq(bookingCommercialsTable.bookingId, input.replacementBookingId),
      ),
    )
    .limit(1);
  if (replacement) {
    throw new CommercialError(409, "Replacement booking already has commercial pricing.");
  }
  await tx
    .update(bookingCommercialsTable)
    .set({
      holdStatus: "released",
      holdReleasedAt: new Date(),
      holdReleaseReason: "rescheduled_transfer",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bookingCommercialsTable.id, commercial.id),
        eq(bookingCommercialsTable.tenantId, input.tenantId),
      ),
    );
  const replacementPricing = await createBookingCommercial(tx, {
    tenantId: input.tenantId,
    bookingId: input.replacementBookingId,
    clientUserId: commercial.clientUserId,
  });
  return replacementPricing.maximumHoldAmountMinor;
}

export type ClassCloseReason = "full" | "marcus_manual";

export async function closeClassCommercial(
  tx: Transaction,
  input: {
    tenantId: string;
    trainingSessionId: string;
    reason: ClassCloseReason;
    actorUserId: string | null;
  },
) {
  const lockedSession = await tx.execute(
    sql`SELECT id, status, starts_at, capacity
        FROM training_sessions
        WHERE tenant_id = ${input.tenantId} AND id = ${input.trainingSessionId}
        FOR UPDATE`,
  );
  const session = lockedSession.rows[0] as
    | { id: string; status: string; starts_at: Date | string; capacity: number }
    | undefined;
  if (!session) throw new CommercialError(404, "Training session not found");
  if (session.status !== "scheduled") {
    throw new CommercialError(409, "Only scheduled sessions can be closed for pricing.");
  }
  if (
    input.reason === "marcus_manual" &&
    new Date(session.starts_at).getTime() <= Date.now()
  ) {
    throw new CommercialError(409, "A class can only be closed before it starts.");
  }

  const [existing] = await tx
    .select()
    .from(commercialClassLocksTable)
    .where(
      and(
        eq(commercialClassLocksTable.tenantId, input.tenantId),
        eq(commercialClassLocksTable.trainingSessionId, input.trainingSessionId),
      ),
    )
    .limit(1);
  if (existing) return { lock: existing, participants: [], replayed: true };

  const confirmed = await tx
    .select({
      bookingId: bookingsTable.id,
      clientUserId: bookingsTable.clientUserId,
      commercialId: bookingCommercialsTable.id,
      rateTable: bookingCommercialsTable.rateTable,
      maximumHeldAmountMinor: bookingCommercialsTable.maximumHeldAmountMinor,
      heldAmountMinor: bookingCommercialsTable.heldAmountMinor,
      holdStatus: bookingCommercialsTable.holdStatus,
    })
    .from(bookingsTable)
    .innerJoin(
      bookingCommercialsTable,
      and(
        eq(bookingCommercialsTable.tenantId, bookingsTable.tenantId),
        eq(bookingCommercialsTable.bookingId, bookingsTable.id),
      ),
    )
    .where(
      and(
        eq(bookingsTable.tenantId, input.tenantId),
        eq(bookingsTable.trainingSessionId, input.trainingSessionId),
        eq(bookingsTable.status, "confirmed"),
      ),
    )
    .orderBy(asc(bookingsTable.createdAt));
  if (confirmed.length === 0) {
    throw new CommercialError(409, "A class needs at least one confirmed participant to close.");
  }
  if (input.reason === "full" && confirmed.length < Number(session.capacity)) {
    throw new CommercialError(409, "The class has not reached capacity.");
  }

  const participantCount = confirmed.length;
  const participants = confirmed.map((participant) => {
    const lockedAmountMinor = participant.rateTable[String(participantCount)];
    if (
      participant.holdStatus !== "active" ||
      !Number.isInteger(lockedAmountMinor) ||
      lockedAmountMinor < 0 ||
      lockedAmountMinor > participant.maximumHeldAmountMinor
    ) {
      throw new CommercialError(
        409,
        "Every confirmed participant needs an active rate snapshot for this class size.",
      );
    }
    return {
      ...participant,
      lockedAmountMinor,
      releasedAmountMinor: participant.heldAmountMinor - lockedAmountMinor,
    };
  });

  for (const participant of [...participants].sort((a, b) =>
    a.clientUserId.localeCompare(b.clientUserId),
  )) {
    await lockClient(tx, input.tenantId, participant.clientUserId);
  }
  const [lock] = await tx
    .insert(commercialClassLocksTable)
    .values({
      tenantId: input.tenantId,
      trainingSessionId: input.trainingSessionId,
      closeReason: input.reason,
      closedByUserId: input.actorUserId,
      confirmedParticipantCount: participantCount,
      pricingRule: "class_close_confirmed_count",
    })
    .returning();
  if (!lock) throw new Error("Failed to lock class pricing");

  for (const participant of participants) {
    await tx
      .update(bookingCommercialsTable)
      .set({
        heldAmountMinor: participant.lockedAmountMinor,
        classLockId: lock.id,
        lockedParticipantCount: participantCount,
        lockedAmountMinor: participant.lockedAmountMinor,
        lockedAt: lock.closedAt,
        pricingRule: "class_close_confirmed_count",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingCommercialsTable.tenantId, input.tenantId),
          eq(bookingCommercialsTable.id, participant.commercialId),
        ),
      );
  }
  return { lock, participants, replayed: false };
}

export async function recordNoShowDecision(
  tx: Transaction,
  input: {
    tenantId: string;
    bookingId: string;
    actorUserId: string;
    selectedChargeAmountMinor: number;
    waived: boolean;
    note: string | null;
  },
) {
  const [commercial] = await tx
    .select()
    .from(bookingCommercialsTable)
    .where(
      and(
        eq(bookingCommercialsTable.tenantId, input.tenantId),
        eq(bookingCommercialsTable.bookingId, input.bookingId),
      ),
    )
    .limit(1);
  if (!commercial) {
    throw new CommercialError(
      409,
      "This legacy booking has no commercial hold to settle.",
    );
  }
  await lockClient(tx, input.tenantId, commercial.clientUserId);
  if (commercial.holdStatus !== "active") {
    throw new CommercialError(409, "This booking hold is no longer active.");
  }
  if (
    commercial.lockedAmountMinor === null ||
    !Number.isInteger(input.selectedChargeAmountMinor) ||
    input.selectedChargeAmountMinor < 0 ||
    input.selectedChargeAmountMinor > commercial.lockedAmountMinor
  ) {
    throw new CommercialError(
      400,
      "No-show charge must be between zero and the locked class value.",
    );
  }
  const [existing] = await tx
    .select()
    .from(commercialNoShowDecisionsTable)
    .where(
      and(
        eq(commercialNoShowDecisionsTable.tenantId, input.tenantId),
        eq(commercialNoShowDecisionsTable.bookingId, input.bookingId),
      ),
    )
    .limit(1);
  if (existing) {
    if (
      existing.selectedChargeAmountMinor !== input.selectedChargeAmountMinor ||
      existing.waived !== input.waived ||
      existing.note !== input.note
    ) {
      throw new CommercialError(
        409,
        "A no-show decision has already been recorded for this booking.",
      );
    }
    return { decision: existing, replayed: true };
  }
  const [decision] = await tx
    .insert(commercialNoShowDecisionsTable)
    .values({
      tenantId: input.tenantId,
      bookingId: input.bookingId,
      clientUserId: commercial.clientUserId,
      heldAmountMinor: commercial.lockedAmountMinor,
      selectedChargeAmountMinor: input.selectedChargeAmountMinor,
      releasedAmountMinor:
        commercial.lockedAmountMinor - input.selectedChargeAmountMinor,
      waived: input.waived,
      actorUserId: input.actorUserId,
      note: input.note,
    })
    .returning();
  if (!decision) throw new Error("Failed to record no-show decision");
  return { decision, replayed: false };
}

type SessionCommercialRow = {
  bookingId: string;
  clientUserId: string;
  bookingStatus: "pending" | "confirmed" | "rejected" | "cancelled" | "rescheduled" | "attended" | "no_show";
  clientFirstName: string;
  clientLastName: string;
  commercialId: string | null;
  pricingPlanName: string | null;
  pricingPlanVersion: number | null;
  pricingRule:
    | "actual_attendance_count"
    | "class_close_confirmed_count"
    | null;
  currency: string | null;
  rateTable: PricingRateSnapshot | null;
  maximumHeldAmountMinor: number | null;
  heldAmountMinor: number | null;
  classLockId: string | null;
  lockedParticipantCount: number | null;
  lockedAmountMinor: number | null;
  holdStatus: "active" | "released" | "settled" | null;
  settlementId: string | null;
  finalChargeAmountMinor: number | null;
  releasedAmountMinor: number | null;
  settlementAttendanceCount: number | null;
  noShowDecisionId: string | null;
  noShowChargeAmountMinor: number | null;
  noShowWaived: boolean | null;
};

export async function getSessionCommercialRows(
  executor: Executor,
  tenantId: string,
  trainingSessionId: string,
): Promise<SessionCommercialRow[]> {
  return executor
    .select({
      bookingId: bookingsTable.id,
      clientUserId: bookingsTable.clientUserId,
      bookingStatus: bookingsTable.status,
      clientFirstName: usersTable.firstName,
      clientLastName: usersTable.lastName,
      commercialId: bookingCommercialsTable.id,
      pricingPlanName: bookingCommercialsTable.pricingPlanName,
      pricingPlanVersion: bookingCommercialsTable.pricingPlanVersion,
      pricingRule: bookingCommercialsTable.pricingRule,
      currency: bookingCommercialsTable.currency,
      rateTable: bookingCommercialsTable.rateTable,
      maximumHeldAmountMinor: bookingCommercialsTable.maximumHeldAmountMinor,
      heldAmountMinor: bookingCommercialsTable.heldAmountMinor,
      classLockId: bookingCommercialsTable.classLockId,
      lockedParticipantCount: bookingCommercialsTable.lockedParticipantCount,
      lockedAmountMinor: bookingCommercialsTable.lockedAmountMinor,
      holdStatus: bookingCommercialsTable.holdStatus,
      settlementId: commercialSettlementsTable.id,
      finalChargeAmountMinor: commercialSettlementsTable.finalChargeAmountMinor,
      releasedAmountMinor: commercialSettlementsTable.releasedAmountMinor,
      settlementAttendanceCount: commercialSettlementsTable.attendanceCount,
      noShowDecisionId: commercialNoShowDecisionsTable.id,
      noShowChargeAmountMinor:
        commercialNoShowDecisionsTable.selectedChargeAmountMinor,
      noShowWaived: commercialNoShowDecisionsTable.waived,
    })
    .from(bookingsTable)
    .innerJoin(
      usersTable,
      and(
        eq(usersTable.id, bookingsTable.clientUserId),
        eq(usersTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .leftJoin(
      bookingCommercialsTable,
      and(
        eq(bookingCommercialsTable.bookingId, bookingsTable.id),
        eq(bookingCommercialsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .leftJoin(
      commercialSettlementsTable,
      and(
        eq(commercialSettlementsTable.bookingId, bookingsTable.id),
        eq(commercialSettlementsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .leftJoin(
      commercialNoShowDecisionsTable,
      and(
        eq(commercialNoShowDecisionsTable.bookingId, bookingsTable.id),
        eq(commercialNoShowDecisionsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        eq(bookingsTable.trainingSessionId, trainingSessionId),
      ),
    )
    .orderBy(asc(bookingsTable.createdAt));
}

export async function getClassPricingSummary(
  executor: Executor,
  tenantId: string,
  trainingSessionId: string,
) {
  const [session] = await executor
    .select({
      status: trainingSessionsTable.status,
      startsAt: trainingSessionsTable.startsAt,
      capacity: trainingSessionsTable.capacity,
    })
    .from(trainingSessionsTable)
    .where(
      and(
        eq(trainingSessionsTable.tenantId, tenantId),
        eq(trainingSessionsTable.id, trainingSessionId),
      ),
    )
    .limit(1);
  if (!session) throw new CommercialError(404, "Training session not found");
  const [classLock] = await executor
    .select()
    .from(commercialClassLocksTable)
    .where(
      and(
        eq(commercialClassLocksTable.tenantId, tenantId),
        eq(commercialClassLocksTable.trainingSessionId, trainingSessionId),
      ),
    )
    .limit(1);
  const rows = await getSessionCommercialRows(executor, tenantId, trainingSessionId);
  const confirmed = rows.filter((row) => row.bookingStatus === "confirmed");
  const participantCount =
    classLock?.confirmedParticipantCount ?? confirmed.length;
  return {
    state: classLock ? "closed" : "open",
    closeReason: classLock?.closeReason ?? null,
    closedAt: classLock?.closedAt ?? null,
    closedByUserId: classLock?.closedByUserId ?? null,
    confirmedParticipantCount: participantCount,
    capacity: session.capacity,
    canClose:
      !classLock &&
      session.status === "scheduled" &&
      session.startsAt > new Date() &&
      participantCount > 0,
    participants: rows
      .filter((row) => row.bookingStatus === "confirmed" || row.classLockId)
      .map((row) => ({
        bookingId: row.bookingId,
        clientName: `${row.clientFirstName} ${row.clientLastName}`,
        bookingStatus: row.bookingStatus,
        maximumHeldAmountMinor: row.maximumHeldAmountMinor,
        heldAmountMinor: row.heldAmountMinor,
        projectedLockedAmountMinor:
          classLock
            ? row.lockedAmountMinor
            : row.rateTable?.[String(participantCount)] ?? null,
        lockedAmountMinor: row.lockedAmountMinor,
        lockedParticipantCount: row.lockedParticipantCount,
        settled: Boolean(row.settlementId),
      })),
  };
}

export async function settleSessionCommercial(
  tx: Transaction,
  input: {
    tenantId: string;
    trainingSessionId: string;
    actorUserId: string;
  },
) {
  const lockedSession = await tx.execute(
    sql`SELECT id FROM training_sessions WHERE tenant_id = ${input.tenantId} AND id = ${input.trainingSessionId} FOR UPDATE`,
  );
  if (lockedSession.rows.length === 0) {
    throw new CommercialError(404, "Training session not found");
  }
  const [session] = await tx
    .select({ status: trainingSessionsTable.status })
    .from(trainingSessionsTable)
    .where(
      and(
        eq(trainingSessionsTable.tenantId, input.tenantId),
        eq(trainingSessionsTable.id, input.trainingSessionId),
      ),
    )
    .limit(1);
  if (session?.status !== "completed") {
    throw new CommercialError(
      409,
      "Complete the training session before settling its commercial value.",
    );
  }
  const [classLock] = await tx
    .select({ id: commercialClassLocksTable.id })
    .from(commercialClassLocksTable)
    .where(
      and(
        eq(commercialClassLocksTable.tenantId, input.tenantId),
        eq(commercialClassLocksTable.trainingSessionId, input.trainingSessionId),
      ),
    )
    .limit(1);
  if (!classLock) {
    throw new CommercialError(
      409,
      "Close and lock the class price before settling attendance.",
    );
  }
  const rows = await getSessionCommercialRows(
    tx,
    input.tenantId,
    input.trainingSessionId,
  );
  const unresolved = rows.filter(
    (row) => row.bookingStatus === "pending" || row.bookingStatus === "confirmed",
  );
  if (unresolved.length > 0) {
    throw new CommercialError(
      409,
      "Record attendance outcomes for every active participant before settlement.",
    );
  }
  const participants = rows.filter(
    (row) => row.bookingStatus === "attended" || row.bookingStatus === "no_show",
  );
  if (participants.length === 0) {
    throw new CommercialError(409, "There are no attendance outcomes to settle.");
  }
  if (participants.every((row) => row.settlementId)) {
    return { rows, replayed: true };
  }
  if (participants.some((row) => row.settlementId)) {
    throw new CommercialError(409, "Commercial settlement is incomplete.");
  }
  if (participants.some((row) => !row.commercialId || row.holdStatus !== "active")) {
    throw new CommercialError(
      409,
      "Every attendance outcome needs an active commercial hold before settlement.",
    );
  }
  const noDecision = participants.find(
    (row) => row.bookingStatus === "no_show" && !row.noShowDecisionId,
  );
  if (noDecision) {
    throw new CommercialError(
      409,
      "Record the no-show charge decision before settling this session.",
    );
  }

  const attendanceCount = participants.filter(
    (row) => row.bookingStatus === "attended",
  ).length;
  for (const row of [...participants].sort((a, b) =>
    a.clientUserId.localeCompare(b.clientUserId),
  )) {
    await lockClient(tx, input.tenantId, row.clientUserId);
  }

  const settledRows = [];
  for (const row of participants) {
    const heldAmountMinor = row.heldAmountMinor!;
    const finalChargeAmountMinor =
      row.bookingStatus === "attended"
        ? row.lockedAmountMinor
        : row.noShowChargeAmountMinor;
    if (
      !Number.isInteger(finalChargeAmountMinor) ||
      finalChargeAmountMinor! < 0 ||
      finalChargeAmountMinor! > heldAmountMinor
    ) {
      throw new CommercialError(
        409,
        "A snapshotted rate or no-show charge is invalid for settlement.",
      );
    }
    const releasedAmountMinor = heldAmountMinor - finalChargeAmountMinor!;
    const movementType =
      row.bookingStatus === "attended" ? "attendance_charge" : "no_show_charge";
    if (finalChargeAmountMinor! > 0) {
      await tx.insert(trainingValueLedgerTable).values({
        tenantId: input.tenantId,
        clientUserId: row.clientUserId,
        amountMinor: -finalChargeAmountMinor!,
        movementType,
        bookingId: row.bookingId,
        actorUserId: input.actorUserId,
        reason:
          row.bookingStatus === "attended"
            ? "Session attendance settlement"
            : "Marcus-selected no-show charge",
      });
    }
    const [settlement] = await tx
      .insert(commercialSettlementsTable)
      .values({
        tenantId: input.tenantId,
        bookingId: row.bookingId,
        clientUserId: row.clientUserId,
        attendanceCount,
        heldAmountMinor,
        finalChargeAmountMinor: finalChargeAmountMinor!,
        releasedAmountMinor,
        currency: row.currency ?? "EUR",
        pricingRule: "class_close_confirmed_count",
        settledByUserId: input.actorUserId,
      })
      .returning();
    await tx
      .update(bookingCommercialsTable)
      .set({
        holdStatus: "settled",
        holdReleasedAt: new Date(),
        holdReleaseReason: "session_settlement",
        updatedAt: new Date(),
      })
      .where(eq(bookingCommercialsTable.id, row.commercialId!));
    settledRows.push({
      bookingId: row.bookingId,
      clientUserId: row.clientUserId,
      clientName: `${row.clientFirstName} ${row.clientLastName}`,
      outcome: row.bookingStatus,
      heldAmountMinor,
      finalChargeAmountMinor: finalChargeAmountMinor!,
      releasedAmountMinor,
      settlement,
    });
  }
  return { rows: settledRows, replayed: false };
}