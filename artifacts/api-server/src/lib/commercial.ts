import {
  and,
  asc,
  desc,
  eq,
  sql,
} from "drizzle-orm";
import {
  bookingCommercialsTable,
  bookingsTable,
  clientPricingAssignmentsTable,
  commercialNoShowDecisionsTable,
  commercialSettlementsTable,
  db,
  pricingPlansTable,
  pricingRatesTable,
  trainingSessionsTable,
  trainingSessionTypesTable,
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

export async function lockCommercialClient(
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
      total: sql<number>`coalesce(sum(${bookingCommercialsTable.reservedAmountMinor}), 0)::int`,
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

export type WalletActivityItem = {
  id: string;
  kind:
    | "training_value_added"
    | "manual_adjustment"
    | "booking_hold"
    | "hold_released"
    | "session_value_used"
    | "no_show_charged"
    | "no_show_waived";
  description: string;
  amountMinor: number;
  createdAt: Date;
  bookingId: string | null;
  session: {
    id: string;
    name: string;
    startsAt: Date;
  } | null;
};

function sessionActivityDetails(row: {
  sessionId: string | null;
  sessionName: string | null;
  sessionStartsAt: Date | null;
}) {
  return row.sessionId && row.sessionStartsAt
    ? {
        id: row.sessionId,
        name: row.sessionName ?? "Training session",
        startsAt: row.sessionStartsAt,
      }
    : null;
}

export async function getClientWalletActivity(
  executor: Executor,
  tenantId: string,
  clientUserId: string,
): Promise<WalletActivityItem[]> {
  const ledgerRows = await executor
    .select({
      id: trainingValueLedgerTable.id,
      amountMinor: trainingValueLedgerTable.amountMinor,
      movementType: trainingValueLedgerTable.movementType,
      bookingId: trainingValueLedgerTable.bookingId,
      createdAt: trainingValueLedgerTable.createdAt,
      sessionId: trainingSessionsTable.id,
      sessionName: trainingSessionTypesTable.name,
      sessionStartsAt: trainingSessionsTable.startsAt,
    })
    .from(trainingValueLedgerTable)
    .leftJoin(
      bookingsTable,
      and(
        eq(bookingsTable.id, trainingValueLedgerTable.bookingId),
        eq(bookingsTable.tenantId, trainingValueLedgerTable.tenantId),
      ),
    )
    .leftJoin(
      trainingSessionsTable,
      and(
        eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
        eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .leftJoin(
      trainingSessionTypesTable,
      and(
        eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
        eq(trainingSessionTypesTable.tenantId, trainingSessionsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(trainingValueLedgerTable.tenantId, tenantId),
        eq(trainingValueLedgerTable.clientUserId, clientUserId),
      ),
    )
    .orderBy(desc(trainingValueLedgerTable.createdAt));

  const commercialRows = await executor
    .select({
      id: bookingCommercialsTable.id,
      bookingId: bookingCommercialsTable.bookingId,
      maximumHeldAmountMinor: bookingCommercialsTable.maximumHeldAmountMinor,
      reservedAmountMinor: bookingCommercialsTable.reservedAmountMinor,
      lockedChargeAmountMinor: bookingCommercialsTable.lockedChargeAmountMinor,
      holdStatus: bookingCommercialsTable.holdStatus,
      holdCreatedAt: bookingCommercialsTable.holdCreatedAt,
      holdReleasedAt: bookingCommercialsTable.holdReleasedAt,
      sessionId: trainingSessionsTable.id,
      sessionName: trainingSessionTypesTable.name,
      sessionStartsAt: trainingSessionsTable.startsAt,
      finalChargeAmountMinor: commercialSettlementsTable.finalChargeAmountMinor,
      releasedAmountMinor: commercialSettlementsTable.releasedAmountMinor,
    })
    .from(bookingCommercialsTable)
    .innerJoin(
      bookingsTable,
      and(
        eq(bookingsTable.id, bookingCommercialsTable.bookingId),
        eq(bookingsTable.tenantId, bookingCommercialsTable.tenantId),
      ),
    )
    .innerJoin(
      trainingSessionsTable,
      and(
        eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
        eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .leftJoin(
      trainingSessionTypesTable,
      and(
        eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
        eq(trainingSessionTypesTable.tenantId, trainingSessionsTable.tenantId),
      ),
    )
    .leftJoin(
      commercialSettlementsTable,
      and(
        eq(commercialSettlementsTable.bookingId, bookingCommercialsTable.bookingId),
        eq(commercialSettlementsTable.tenantId, bookingCommercialsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(bookingCommercialsTable.tenantId, tenantId),
        eq(bookingCommercialsTable.clientUserId, clientUserId),
      ),
    );

  const activity: WalletActivityItem[] = ledgerRows.map((row) => {
    const kind =
      row.movementType === "manual_grant"
        ? "training_value_added"
        : row.movementType === "manual_adjustment"
          ? "manual_adjustment"
          : row.movementType === "attendance_charge"
            ? "session_value_used"
            : "no_show_charged";
    return {
      id: row.id,
      kind,
      description:
        kind === "training_value_added"
          ? "Training value added"
          : kind === "manual_adjustment"
            ? "Manual adjustment"
            : kind === "session_value_used"
              ? "Session value used"
              : "No-show charged",
      amountMinor: row.amountMinor,
      createdAt: row.createdAt,
      bookingId: row.bookingId,
      session: sessionActivityDetails(row),
    };
  });

  for (const row of commercialRows) {
    const session = sessionActivityDetails(row);
    if (row.maximumHeldAmountMinor > 0 && row.holdCreatedAt) {
      activity.push({
        id: `${row.id}:hold`,
        kind: "booking_hold",
        description: "Booking hold",
        amountMinor: -row.maximumHeldAmountMinor,
        createdAt: row.holdCreatedAt,
        bookingId: row.bookingId,
        session,
      });
    }
    const releaseAt = row.holdReleasedAt;
    const lockedRelease =
      row.lockedChargeAmountMinor !== null
        ? row.maximumHeldAmountMinor - row.lockedChargeAmountMinor
        : row.holdStatus === "released"
          ? row.maximumHeldAmountMinor
          : 0;
    if (lockedRelease > 0 && releaseAt) {
      activity.push({
        id: `${row.id}:release`,
        kind: "hold_released",
        description: "Hold released",
        amountMinor: lockedRelease,
        createdAt: releaseAt,
        bookingId: row.bookingId,
        session,
      });
    }
    if (
      row.releasedAmountMinor &&
      row.releasedAmountMinor > 0 &&
      row.holdReleasedAt
    ) {
      activity.push({
        id: `${row.id}:settlement-release`,
        kind:
          row.finalChargeAmountMinor === 0
            ? "no_show_waived"
            : "hold_released",
        description:
          row.finalChargeAmountMinor === 0
            ? "No-show waived"
            : "Hold released",
        amountMinor: row.releasedAmountMinor,
        createdAt: row.holdReleasedAt,
        bookingId: row.bookingId,
        session,
      });
    }
  }

  return activity.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export type RevenueActivityItem = {
  id: string;
  bookingId: string;
  clientUserId: string;
  clientName: string;
  sessionId: string;
  sessionName: string;
  sessionStartsAt: Date;
  outcome: "attended" | "no_show";
  amountMinor: number;
  settledAt: Date;
};

function eligibleRevenueBookingSql() {
  return sql`(${bookingsTable.status} = 'attended' OR ${bookingsTable.status} = 'no_show')`;
}

export async function getRevenueActivity(
  executor: Executor,
  tenantId: string,
  options: { since?: Date; period?: "today" | "week" | "month" } = {},
): Promise<RevenueActivityItem[]> {
  const rows = await executor
    .select({
      id: commercialSettlementsTable.id,
      bookingId: commercialSettlementsTable.bookingId,
      clientUserId: commercialSettlementsTable.clientUserId,
      clientFirstName: usersTable.firstName,
      clientLastName: usersTable.lastName,
      sessionId: trainingSessionsTable.id,
      sessionName: trainingSessionTypesTable.name,
      sessionStartsAt: trainingSessionsTable.startsAt,
      bookingStatus: bookingsTable.status,
      amountMinor: commercialSettlementsTable.finalChargeAmountMinor,
      settledAt: commercialSettlementsTable.settledAt,
    })
    .from(commercialSettlementsTable)
    .innerJoin(
      bookingsTable,
      and(
        eq(bookingsTable.id, commercialSettlementsTable.bookingId),
        eq(bookingsTable.tenantId, commercialSettlementsTable.tenantId),
      ),
    )
    .innerJoin(
      usersTable,
      and(
        eq(usersTable.id, commercialSettlementsTable.clientUserId),
        eq(usersTable.tenantId, commercialSettlementsTable.tenantId),
      ),
    )
    .innerJoin(
      trainingSessionsTable,
      and(
        eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
        eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .leftJoin(
      trainingSessionTypesTable,
      and(
        eq(trainingSessionTypesTable.id, trainingSessionsTable.sessionTypeId),
        eq(trainingSessionTypesTable.tenantId, trainingSessionsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(commercialSettlementsTable.tenantId, tenantId),
        sql`${commercialSettlementsTable.finalChargeAmountMinor} > 0`,
        eligibleRevenueBookingSql(),
        options.since
          ? sql`${commercialSettlementsTable.settledAt} >= ${options.since}`
          : options.period
            ? localPeriodSql(options.period)
            : undefined,
      ),
    )
    .orderBy(desc(commercialSettlementsTable.settledAt));
  return rows.map((row) => ({
    id: row.id,
    bookingId: row.bookingId,
    clientUserId: row.clientUserId,
    clientName: `${row.clientFirstName} ${row.clientLastName}`,
    sessionId: row.sessionId,
    sessionName: row.sessionName ?? "Training session",
    sessionStartsAt: row.sessionStartsAt,
    outcome: row.bookingStatus === "no_show" ? "no_show" : "attended",
    amountMinor: row.amountMinor,
    settledAt: row.settledAt,
  }));
}

function localPeriodSql(period: "today" | "week" | "month") {
  const localNow = sql`now() at time zone 'Europe/Malta'`;
  if (period === "today") {
    return sql`${commercialSettlementsTable.settledAt} >= date_trunc('day', ${localNow}) at time zone 'Europe/Malta'`;
  }
  if (period === "week") {
    return sql`${commercialSettlementsTable.settledAt} >= date_trunc('week', ${localNow}) at time zone 'Europe/Malta'`;
  }
  return sql`${commercialSettlementsTable.settledAt} >= date_trunc('month', ${localNow}) at time zone 'Europe/Malta'`;
}

export async function getRevenueSummary(executor: Executor, tenantId: string) {
  const periods = ["today", "week", "month"] as const;
  const values = await Promise.all(
    periods.map(async (period) => {
      const [row] = await executor
        .select({
          total: sql<number>`coalesce(sum(${commercialSettlementsTable.finalChargeAmountMinor}), 0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(commercialSettlementsTable)
        .innerJoin(
          bookingsTable,
          and(
            eq(bookingsTable.id, commercialSettlementsTable.bookingId),
            eq(bookingsTable.tenantId, commercialSettlementsTable.tenantId),
          ),
        )
        .where(
          and(
            eq(commercialSettlementsTable.tenantId, tenantId),
            sql`${commercialSettlementsTable.finalChargeAmountMinor} > 0`,
            eligibleRevenueBookingSql(),
            localPeriodSql(period),
          ),
        );
      return [period, { amountMinor: numericValue(row?.total), settlementCount: numericValue(row?.count) }] as const;
    }),
  );
  return Object.fromEntries(values);
}

export async function getSessionRevenueSummary(
  executor: Executor,
  tenantId: string,
  trainingSessionId: string,
) {
  const rows = await getSessionCommercialRows(
    executor,
    tenantId,
    trainingSessionId,
  );
  const participants = rows.filter(
    (row) => row.bookingStatus === "attended" || row.bookingStatus === "no_show",
  );
  const settled = participants.filter(
    (row) =>
      row.settlementId &&
      (row.finalChargeAmountMinor ?? 0) > 0,
  );
  return {
    sessionId: trainingSessionId,
    settledRevenueMinor: settled.reduce(
      (total, row) => total + (row.finalChargeAmountMinor ?? 0),
      0,
    ),
    settledCount: settled.length,
    pendingSettlementCount: participants.filter((row) => !row.settlementId).length,
    rows: participants.map((row) => ({
      bookingId: row.bookingId,
      clientUserId: row.clientUserId,
      clientName: `${row.clientFirstName} ${row.clientLastName}`,
      outcome:
        row.bookingStatus === "no_show"
          ? row.noShowDecisionId
            ? row.noShowWaived
              ? "no_show_waived"
              : "no_show_charged"
            : "no_show_pending"
          : "attended",
      amountMinor: row.finalChargeAmountMinor ?? 0,
      settledAt: null,
      settled: Boolean(row.settlementId),
    })),
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
  await lockCommercialClient(tx, input.tenantId, input.clientUserId);
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
    pricingRule: "confirmed_participant_count",
    currency: "EUR",
    rateTable: pricing.rateTable,
    maximumHeldAmountMinor: pricing.maximumHoldAmountMinor,
    reservedAmountMinor: pricing.maximumHoldAmountMinor,
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
  await lockCommercialClient(tx, input.tenantId, commercial.clientUserId);
  if (commercial.holdStatus !== "active") {
    return commercial.reservedAmountMinor;
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
  return commercial.reservedAmountMinor;
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
  await lockCommercialClient(tx, input.tenantId, commercial.clientUserId);
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
  await tx.insert(bookingCommercialsTable).values({
    tenantId: input.tenantId,
    bookingId: input.replacementBookingId,
    clientUserId: commercial.clientUserId,
    pricingPlanId: commercial.pricingPlanId,
    pricingPlanName: commercial.pricingPlanName,
    pricingPlanVersion: commercial.pricingPlanVersion,
    pricingRule: commercial.pricingRule,
    currency: commercial.currency,
    rateTable: commercial.rateTable,
    maximumHeldAmountMinor: commercial.maximumHeldAmountMinor,
    reservedAmountMinor: commercial.reservedAmountMinor,
    lockedParticipantCount: commercial.lockedParticipantCount,
    lockedChargeAmountMinor: commercial.lockedChargeAmountMinor,
    holdStatus: "active",
    holdCreatedAt: commercial.holdCreatedAt,
  });
  return commercial.maximumHeldAmountMinor;
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
  const [session] = await tx
    .select({ commercialClosedAt: trainingSessionsTable.commercialClosedAt })
    .from(bookingsTable)
    .innerJoin(
      trainingSessionsTable,
      and(
        eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
        eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
      ),
    )
    .where(
      and(
        eq(bookingsTable.tenantId, input.tenantId),
        eq(bookingsTable.id, input.bookingId),
      ),
    )
    .limit(1);
  if (!session?.commercialClosedAt) {
    throw new CommercialError(
      409,
      "Close class pricing before recording a no-show decision.",
    );
  }
  if (commercial.lockedChargeAmountMinor === null) {
    throw new CommercialError(
      409,
      "This no-show does not have a locked class price.",
    );
  }
  await lockCommercialClient(tx, input.tenantId, commercial.clientUserId);
  if (
    !Number.isInteger(input.selectedChargeAmountMinor) ||
    input.selectedChargeAmountMinor < 0 ||
    input.selectedChargeAmountMinor >
      commercial.lockedChargeAmountMinor
  ) {
    throw new CommercialError(
      400,
      "No-show charge must be between zero and the locked session amount.",
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
  if (commercial.holdStatus !== "active") {
    throw new CommercialError(409, "This booking hold is no longer active.");
  }
  const [decision] = await tx
    .insert(commercialNoShowDecisionsTable)
    .values({
      tenantId: input.tenantId,
      bookingId: input.bookingId,
      clientUserId: commercial.clientUserId,
      heldAmountMinor:
        commercial.lockedChargeAmountMinor,
      selectedChargeAmountMinor: input.selectedChargeAmountMinor,
      releasedAmountMinor:
        commercial.lockedChargeAmountMinor - input.selectedChargeAmountMinor,
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
    | "confirmed_participant_count"
    | null;
  currency: string | null;
  rateTable: PricingRateSnapshot | null;
  maximumHeldAmountMinor: number | null;
  reservedAmountMinor: number | null;
  lockedParticipantCount: number | null;
  lockedChargeAmountMinor: number | null;
  holdStatus: "active" | "released" | "settled" | null;
  settlementId: string | null;
  finalChargeAmountMinor: number | null;
  releasedAmountMinor: number | null;
  settledAt: Date | null;
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
      reservedAmountMinor: bookingCommercialsTable.reservedAmountMinor,
      lockedParticipantCount: bookingCommercialsTable.lockedParticipantCount,
      lockedChargeAmountMinor: bookingCommercialsTable.lockedChargeAmountMinor,
      holdStatus: bookingCommercialsTable.holdStatus,
      settlementId: commercialSettlementsTable.id,
      finalChargeAmountMinor: commercialSettlementsTable.finalChargeAmountMinor,
      releasedAmountMinor: commercialSettlementsTable.releasedAmountMinor,
      settledAt: commercialSettlementsTable.settledAt,
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

export async function closeSessionCommercial(
  tx: Transaction,
  input: { tenantId: string; trainingSessionId: string },
) {
  const lock = await tx.execute(
    sql`SELECT id FROM training_sessions WHERE tenant_id = ${input.tenantId} AND id = ${input.trainingSessionId} FOR UPDATE`,
  );
  if (lock.rows.length === 0) {
    throw new CommercialError(404, "Training session not found");
  }
  const [session] = await tx
    .select({
      status: trainingSessionsTable.status,
      startsAt: trainingSessionsTable.startsAt,
      commercialClosedAt: trainingSessionsTable.commercialClosedAt,
      commercialClosedParticipantCount:
        trainingSessionsTable.commercialClosedParticipantCount,
    })
    .from(trainingSessionsTable)
    .where(
      and(
        eq(trainingSessionsTable.tenantId, input.tenantId),
        eq(trainingSessionsTable.id, input.trainingSessionId),
      ),
    )
    .limit(1);
  if (!session) throw new CommercialError(404, "Training session not found");
  if (session.commercialClosedAt) {
    return {
      participantCount: session.commercialClosedParticipantCount ?? 0,
      releases: [],
      replayed: true,
    };
  }
  if (session.status !== "scheduled") {
    throw new CommercialError(409, "Only scheduled sessions can be commercially closed.");
  }
  if (session.startsAt <= new Date()) {
    throw new CommercialError(
      409,
      "Class pricing must be closed before the training session starts.",
    );
  }
  const rows = await getSessionCommercialRows(
    tx,
    input.tenantId,
    input.trainingSessionId,
  );
  if (rows.some((row) => row.bookingStatus === "pending")) {
    throw new CommercialError(
      409,
      "Resolve every pending booking before closing class pricing.",
    );
  }
  const participants = rows.filter((row) => row.bookingStatus === "confirmed");
  if (participants.length === 0) {
    throw new CommercialError(409, "At least one confirmed participant is required.");
  }
  if (
    participants.some(
      (row) => !row.commercialId || row.holdStatus !== "active" || !row.rateTable,
    )
  ) {
    throw new CommercialError(
      409,
      "Every confirmed participant needs an active commercial hold before class close.",
    );
  }
  for (const row of [...participants].sort((a, b) =>
    a.clientUserId.localeCompare(b.clientUserId),
  )) {
    await lockCommercialClient(tx, input.tenantId, row.clientUserId);
  }
  const participantCount = participants.length;
  const releases: Array<{ bookingId: string; releasedAmountMinor: number }> = [];
  for (const row of participants) {
    const lockedChargeAmountMinor = row.rateTable?.[String(participantCount)];
    if (
      !Number.isInteger(lockedChargeAmountMinor) ||
      lockedChargeAmountMinor! < 0 ||
      lockedChargeAmountMinor! > row.maximumHeldAmountMinor!
    ) {
      throw new CommercialError(
        409,
        "A participant's snapshotted rate card does not support this closed class size.",
      );
    }
    await tx
      .update(bookingCommercialsTable)
      .set({
        reservedAmountMinor: lockedChargeAmountMinor!,
        lockedParticipantCount: participantCount,
        lockedChargeAmountMinor: lockedChargeAmountMinor!,
        updatedAt: new Date(),
      })
      .where(eq(bookingCommercialsTable.id, row.commercialId!));
    releases.push({
      bookingId: row.bookingId,
      releasedAmountMinor: row.reservedAmountMinor! - lockedChargeAmountMinor!,
    });
  }
  await tx
    .update(trainingSessionsTable)
    .set({
      commercialClosedAt: new Date(),
      commercialClosedParticipantCount: participantCount,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(trainingSessionsTable.tenantId, input.tenantId),
        eq(trainingSessionsTable.id, input.trainingSessionId),
      ),
    );
  return { participantCount, releases, replayed: false };
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
      commercialClosedAt: trainingSessionsTable.commercialClosedAt,
      commercialClosedParticipantCount:
        trainingSessionsTable.commercialClosedParticipantCount,
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

  const rows = await getSessionCommercialRows(executor, tenantId, trainingSessionId);
  const confirmed = rows.filter((row) => row.bookingStatus === "confirmed");
  const participantCount =
    session.commercialClosedParticipantCount ?? confirmed.length;
  const isClosed = Boolean(session.commercialClosedAt);

  return {
    state: isClosed ? ("closed" as const) : ("open" as const),
    closeReason: null,
    closedAt: session.commercialClosedAt,
    confirmedParticipantCount: participantCount,
    capacity: session.capacity,
    canClose:
      !isClosed &&
      session.status === "scheduled" &&
      session.startsAt > new Date() &&
      participantCount > 0,
    participants: rows
      .filter(
        (row) =>
          row.bookingStatus === "confirmed" ||
          row.lockedChargeAmountMinor !== null,
      )
      .map((row) => ({
        bookingId: row.bookingId,
        clientName: `${row.clientFirstName} ${row.clientLastName}`,
        bookingStatus: row.bookingStatus,
        maximumHeldAmountMinor: row.maximumHeldAmountMinor,
        heldAmountMinor: row.reservedAmountMinor,
        projectedLockedAmountMinor: isClosed
          ? row.lockedChargeAmountMinor
          : row.rateTable?.[String(participantCount)] ?? null,
        lockedAmountMinor: row.lockedChargeAmountMinor,
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
    .select({
      status: trainingSessionsTable.status,
      commercialClosedAt: trainingSessionsTable.commercialClosedAt,
      commercialClosedParticipantCount:
        trainingSessionsTable.commercialClosedParticipantCount,
    })
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
  if (!session.commercialClosedAt || !session.commercialClosedParticipantCount) {
    throw new CommercialError(
      409,
      "Close class pricing before recording the commercial settlement.",
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

  const participantCount = session.commercialClosedParticipantCount;
  for (const row of [...participants].sort((a, b) =>
    a.clientUserId.localeCompare(b.clientUserId),
  )) {
    await lockCommercialClient(tx, input.tenantId, row.clientUserId);
  }

  const settledRows = [];
  for (const row of participants) {
    const heldAmountMinor = row.reservedAmountMinor!;
    const finalChargeAmountMinor =
      row.bookingStatus === "attended"
        ? row.lockedChargeAmountMinor
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
        attendanceCount: participantCount,
        heldAmountMinor,
        finalChargeAmountMinor: finalChargeAmountMinor!,
        releasedAmountMinor,
        currency: row.currency ?? "EUR",
        pricingRule: "confirmed_participant_count",
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
