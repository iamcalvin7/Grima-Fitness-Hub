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

export const exerciseStatusEnum = pgEnum("exercise_status", [
  "draft",
  "active",
  "archived",
]);

export const exercisePerformanceTypeEnum = pgEnum("exercise_performance_type", [
  "weight_reps",
  "bodyweight_reps",
  "added_weight_reps",
  "assisted_reps",
  "duration",
  "distance_time",
]);

export const exerciseDifficultyEnum = pgEnum("exercise_difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const exerciseLateralityEnum = pgEnum("exercise_laterality", [
  "bilateral",
  "unilateral",
]);

export const exerciseMuscleRoleEnum = pgEnum("exercise_muscle_role", [
  "primary",
  "secondary",
]);

export const exercisesTable = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: exerciseStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    performanceType: exercisePerformanceTypeEnum("performance_type"),
    movementPattern: text("movement_pattern"),
    laterality: exerciseLateralityEnum("laterality"),
    description: text("description"),
    instructions: text("instructions"),
    difficulty: exerciseDifficultyEnum("difficulty"),
    defaultRestSeconds: integer("default_rest_seconds"),
    safetyNotes: text("safety_notes"),
    internalNotes: text("internal_notes"),
    mediaUrl: text("media_url"),
    createdByUserId: uuid("created_by_user_id").notNull(),
    updatedByUserId: uuid("updated_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("exercises_tenant_id_unique").on(table.tenantId, table.id),
    unique("exercises_tenant_slug_unique").on(table.tenantId, table.slug),
    foreignKey({
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "exercises_tenant_creator_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.updatedByUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "exercises_tenant_updater_fk",
    }),
    check(
      "exercises_default_rest_bounds",
      sql`${table.defaultRestSeconds} is null or (${table.defaultRestSeconds} > 0 and ${table.defaultRestSeconds} <= 3600)`,
    ),
    check("exercises_version_positive", sql`${table.version} > 0`),
    check("exercises_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    index("exercises_tenant_status_name_idx").on(
      table.tenantId,
      table.status,
      table.name,
    ),
    index("exercises_tenant_performance_idx").on(
      table.tenantId,
      table.performanceType,
    ),
    index("exercises_tenant_difficulty_idx").on(
      table.tenantId,
      table.difficulty,
    ),
  ],
);

export const exerciseMusclesTable = pgTable(
  "exercise_muscles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").notNull(),
    muscleKey: text("muscle_key").notNull(),
    role: exerciseMuscleRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.exerciseId],
      foreignColumns: [exercisesTable.tenantId, exercisesTable.id],
      name: "exercise_muscles_tenant_exercise_fk",
    }).onDelete("restrict"),
    unique("exercise_muscles_tenant_exercise_muscle_unique").on(
      table.tenantId,
      table.exerciseId,
      table.muscleKey,
    ),
    index("exercise_muscles_tenant_muscle_idx").on(
      table.tenantId,
      table.muscleKey,
    ),
    index("exercise_muscles_exercise_idx").on(table.tenantId, table.exerciseId),
    check("exercise_muscles_key_nonempty", sql`length(trim(${table.muscleKey})) > 0`),
    check(
      "exercise_muscles_key_valid",
      sql`${table.muscleKey} in ('chest', 'upper_chest', 'front_delts', 'side_delts', 'biceps', 'forearms', 'abs', 'obliques', 'quads', 'adductors', 'traps', 'rear_delts', 'lats', 'triceps', 'lower_back', 'glutes', 'hamstrings', 'calves')`,
    ),
  ],
);

export const exerciseEquipmentTable = pgTable(
  "exercise_equipment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").notNull(),
    equipmentKey: text("equipment_key").notNull(),
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.exerciseId],
      foreignColumns: [exercisesTable.tenantId, exercisesTable.id],
      name: "exercise_equipment_tenant_exercise_fk",
    }).onDelete("restrict"),
    unique("exercise_equipment_tenant_exercise_key_unique").on(
      table.tenantId,
      table.exerciseId,
      table.equipmentKey,
    ),
    index("exercise_equipment_tenant_key_idx").on(
      table.tenantId,
      table.equipmentKey,
    ),
    index("exercise_equipment_exercise_idx").on(table.tenantId, table.exerciseId),
    check(
      "exercise_equipment_key_nonempty",
      sql`length(trim(${table.equipmentKey})) > 0`,
    ),
    check(
      "exercise_equipment_key_format",
      sql`${table.equipmentKey} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'`,
    ),
  ],
);

export type Exercise = typeof exercisesTable.$inferSelect;
export type NewExercise = typeof exercisesTable.$inferInsert;
export type ExerciseMuscle = typeof exerciseMusclesTable.$inferSelect;
export type ExerciseEquipment = typeof exerciseEquipmentTable.$inferSelect;
export type ExerciseStatus = Exercise["status"];
export type ExercisePerformanceType = NonNullable<Exercise["performanceType"]>;
export type ExerciseDifficulty = NonNullable<Exercise["difficulty"]>;
export type ExerciseLaterality = NonNullable<Exercise["laterality"]>;
export type ExerciseMuscleRole = ExerciseMuscle["role"];