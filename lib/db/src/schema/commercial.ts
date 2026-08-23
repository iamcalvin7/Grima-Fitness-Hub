import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { bookingsTable } from "./training";

export const pricingPlanKindEnum = pgEnum("pricing_plan_kind", [
  "default",
  "tier",
  "custom",
]);

export const commercialHoldStatusEnum = pgEnum("commercial_hold_status", [
  "active",
  "released",
  "settled",
]);

export const commercialPricingRuleEnum = pgEnum("commercial_pricing_rule", [
  "actual_attendance_count",
  "confirmed_participant_count",
]);

export const trainingValueMovementTypeEnum = pgEnum(
  "training_value_movement_type",
  [
    "manual_grant",
    "manual_adjustment",
    "attendance_charge",
    "no_show_charge",
  ],
);

export const pricingPlansTable = pgTable(
  "pricing_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: pricingPlanKindEnum("kind").notNull(),
    currency: text("currency").notNull().default("EUR"),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "pricing_plans_tenant_creator_fk",
    }),
    unique("pricing_plans_tenant_id_unique").on(table.tenantId, table.id),
    index("pricing_plans_tenant_active_idx").on(
      table.tenantId,
      table.isActive,
    ),
    uniqueIndex("pricing_plans_one_active_default_per_tenant")
      .on(table.tenantId)
      .where(sql`${table.kind} = 'default' and ${table.isActive}`),
    check("pricing_plans_version_positive", sql`${table.version} > 0`),
  ],
);

export const pricingRatesTable = pgTable(
  "pricing_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    pricingPlanId: uuid("pricing_plan_id").notNull(),
    participantCount: integer("participant_count").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.pricingPlanId],
      foreignColumns: [pricingPlansTable.tenantId, pricingPlansTable.id],
      name: "pricing_rates_tenant_plan_fk",
    }),
    unique("pricing_rates_tenant_id_unique").on(table.tenantId, table.id),
    unique("pricing_rates_plan_participant_count_unique").on(
      table.pricingPlanId,
      table.participantCount,
    ),
    index("pricing_rates_tenant_plan_idx").on(
      table.tenantId,
      table.pricingPlanId,
    ),
    check(
      "pricing_rates_participant_count_positive",
      sql`${table.participantCount} > 0`,
    ),
    check("pricing_rates_amount_non_negative", sql`${table.amountMinor} >= 0`),
  ],
);

export const clientPricingAssignmentsTable = pgTable(
  "client_pricing_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    clientUserId: uuid("client_user_id").notNull(),
    pricingPlanId: uuid("pricing_plan_id").notNull(),
    assignedByUserId: uuid("assigned_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.clientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "client_pricing_assignments_tenant_client_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.pricingPlanId],
      foreignColumns: [pricingPlansTable.tenantId, pricingPlansTable.id],
      name: "client_pricing_assignments_tenant_plan_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.assignedByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "client_pricing_assignments_tenant_assigner_fk",
    }),
    unique("client_pricing_assignments_tenant_id_unique").on(
      table.tenantId,
      table.id,
    ),
    unique("client_pricing_assignments_one_per_client").on(
      table.tenantId,
      table.clientUserId,
    ),
    index("client_pricing_assignments_tenant_plan_idx").on(
      table.tenantId,
      table.pricingPlanId,
    ),
  ],
);

export const trainingValueLedgerTable = pgTable(
  "training_value_ledger",
  // Ledger rows are append-only. Corrections must be represented by a new,
  // auditable manual_adjustment entry rather than rewriting history.
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    clientUserId: uuid("client_user_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    movementType: trainingValueMovementTypeEnum("movement_type").notNull(),
    bookingId: uuid("booking_id"),
    actorUserId: uuid("actor_user_id"),
    idempotencyKey: text("idempotency_key"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.clientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "training_value_ledger_tenant_client_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.bookingId],
      foreignColumns: [bookingsTable.tenantId, bookingsTable.id],
      name: "training_value_ledger_tenant_booking_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.actorUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "training_value_ledger_tenant_actor_fk",
    }),
    unique("training_value_ledger_tenant_id_unique").on(table.tenantId, table.id),
    index("training_value_ledger_client_created_idx").on(
      table.tenantId,
      table.clientUserId,
      table.createdAt,
    ),
    uniqueIndex("training_value_ledger_booking_movement_unique")
      .on(table.tenantId, table.bookingId, table.movementType)
      .where(sql`${table.bookingId} is not null`),
    uniqueIndex("training_value_ledger_actor_idempotency_unique")
      .on(table.tenantId, table.actorUserId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    check("training_value_ledger_amount_non_zero", sql`${table.amountMinor} <> 0`),
  ],
);

export interface PricingRateSnapshot {
  [participantCount: string]: number;
}

export const bookingCommercialsTable = pgTable(
  "booking_commercials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull(),
    clientUserId: uuid("client_user_id").notNull(),
    pricingPlanId: uuid("pricing_plan_id"),
    pricingPlanName: text("pricing_plan_name").notNull(),
    pricingPlanVersion: integer("pricing_plan_version").notNull(),
    pricingRule: commercialPricingRuleEnum("pricing_rule")
      .notNull()
      .default("confirmed_participant_count"),
    currency: text("currency").notNull().default("EUR"),
    rateTable: jsonb("rate_table").$type<PricingRateSnapshot>().notNull(),
    maximumHeldAmountMinor: integer("maximum_held_amount_minor").notNull(),
    reservedAmountMinor: integer("reserved_amount_minor").notNull(),
    lockedParticipantCount: integer("locked_participant_count"),
    lockedChargeAmountMinor: integer("locked_charge_amount_minor"),
    holdStatus: commercialHoldStatusEnum("hold_status").notNull().default("active"),
    holdCreatedAt: timestamp("hold_created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    holdReleasedAt: timestamp("hold_released_at", {
      withTimezone: true,
      mode: "date",
    }),
    holdReleaseReason: text("hold_release_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.bookingId],
      foreignColumns: [bookingsTable.tenantId, bookingsTable.id],
      name: "booking_commercials_tenant_booking_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.clientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "booking_commercials_tenant_client_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.pricingPlanId],
      foreignColumns: [pricingPlansTable.tenantId, pricingPlansTable.id],
      name: "booking_commercials_tenant_plan_fk",
    }),
    unique("booking_commercials_tenant_id_unique").on(table.tenantId, table.id),
    unique("booking_commercials_one_per_booking").on(
      table.tenantId,
      table.bookingId,
    ),
    index("booking_commercials_client_hold_idx").on(
      table.tenantId,
      table.clientUserId,
      table.holdStatus,
    ),
    check(
      "booking_commercials_maximum_held_non_negative",
      sql`${table.maximumHeldAmountMinor} >= 0`,
    ),
    check(
      "booking_commercials_reserved_non_negative",
      sql`${table.reservedAmountMinor} >= 0`,
    ),
    check(
      "booking_commercials_reserved_within_maximum",
      sql`${table.reservedAmountMinor} <= ${table.maximumHeldAmountMinor}`,
    ),
    check(
      "booking_commercials_locked_participant_positive",
      sql`${table.lockedParticipantCount} is null or ${table.lockedParticipantCount} > 0`,
    ),
    check(
      "booking_commercials_locked_charge_non_negative",
      sql`${table.lockedChargeAmountMinor} is null or ${table.lockedChargeAmountMinor} >= 0`,
    ),
    check(
      "booking_commercials_plan_version_positive",
      sql`${table.pricingPlanVersion} > 0`,
    ),
  ],
);

export const commercialSettlementsTable = pgTable(
  "commercial_settlements",
  // Settlements are historical facts and must remain append-only.
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull(),
    clientUserId: uuid("client_user_id").notNull(),
    attendanceCount: integer("attendance_count").notNull(),
    heldAmountMinor: integer("held_amount_minor").notNull(),
    finalChargeAmountMinor: integer("final_charge_amount_minor").notNull(),
    releasedAmountMinor: integer("released_amount_minor").notNull(),
    currency: text("currency").notNull(),
    pricingRule: commercialPricingRuleEnum("pricing_rule").notNull(),
    settledByUserId: uuid("settled_by_user_id").notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.bookingId],
      foreignColumns: [bookingsTable.tenantId, bookingsTable.id],
      name: "commercial_settlements_tenant_booking_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.clientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "commercial_settlements_tenant_client_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.settledByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "commercial_settlements_tenant_settler_fk",
    }),
    unique("commercial_settlements_tenant_id_unique").on(table.tenantId, table.id),
    unique("commercial_settlements_one_per_booking").on(
      table.tenantId,
      table.bookingId,
    ),
    index("commercial_settlements_client_settled_idx").on(
      table.tenantId,
      table.clientUserId,
      table.settledAt,
    ),
    check(
      "commercial_settlements_attendance_non_negative",
      sql`${table.attendanceCount} >= 0`,
    ),
    check("commercial_settlements_held_non_negative", sql`${table.heldAmountMinor} >= 0`),
    check(
      "commercial_settlements_charge_non_negative",
      sql`${table.finalChargeAmountMinor} >= 0`,
    ),
    check(
      "commercial_settlements_release_non_negative",
      sql`${table.releasedAmountMinor} >= 0`,
    ),
  ],
);

export const commercialNoShowDecisionsTable = pgTable(
  "commercial_no_show_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull(),
    clientUserId: uuid("client_user_id").notNull(),
    heldAmountMinor: integer("held_amount_minor").notNull(),
    selectedChargeAmountMinor: integer("selected_charge_amount_minor").notNull(),
    releasedAmountMinor: integer("released_amount_minor").notNull(),
    waived: boolean("waived").notNull(),
    actorUserId: uuid("actor_user_id").notNull(),
    note: text("note"),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.bookingId],
      foreignColumns: [bookingsTable.tenantId, bookingsTable.id],
      name: "commercial_no_show_decisions_tenant_booking_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.clientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "commercial_no_show_decisions_tenant_client_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.actorUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "commercial_no_show_decisions_tenant_actor_fk",
    }),
    unique("commercial_no_show_decisions_tenant_id_unique").on(
      table.tenantId,
      table.id,
    ),
    unique("commercial_no_show_decisions_one_per_booking").on(
      table.tenantId,
      table.bookingId,
    ),
    check(
      "commercial_no_show_decisions_held_non_negative",
      sql`${table.heldAmountMinor} >= 0`,
    ),
    check(
      "commercial_no_show_decisions_charge_non_negative",
      sql`${table.selectedChargeAmountMinor} >= 0`,
    ),
    check(
      "commercial_no_show_decisions_release_non_negative",
      sql`${table.releasedAmountMinor} >= 0`,
    ),
  ],
);

export type PricingPlan = typeof pricingPlansTable.$inferSelect;
export type PricingRate = typeof pricingRatesTable.$inferSelect;
export type ClientPricingAssignment =
  typeof clientPricingAssignmentsTable.$inferSelect;
export type TrainingValueLedgerEntry = typeof trainingValueLedgerTable.$inferSelect;
export type BookingCommercial = typeof bookingCommercialsTable.$inferSelect;
export type CommercialSettlement = typeof commercialSettlementsTable.$inferSelect;
export type CommercialNoShowDecision =
  typeof commercialNoShowDecisionsTable.$inferSelect;