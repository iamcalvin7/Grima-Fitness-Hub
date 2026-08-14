import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

/**
 * Sprint assignment overrides for the proposal feature catalogue.
 * featureId is text so it can hold both hardcoded catalogue ids (e.g. "streaks")
 * and UUIDs of custom database-backed features.
 */
export const proposalSprintsTable = pgTable(
  "proposal_sprints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    featureId: text("feature_id").notNull(),
    sprint: integer("sprint").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("proposal_sprints_tenant_feature_idx").on(
      table.tenantId,
      table.featureId,
    ),
  ],
);

export type ProposalSprint = typeof proposalSprintsTable.$inferSelect;
