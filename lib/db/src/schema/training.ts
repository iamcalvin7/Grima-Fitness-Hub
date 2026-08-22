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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const trainingSessionStatusEnum = pgEnum("training_session_status", [
  "scheduled",
  "cancelled",
  "completed",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "rescheduled",
  "attended",
  "no_show",
]);

export const trainingLocationsTable = pgTable(
  "training_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("Europe/Malta"),
    addressDetails: text("address_details"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("training_locations_tenant_id_unique").on(table.tenantId, table.id),
    index("training_locations_tenant_idx").on(table.tenantId),
    index("training_locations_active_idx").on(table.tenantId, table.isActive),
  ],
);

export const trainingSessionTypesTable = pgTable(
  "training_session_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    defaultCapacity: integer("default_capacity").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("training_session_types_tenant_id_unique").on(table.tenantId, table.id),
    index("training_session_types_tenant_idx").on(table.tenantId),
    index("training_session_types_active_idx").on(table.tenantId, table.isActive),
    check(
      "training_session_types_duration_positive",
      sql`${table.durationMinutes} > 0`,
    ),
    check(
      "training_session_types_capacity_positive",
      sql`${table.defaultCapacity} > 0`,
    ),
  ],
);

export const trainingSessionsTable = pgTable(
  "training_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    sessionTypeId: uuid("session_type_id"),
    locationId: uuid("location_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    capacity: integer("capacity").notNull(),
    status: trainingSessionStatusEnum("status").notNull().default("scheduled"),
    commercialClosedAt: timestamp("commercial_closed_at", {
      withTimezone: true,
      mode: "date",
    }),
    commercialClosedParticipantCount: integer(
      "commercial_closed_participant_count",
    ),
    marcusNotes: text("marcus_notes"),
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
      columns: [table.tenantId, table.sessionTypeId],
      foreignColumns: [trainingSessionTypesTable.tenantId, trainingSessionTypesTable.id],
      name: "training_sessions_tenant_session_type_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.locationId],
      foreignColumns: [trainingLocationsTable.tenantId, trainingLocationsTable.id],
      name: "training_sessions_tenant_location_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "training_sessions_tenant_creator_fk",
    }),
    index("training_sessions_tenant_start_idx").on(table.tenantId, table.startsAt),
    index("training_sessions_status_start_idx").on(table.status, table.startsAt),
    unique("training_sessions_tenant_id_unique").on(table.tenantId, table.id),
    check("training_sessions_capacity_positive", sql`${table.capacity} > 0`),
    check("training_sessions_end_after_start", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "training_sessions_closed_participant_non_negative",
      sql`${table.commercialClosedParticipantCount} is null or ${table.commercialClosedParticipantCount} >= 0`,
    ),
  ],
);

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    trainingSessionId: uuid("training_session_id").notNull(),
    clientUserId: uuid("client_user_id").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    cancellationReason: text("cancellation_reason"),
    rejectionReason: text("rejection_reason"),
    rescheduledFromBookingId: uuid("rescheduled_from_booking_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    attendanceAt: timestamp("attendance_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.trainingSessionId],
      foreignColumns: [trainingSessionsTable.tenantId, trainingSessionsTable.id],
      name: "bookings_tenant_training_session_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.clientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "bookings_tenant_client_fk",
    }),
    unique("bookings_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.rescheduledFromBookingId],
      foreignColumns: [table.id],
      name: "bookings_rescheduled_from_fk",
    }),
    index("bookings_tenant_idx").on(table.tenantId),
    index("bookings_session_status_idx").on(table.trainingSessionId, table.status),
    index("bookings_client_created_idx").on(table.clientUserId, table.createdAt),
    uniqueIndex("bookings_tenant_client_idempotency_unique").on(
      table.tenantId,
      table.clientUserId,
      table.idempotencyKey,
    ),
    uniqueIndex("bookings_active_client_session_unique")
      .on(table.tenantId, table.clientUserId, table.trainingSessionId)
      .where(sql`${table.status} in ('pending', 'confirmed')`),
  ],
);

export type TrainingLocation = typeof trainingLocationsTable.$inferSelect;
export type NewTrainingLocation = typeof trainingLocationsTable.$inferInsert;
export type TrainingSessionType = typeof trainingSessionTypesTable.$inferSelect;
export type NewTrainingSessionType = typeof trainingSessionTypesTable.$inferInsert;
export type TrainingSession = typeof trainingSessionsTable.$inferSelect;
export type NewTrainingSession = typeof trainingSessionsTable.$inferInsert;
export type Booking = typeof bookingsTable.$inferSelect;
export type NewBooking = typeof bookingsTable.$inferInsert;
export type TrainingSessionStatus = TrainingSession["status"];
export type BookingStatus = Booking["status"];
