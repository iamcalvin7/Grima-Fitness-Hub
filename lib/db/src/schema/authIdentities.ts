import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Linked sign-in identities (OAuth providers).
 *
 * A user signs in either with the password on `users.password_hash` (which is
 * nullable — OAuth-only accounts have none) or through one of these linked
 * identities. Adding a provider (e.g. Apple) is a new `provider` value, not a
 * schema change.
 *
 * Linking rules (documented in docs/AUTH.md):
 * - (provider, providerUserId) is globally unique — one identity, one user.
 * - An identity is auto-linked to an existing account only when the provider
 *   asserts verified ownership of the same email address.
 */
export const authIdentitiesTable = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'google' | 'apple' | ...
    providerUserId: text("provider_user_id").notNull(), // OIDC `sub`
    email: text("email"), // email asserted by the provider at link time
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_unique").on(
      table.provider,
      table.providerUserId,
    ),
    index("auth_identities_user_id_idx").on(table.userId),
  ],
);

export type AuthIdentity = typeof authIdentitiesTable.$inferSelect;
export type NewAuthIdentity = typeof authIdentitiesTable.$inferInsert;
