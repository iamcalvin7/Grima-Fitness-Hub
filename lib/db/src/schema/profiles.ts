import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Client profile — one per user (unique FK).
 *
 * Kept as a dedicated table rather than widening `users`:
 * `users` stays a lean auth/identity record (email, hash, role) shared by
 * all roles, while `profiles` holds client-specific fitness data that
 * trainers/admins don't need and that will grow (measurements, preferences).
 */
export const profilesTable = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: text("gender"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  goal: text("goal"),
  activityLevel: text("activity_level"),
  experienceLevel: text("experience_level"),
  avatarUrl: text("avatar_url"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type NewProfile = typeof profilesTable.$inferInsert;
