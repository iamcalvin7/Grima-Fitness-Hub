/**
 * promote-admin — Safe Marcus provisioning tool
 *
 * Promotes one user to the "admin" role in one atomic database transaction
 * that also writes a provisioning audit record.
 *
 * Usage (dry-run — default, no changes made):
 *   pnpm --filter @workspace/scripts run promote-admin -- \
 *     --email marcus@example.com --confirm marcus@example.com
 *
 * Usage (apply):
 *   pnpm --filter @workspace/scripts run promote-admin -- \
 *     --email marcus@example.com --confirm marcus@example.com --apply
 *
 * Safety guarantees:
 *   - Dry-run by default. --apply flag is required to make changes.
 *   - --confirm must match the target identifier exactly.
 *   - Refuses if a DIFFERENT admin already exists (idempotent for same user).
 *   - Never accepts passwords or secrets via arguments.
 *   - No public HTTP endpoint — this file is a CLI script only.
 *   - Role update and audit write are in a single transaction: either both
 *     commit or both roll back.
 */

import { and, eq, ne } from "drizzle-orm";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import type { User } from "@workspace/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromoteAdminOptions {
  /** Target user email address. */
  email?: string;
  /** Target user UUID (alternative to email). */
  userId?: string;
  /** Must match email (or userId) exactly — prevents accidental promotion. */
  confirm: string;
  /** When false (default), performs a dry-run without committing changes. */
  apply: boolean;
}

export type PromoteResult =
  | {
      status: "dry-run";
      targetId: string;
      targetEmail: string;
      targetName: string;
      message: string;
    }
  | {
      status: "already-admin";
      targetId: string;
      targetEmail: string;
      message: string;
    }
  | {
      status: "promoted";
      targetId: string;
      targetEmail: string;
      message: string;
    }
  | { status: "refused"; reason: string };

/**
 * Minimal database interface required by promoteAdmin.
 * Matches the Drizzle node-postgres db instance — extracted for testability.
 */
export interface PromotionDb {
  select: typeof db.select;
  transaction: typeof db.transaction;
}

// ---------------------------------------------------------------------------
// Core business logic (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Validate options and (when apply=true) atomically promote the target user.
 *
 * Does NOT read passwords, secrets, or env vars from options.
 * All user identity information comes from the DB query — not from options.
 *
 * @param dbClient - Drizzle db instance (injectable for tests).
 * @param options  - CLI / caller options.
 */
export async function promoteAdmin(
  dbClient: PromotionDb,
  options: PromoteAdminOptions,
): Promise<PromoteResult> {
  const { email, userId: targetUserId, confirm, apply } = options;

  // ── Require exactly one identifier ──────────────────────────────────────
  if (!email && !targetUserId) {
    return { status: "refused", reason: "Provide --email or --userId." };
  }
  if (email && targetUserId) {
    return {
      status: "refused",
      reason: "Provide either --email or --userId, not both.",
    };
  }

  // ── Require confirmation ─────────────────────────────────────────────────
  const identifier = (email ?? targetUserId)!;
  if (!confirm || confirm !== identifier) {
    return {
      status: "refused",
      reason: `--confirm value does not match the target identifier "${identifier}".`,
    };
  }

  // ── Find target user ─────────────────────────────────────────────────────
  let targetRows: User[];
  if (email) {
    targetRows = await (dbClient
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim())) as unknown as Promise<User[]>);
  } else {
    targetRows = await (dbClient
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId!)) as unknown as Promise<User[]>);
  }

  if (targetRows.length === 0) {
    return {
      status: "refused",
      reason: `No user found matching "${identifier}".`,
    };
  }
  if (targetRows.length > 1) {
    // Should not happen due to unique email constraint, but guard anyway.
    return {
      status: "refused",
      reason: `Ambiguous result: ${targetRows.length} users matched "${identifier}".`,
    };
  }

  const target = targetRows[0];

  // ── Idempotency: already admin ────────────────────────────────────────────
  if (target.role === "admin") {
    return {
      status: "already-admin",
      targetId: target.id,
      targetEmail: target.email,
      message: `User "${target.email}" is already admin. No changes made.`,
    };
  }

  // ── Refuse if a DIFFERENT admin already exists ────────────────────────────
  const otherAdmins = await (dbClient
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "admin"),
        ne(usersTable.id, target.id),
        eq(usersTable.tenantId, target.tenantId),
      ),
    ) as unknown as Promise<Pick<User, "id" | "email">[]>);

  if (otherAdmins.length > 0) {
    return {
      status: "refused",
      reason:
        `Another admin already exists (${otherAdmins[0].email}). ` +
        `Only one admin account is supported. No changes made.`,
    };
  }

  // ── Dry-run ───────────────────────────────────────────────────────────────
  if (!apply) {
    return {
      status: "dry-run",
      targetId: target.id,
      targetEmail: target.email,
      targetName: `${target.firstName} ${target.lastName}`,
      message:
        `DRY-RUN: Would promote "${target.email}" ` +
        `(${target.firstName} ${target.lastName}, current role: ${target.role}) to admin. ` +
        `Re-run with --apply to commit.`,
    };
  }

  // ── Apply: atomic role update + audit write ───────────────────────────────
  // `tx` is a Drizzle PgTransaction — its type is inferred from dbClient.transaction.
  await dbClient.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(usersTable.id, target.id));

    await tx.insert(auditLogsTable).values({
      tenantId: target.tenantId,
      actorType: "cli",
      // actorId omitted → drizzle inserts NULL (CLI has no associated user row)
      action: "user:promote_admin",
      targetType: "user",
      targetId: target.id,
      metadata: {
        targetEmail: target.email,
        previousRole: target.role,
        // Never include: passwords, tokens, secrets, signed URLs.
      },
    });
  });

  return {
    status: "promoted",
    targetId: target.id,
    targetEmail: target.email,
    message: `SUCCESS: "${target.email}" promoted to admin. Audit record written.`,
  };
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): PromoteAdminOptions {
  const args = argv.slice(2); // strip node + script path
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
  };

  return {
    email: get("--email"),
    userId: get("--userId") ?? get("--id"),
    confirm: get("--confirm") ?? "",
    apply: args.includes("--apply"),
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

// Only runs when executed directly as a script (not when imported in tests).
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  new URL(import.meta.url).pathname === process.argv[1]
) {
  const options = parseArgs(process.argv);
  promoteAdmin(db as unknown as PromotionDb, options)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === "refused" ? 1 : 0);
    })
    .catch((err: unknown) => {
      console.error("Fatal error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
