import {
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
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { exercisesTable } from "./exercises";

export const programmeLifecycleEnum = pgEnum("programme_lifecycle", [
  "draft",
  "published",
  "archived",
]);

export const programmeTemplatesTable = pgTable(
  "programme_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    status: programmeLifecycleEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    currentDraftRevisionId: uuid("current_draft_revision_id"),
    currentPublishedRevisionId: uuid("current_published_revision_id"),
    createdByUserId: uuid("created_by_user_id").notNull(),
    updatedByUserId: uuid("updated_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("programme_templates_tenant_id_unique").on(table.tenantId, table.id),
    unique("programme_templates_tenant_slug_unique").on(table.tenantId, table.slug),
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "programme_templates_tenant_creator_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.updatedByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "programme_templates_tenant_updater_fk",
    }),
    index("programme_templates_tenant_status_idx").on(table.tenantId, table.status),
    check("programme_templates_version_positive", sql`${table.version} > 0`),
    check("programme_templates_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  ],
);

export const programmeRevisionsTable = pgTable(
  "programme_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    status: programmeLifecycleEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    difficulty: text("difficulty"),
    goal: text("goal"),
    sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.templateId],
      foreignColumns: [programmeTemplatesTable.tenantId, programmeTemplatesTable.id],
      name: "programme_revisions_tenant_template_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "programme_revisions_tenant_creator_fk",
    }),
    unique("programme_revisions_template_number_unique").on(table.templateId, table.revisionNumber),
    unique("programme_revisions_tenant_id_unique").on(table.tenantId, table.id),
    index("programme_revisions_tenant_status_idx").on(table.tenantId, table.status),
    check("programme_revisions_number_positive", sql`${table.revisionNumber} > 0`),
    check("programme_revisions_version_positive", sql`${table.version} > 0`),
  ],
);

export const programmeDaysTable = pgTable(
  "programme_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").notNull(),
    dayNumber: integer("day_number").notNull(),
    name: text("name").notNull(),
    estimatedMinutes: integer("estimated_minutes"),
    sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.revisionId],
      foreignColumns: [programmeRevisionsTable.tenantId, programmeRevisionsTable.id],
      name: "programme_days_tenant_revision_fk",
    }).onDelete("cascade"),
    unique("programme_days_revision_number_unique").on(table.revisionId, table.dayNumber),
    unique("programme_days_tenant_id_unique").on(table.tenantId, table.id),
    index("programme_days_revision_idx").on(table.tenantId, table.revisionId, table.dayNumber),
    check("programme_days_number_positive", sql`${table.dayNumber} > 0`),
    check(
      "programme_days_minutes_bounds",
      sql`${table.estimatedMinutes} is null or (${table.estimatedMinutes} > 0 and ${table.estimatedMinutes} <= 1440)`,
    ),
  ],
);

export const programmeExercisePrescriptionsTable = pgTable(
  "programme_exercise_prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    dayId: uuid("day_id").notNull(),
    exerciseId: uuid("exercise_id").notNull(),
    position: integer("position").notNull(),
    sets: integer("sets").notNull(),
    reps: text("reps").notNull(),
    restSeconds: integer("rest_seconds"),
    notes: text("notes"),
    sourceExerciseId: text("source_exercise_id"),
    sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.dayId],
      foreignColumns: [programmeDaysTable.tenantId, programmeDaysTable.id],
      name: "programme_prescriptions_tenant_day_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tenantId, table.exerciseId],
      foreignColumns: [exercisesTable.tenantId, exercisesTable.id],
      name: "programme_prescriptions_tenant_exercise_fk",
    }).onDelete("restrict"),
    unique("programme_prescriptions_day_position_unique").on(table.dayId, table.position),
    unique("programme_prescriptions_tenant_id_unique").on(table.tenantId, table.id),
    index("programme_prescriptions_day_idx").on(table.tenantId, table.dayId, table.position),
    check("programme_prescriptions_position_positive", sql`${table.position} > 0`),
    check("programme_prescriptions_sets_positive", sql`${table.sets} > 0`),
    check("programme_prescriptions_rest_bounds", sql`${table.restSeconds} is null or (${table.restSeconds} >= 0 and ${table.restSeconds} <= 3600)`),
  ],
);

export type ProgrammeTemplate = typeof programmeTemplatesTable.$inferSelect;
export type NewProgrammeTemplate = typeof programmeTemplatesTable.$inferInsert;
export type ProgrammeRevision = typeof programmeRevisionsTable.$inferSelect;
export type ProgrammeDay = typeof programmeDaysTable.$inferSelect;
export type ProgrammeExercisePrescription = typeof programmeExercisePrescriptionsTable.$inferSelect;
export type ProgrammeLifecycle = ProgrammeTemplate["status"];