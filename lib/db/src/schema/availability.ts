import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import {
  trainingLocationsTable,
  trainingSessionTypesTable,
  trainingSessionsTable,
} from "./training";

export const availabilityExceptionKindEnum = pgEnum(
  "availability_exception_kind",
  ["unavailable", "override", "additional"],
);

export const availabilityOccurrenceResolutionEnum = pgEnum(
  "availability_occurrence_resolution",
  ["generated", "suppressed", "dst_skipped", "conflict"],
);

export const recurringAvailabilityRulesTable = pgTable(
  "recurring_availability_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id").notNull(),
    locationId: uuid("location_id").notNull(),
    sessionTypeId: uuid("session_type_id").notNull(),
    weekday: integer("weekday").notNull(),
    startsLocalTime: text("starts_local_time").notNull(),
    endsLocalTime: text("ends_local_time").notNull(),
    slotIntervalMinutes: integer("slot_interval_minutes"),
    capacityOverride: integer("capacity_override"),
    effectiveFrom: text("effective_from").notNull(),
    effectiveUntil: text("effective_until"),
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
      columns: [table.tenantId, table.ownerUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "recurring_availability_rules_tenant_owner_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "recurring_availability_rules_tenant_creator_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.locationId],
      foreignColumns: [trainingLocationsTable.tenantId, trainingLocationsTable.id],
      name: "recurring_availability_rules_tenant_location_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.sessionTypeId],
      foreignColumns: [
        trainingSessionTypesTable.tenantId,
        trainingSessionTypesTable.id,
      ],
      name: "recurring_availability_rules_tenant_type_fk",
    }),
    unique("recurring_availability_rules_tenant_id_unique").on(
      table.tenantId,
      table.id,
    ),
    index("recurring_availability_rules_tenant_active_idx").on(
      table.tenantId,
      table.isActive,
    ),
    index("recurring_availability_rules_owner_idx").on(
      table.tenantId,
      table.ownerUserId,
      table.weekday,
    ),
    check(
      "recurring_availability_rules_weekday_valid",
      sql`${table.weekday} between 1 and 7`,
    ),
    check(
      "recurring_availability_rules_interval_positive",
      sql`${table.slotIntervalMinutes} is null or ${table.slotIntervalMinutes} > 0`,
    ),
    check(
      "recurring_availability_rules_capacity_positive",
      sql`${table.capacityOverride} is null or ${table.capacityOverride} > 0`,
    ),
  ],
);

export const availabilityExceptionsTable = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    availabilityRuleId: uuid("availability_rule_id"),
    ownerUserId: uuid("owner_user_id").notNull(),
    locationId: uuid("location_id").notNull(),
    sessionTypeId: uuid("session_type_id").notNull(),
    exceptionDate: text("exception_date").notNull(),
    kind: availabilityExceptionKindEnum("kind").notNull(),
    startsLocalTime: text("starts_local_time"),
    endsLocalTime: text("ends_local_time"),
    capacityOverride: integer("capacity_override"),
    reason: text("reason"),
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
      columns: [table.tenantId, table.availabilityRuleId],
      foreignColumns: [
        recurringAvailabilityRulesTable.tenantId,
        recurringAvailabilityRulesTable.id,
      ],
      name: "availability_exceptions_tenant_rule_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.ownerUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "availability_exceptions_tenant_owner_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "availability_exceptions_tenant_creator_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.locationId],
      foreignColumns: [trainingLocationsTable.tenantId, trainingLocationsTable.id],
      name: "availability_exceptions_tenant_location_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.sessionTypeId],
      foreignColumns: [
        trainingSessionTypesTable.tenantId,
        trainingSessionTypesTable.id,
      ],
      name: "availability_exceptions_tenant_type_fk",
    }),
    unique("availability_exceptions_tenant_id_unique").on(table.tenantId, table.id),
    index("availability_exceptions_tenant_date_idx").on(
      table.tenantId,
      table.exceptionDate,
    ),
    check(
      "availability_exceptions_capacity_positive",
      sql`${table.capacityOverride} is null or ${table.capacityOverride} > 0`,
    ),
  ],
);

export const availabilityOccurrencesTable = pgTable(
  "availability_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    availabilityRuleId: uuid("availability_rule_id").notNull(),
    localDate: text("local_date").notNull(),
    localStartTime: text("local_start_time").notNull(),
    timezone: text("timezone").notNull(),
    resolvedStartsAt: timestamp("resolved_starts_at", {
      withTimezone: true,
      mode: "date",
    }),
    resolvedEndsAt: timestamp("resolved_ends_at", {
      withTimezone: true,
      mode: "date",
    }),
    trainingSessionId: uuid("training_session_id"),
    exceptionId: uuid("exception_id"),
    resolution: availabilityOccurrenceResolutionEnum("resolution").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.availabilityRuleId],
      foreignColumns: [
        recurringAvailabilityRulesTable.tenantId,
        recurringAvailabilityRulesTable.id,
      ],
      name: "availability_occurrences_tenant_rule_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.trainingSessionId],
      foreignColumns: [trainingSessionsTable.tenantId, trainingSessionsTable.id],
      name: "availability_occurrences_tenant_session_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.exceptionId],
      foreignColumns: [availabilityExceptionsTable.tenantId, availabilityExceptionsTable.id],
      name: "availability_occurrences_tenant_exception_fk",
    }),
    unique("availability_occurrences_tenant_id_unique").on(table.tenantId, table.id),
    unique("availability_occurrences_tenant_rule_slot_unique").on(
      table.tenantId,
      table.availabilityRuleId,
      table.localDate,
      table.localStartTime,
    ),
    unique("availability_occurrences_tenant_session_unique").on(
      table.tenantId,
      table.trainingSessionId,
    ),
    index("availability_occurrences_tenant_date_idx").on(
      table.tenantId,
      table.localDate,
    ),
  ],
);

export type RecurringAvailabilityRule =
  typeof recurringAvailabilityRulesTable.$inferSelect;
export type NewRecurringAvailabilityRule =
  typeof recurringAvailabilityRulesTable.$inferInsert;
export type AvailabilityException = typeof availabilityExceptionsTable.$inferSelect;
export type NewAvailabilityException =
  typeof availabilityExceptionsTable.$inferInsert;
export type AvailabilityOccurrence =
  typeof availabilityOccurrencesTable.$inferSelect;
export type NewAvailabilityOccurrence =
  typeof availabilityOccurrencesTable.$inferInsert;