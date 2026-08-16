import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

/**
 * Actor type enum for audit log entries.
 *
 * user   — an authenticated application user (identified by actorId)
 * system — the application itself (e.g. background jobs, seeding)
 * cli    — a development/ops CLI script (e.g. the promote-admin tool)
 */
export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "user",
  "system",
  "cli",
]);

/**
 * Append-only audit log.
 *
 * Design guarantees:
 *   - No updatedAt column — records are immutable by schema contract.
 *   - No public create/update/delete API. The only writer is writeAuditLog().
 *   - Actor identity is always server-derived (userId from session / cli input
 *     confirmed against the DB) — never caller-supplied.
 *   - metadata must never contain secrets, tokens, signed URLs, or
 *     unnecessary personal data. Callers are responsible for sanitising.
 *   - tenantId is required — ensures records are always tenant-scoped.
 *     The NOT NULL constraint is the enforcement mechanism.
 */
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /** The tenant this audit record belongs to. Always required. */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),

    /** Who performed the action. */
    actorType: auditActorTypeEnum("actor_type").notNull(),

    /**
     * The user ID of the actor.
     * Null for system or cli actors that have no associated user row.
     * ON DELETE SET NULL preserves the audit record if the user is deleted.
     */
    actorId: uuid("actor_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),

    /**
     * Short, stable, dot-separated action identifier.
     * Convention: <resource>:<verb>  e.g. "content:create", "user:promote_admin"
     */
    action: text("action").notNull(),

    /** The type of resource that was affected. e.g. "content_post", "user" */
    targetType: text("target_type").notNull(),

    /** The identifier of the affected resource. May be null for bulk actions. */
    targetId: text("target_id"),

    /**
     * Optional sanitised context for the action.
     * Must NOT contain: passwords, tokens, signed URLs, full PII beyond IDs.
     */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    /** Immutable creation timestamp — the only timestamp on this table. */
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_tenant_idx").on(table.tenantId),
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_target_type_id_idx").on(
      table.targetType,
      table.targetId,
    ),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type NewAuditLog = typeof auditLogsTable.$inferInsert;
export type AuditActorType = AuditLog["actorType"];
