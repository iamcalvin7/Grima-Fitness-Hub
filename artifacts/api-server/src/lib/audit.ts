/**
 * Central audit-writing helper — Gate 2 Stage 1.
 *
 * Design contracts:
 *   - writeAuditLog() is the single entry-point for all audit writes.
 *   - No caller may insert directly into auditLogsTable.
 *   - Actor identity comes from the session (req.user) or the CLI; it is
 *     never accepted from the request body.
 *   - The helper accepts an optional Drizzle client so callers can participate
 *     in a transaction: the business mutation and the audit write share one
 *     atomic commit.
 *   - If the write fails, the error propagates — it is the caller's
 *     responsibility to decide whether to roll back the surrounding transaction.
 *     Swallowing audit failures is explicitly prohibited.
 *   - metadata must not contain: passwords, tokens, signed URLs, or
 *     unnecessary personal data. Callers are responsible.
 */

import { db, auditLogsTable } from "@workspace/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Structural type satisfied by both the top-level drizzle db instance
 * and any drizzle transaction object (both expose .insert() with identical
 * signature on the node-postgres driver).
 */
type AuditClient = Pick<typeof db, "insert">;

export interface AuditParams {
  /** Required — every audit record must be tenant-scoped. */
  tenantId: string;
  /** How the action was performed. */
  actorType: "user" | "system" | "cli";
  /** User UUID. Null for system/cli actors with no user row. */
  actorId: string | null;
  /**
   * Stable dot-separated action identifier.
   * Convention: <resource>:<verb>  e.g. "content:create", "user:promote_admin"
   */
  action: string;
  /** Resource type affected. e.g. "content_post", "user" */
  targetType: string;
  /** Resource identifier. Null for bulk/system actions. */
  targetId: string | null;
  /**
   * Optional sanitised context.
   * Do NOT include passwords, tokens, signed URLs, or unnecessary PII.
   */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Insert one immutable audit record.
 *
 * Pass `client` when calling from within a drizzle transaction so the audit
 * write is atomic with the business mutation:
 *
 *   await db.transaction(async (tx) => {
 *     await tx.insert(myTable).values(data);
 *     await writeAuditLog({ ... }, tx as AuditClient);
 *   });
 *
 * When called without `client`, the top-level db pool is used (the write is
 * committed independently of any surrounding business logic).
 *
 * Throws on failure — callers must NOT catch and discard audit errors.
 */
export async function writeAuditLog(
  params: AuditParams,
  client: AuditClient = db,
): Promise<void> {
  await client.insert(auditLogsTable).values({
    tenantId: params.tenantId,
    actorType: params.actorType,
    actorId: params.actorId ?? undefined,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId ?? undefined,
    metadata: params.metadata ?? undefined,
  });
}
