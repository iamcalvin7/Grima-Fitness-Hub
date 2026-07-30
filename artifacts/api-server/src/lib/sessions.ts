import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";

export const SESSION_COOKIE = "mg_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Opaque token given to the client; only its SHA-256 hash is stored. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | undefined; ipAddress?: string | undefined },
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({
    userId,
    tokenHash: hashSessionToken(token),
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

/** Resolve a session token to its user, touching lastUsedAt. Returns null when invalid/expired. */
export async function getSessionUser(token: string): Promise<User | null> {
  const tokenHash = hashSessionToken(token);
  const rows = await db
    .select({ user: usersTable, sessionId: sessionsTable.id })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.tokenHash, tokenHash),
        gt(sessionsTable.expiresAt, new Date()),
        eq(usersTable.isActive, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  void db
    .update(sessionsTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessionsTable.id, row.sessionId))
    .catch(() => {});

  return row.user;
}

/** Revoke every session for a user, optionally keeping one token active. */
export async function revokeAllSessions(
  userId: string,
  exceptToken?: string,
): Promise<void> {
  const conditions = [eq(sessionsTable.userId, userId)];
  if (exceptToken) {
    conditions.push(ne(sessionsTable.tokenHash, hashSessionToken(exceptToken)));
  }
  await db.delete(sessionsTable).where(and(...conditions));
}

export async function revokeSession(token: string): Promise<void> {
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.tokenHash, hashSessionToken(token)));
}

/** Housekeeping: remove expired sessions. */
export async function deleteExpiredSessions(): Promise<void> {
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}
