/**
 * Integration test harness — shared fixtures and utilities.
 *
 * Imports app (Express) and @workspace/db (whose pool already has the
 * search_path connect event from env-setup.ts). All DB operations performed
 * by this harness and by the app itself go to the isolated test schema.
 *
 * All fixtures use deterministic, isolated data:
 *   - No real users, sessions, or tenants are touched.
 *   - No production URL, secret, or credential is ever printed.
 */

import { createHash, randomBytes } from "node:crypto";
import { eq, and, count as sqlCount } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  tenantsTable,
  contentPostsTable,
  auditLogsTable,
  type User,
  type Tenant,
  type Session,
} from "@workspace/db";
import app from "../../app.js";

export { app };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { User, Tenant, Session };

// ---------------------------------------------------------------------------
// Session helpers (matches lib/sessions.ts)
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "mg_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}`;
}

// ---------------------------------------------------------------------------
// Fixture: tenant
// ---------------------------------------------------------------------------

/**
 * Create an isolated test tenant.
 *
 * Pass { slug: 'marcus-grima' } for the first call to seed the default
 * tenant (getDefaultTenant() will pick it up via its upsert logic).
 */
export async function createTenant(opts?: {
  name?: string;
  slug?: string;
}): Promise<Tenant> {
  const slug = opts?.slug ?? `test-tenant-${randomBytes(4).toString("hex")}`;
  const name = opts?.name ?? `Test Tenant ${slug}`;

  const [existing] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(tenantsTable)
    .values({ name, slug })
    .returning();
  if (!inserted) throw new Error(`Failed to create tenant "${slug}"`);
  return inserted;
}

// ---------------------------------------------------------------------------
// Fixture: user
// ---------------------------------------------------------------------------

export async function createUser(
  tenantId: string,
  opts?: {
    email?: string;
    role?: User["role"];
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
    passwordHash?: string | null;
  },
): Promise<User> {
  const email =
    opts?.email ??
    `test-${randomBytes(6).toString("hex")}@integ.local`;

  const [inserted] = await db
    .insert(usersTable)
    .values({
      tenantId,
      email,
      firstName: opts?.firstName ?? "Test",
      lastName: opts?.lastName ?? "User",
      role: opts?.role ?? "client",
      isActive: opts?.isActive ?? true,
      passwordHash: opts?.passwordHash ?? null,
    })
    .returning();

  if (!inserted) throw new Error(`Failed to create user "${email}"`);
  return inserted;
}

// ---------------------------------------------------------------------------
// Fixture: session
// ---------------------------------------------------------------------------

export async function createSession(
  userId: string,
): Promise<{ token: string; sessionId: string }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const [inserted] = await db
    .insert(sessionsTable)
    .values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    })
    .returning({ id: sessionsTable.id });

  if (!inserted) throw new Error("Failed to create session");
  return { token, sessionId: inserted.id };
}

// ---------------------------------------------------------------------------
// Fixture: content post
// ---------------------------------------------------------------------------

export async function createContent(
  tenantId: string,
  authorId: string,
  opts?: {
    title?: string;
    status?: "draft" | "published";
    type?: "article" | "video" | "image";
  },
): Promise<typeof contentPostsTable.$inferSelect> {
  const [inserted] = await db
    .insert(contentPostsTable)
    .values({
      tenantId,
      authorId,
      title: opts?.title ?? `Test Post ${randomBytes(4).toString("hex")}`,
      type: opts?.type ?? "article",
      status: opts?.status ?? "published",
      featured: false,
      publishDate: new Date(),
    })
    .returning();

  if (!inserted) throw new Error("Failed to create content post");
  return inserted;
}

// ---------------------------------------------------------------------------
// DB helpers for test verification
// ---------------------------------------------------------------------------

/** Directly change a user's role in the test schema. */
export async function setUserRole(
  userId: string,
  role: User["role"],
): Promise<void> {
  await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

/** Count audit log entries for a tenant, optionally filtered by action. */
export async function countAuditLogs(
  tenantId: string,
  action?: string,
): Promise<number> {
  const conditions = [eq(auditLogsTable.tenantId, tenantId)];
  if (action) conditions.push(eq(auditLogsTable.action, action));

  const [row] = await db
    .select({ n: sqlCount() })
    .from(auditLogsTable)
    .where(and(...conditions));

  return row?.n ?? 0;
}

/** Read all audit log entries for a tenant. */
export async function queryAuditLogs(tenantId: string) {
  return db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.tenantId, tenantId))
    .orderBy(auditLogsTable.createdAt);
}

/** Verify the DB search_path is set to the test schema (sanity guard). */
export async function verifySearchPath(): Promise<string> {
  const result = await db.$client.query<{ search_path: string }>(
    "SHOW search_path",
  );
  return result.rows[0]?.search_path ?? "";
}

/** Read the current role for a user directly from the DB. */
export async function getUserRole(userId: string): Promise<User["role"] | null> {
  const [row] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return row?.role ?? null;
}
