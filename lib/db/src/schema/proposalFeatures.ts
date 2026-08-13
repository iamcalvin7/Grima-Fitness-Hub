import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

/**
 * Custom features added to the project-proposal feature catalogue at runtime.
 * These are merged with the hardcoded catalogue on the client.
 */
export const proposalFeaturesTable = pgTable(
  "proposal_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    priority: text("priority").notNull().default("Medium"),
    phase: integer("phase").notNull().default(2),
    status: text("status").notNull().default("Planned"),
    tagline: text("tagline").notNull().default(""),
    what: text("what").notNull().default(""),
    memberBenefit: text("member_benefit").notNull().default(""),
    businessBenefit: text("business_benefit").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("proposal_features_tenant_idx").on(table.tenantId)],
);

export type ProposalFeature = typeof proposalFeaturesTable.$inferSelect;
export type NewProposalFeature = typeof proposalFeaturesTable.$inferInsert;
