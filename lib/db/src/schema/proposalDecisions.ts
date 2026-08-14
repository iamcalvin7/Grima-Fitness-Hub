import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

/** Custom decision questions added to the proposal Decisions tab. */
export const proposalDecisionsTable = pgTable("proposal_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type ProposalDecision = typeof proposalDecisionsTable.$inferSelect;
