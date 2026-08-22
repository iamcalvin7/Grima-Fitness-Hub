import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "trainer",
  "client",
]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, {
        onDelete: "cascade",
      }),
    email: text("email").notNull(),
    // Nullable: OAuth-only accounts (e.g. Google sign-in) have no password
    // until the user explicitly sets one from the Security screen.
    passwordHash: text("password_hash"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("client"),
    isActive: boolean("is_active").notNull().default(true),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_tenant_email_unique").on(
      table.tenantId,
      table.email,
    ),
    unique("users_id_tenant_unique").on(table.id, table.tenantId),
    index("users_tenant_id_idx").on(table.tenantId),
  ],
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type UserRole = User["role"];
