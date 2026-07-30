import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  authIdentitiesTable,
} from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  SESSION_COOKIE,
  hashSessionToken,
  revokeAllSessions,
} from "../lib/sessions";
import { attachUser, requireAuth } from "../middlewares/auth";
import { rateLimit } from "../lib/rateLimit";
import { createVerificationToken } from "../lib/tokens";
import { sendEmailSafely } from "../lib/email";
import { emailChangeEmail } from "../lib/emailTemplates";
import { getDefaultTenant } from "../lib/tenant";
import { EMAIL_RE, MIN_PASSWORD_LENGTH } from "./auth";

const router: IRouter = Router();

router.use("/account", attachUser, requireAuth);

/**
 * Verify the caller's password. For OAuth-only accounts (no password) this
 * always fails with a uniform-timing dummy hash — such accounts must use
 * their provider or set a password first.
 */
async function verifyCurrentPassword(
  passwordHash: string | null,
  password: unknown,
): Promise<boolean> {
  if (typeof password !== "string" || password.length === 0) return false;
  if (!passwordHash) {
    await hashPassword(password); // uniform timing
    return false;
  }
  return verifyPassword(password, passwordHash);
}

/* ── Security overview ─────────────────────────────────────────────────── */

router.get("/account/security", async (req, res) => {
  const user = req.user!;
  const identities = await db
    .select({
      id: authIdentitiesTable.id,
      provider: authIdentitiesTable.provider,
      email: authIdentitiesTable.email,
      createdAt: authIdentitiesTable.createdAt,
    })
    .from(authIdentitiesTable)
    .where(eq(authIdentitiesTable.userId, user.id));
  res.json({
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    identities,
  });
});

/* ── Change / set password ─────────────────────────────────────────────── */

router.patch(
  "/account/password",
  rateLimit({ name: "chg-pass", max: 10, windowMs: 15 * 60_000, keyFn: (req) => req.user?.id ?? req.ip ?? "?" }),
  async (req, res) => {
    const user = req.user!;
    const { currentPassword, newPassword } = (req.body ?? {}) as Record<string, unknown>;

    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({
        error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
      return;
    }

    if (user.passwordHash) {
      // Change: current password is required.
      if (!(await verifyCurrentPassword(user.passwordHash, currentPassword))) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
    }
    // Set (OAuth-only account, no password yet): no current password needed —
    // the caller holds an authenticated session.

    const passwordHash = await hashPassword(newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));

    // Sensitive change: sign out every OTHER device; keep this session alive.
    const currentToken = req.sessionToken;
    await revokeAllSessions(user.id, currentToken);

    res.json({ message: "Password updated" });
  },
);

/* ── Change email (verification-gated) ─────────────────────────────────── */

const GENERIC_EMAIL_CHANGE =
  "If the new address is available, a confirmation email has been sent to it. Your email only changes after you confirm.";

router.post(
  "/account/email",
  rateLimit({ name: "chg-email", max: 5, windowMs: 15 * 60_000, keyFn: (req) => req.user?.id ?? req.ip ?? "?" }),
  async (req, res) => {
    const user = req.user!;
    const { password, newEmail } = (req.body ?? {}) as Record<string, unknown>;

    if (typeof newEmail !== "string" || !EMAIL_RE.test(newEmail.trim())) {
      res.status(400).json({ error: "A valid new email is required" });
      return;
    }

    // Identity check: password when one exists; otherwise the session itself
    // (OAuth-only) — provider re-auth would be the stricter future upgrade.
    if (user.passwordHash && !(await verifyCurrentPassword(user.passwordHash, password))) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const normalised = newEmail.trim().toLowerCase();
    if (normalised === user.email) {
      res.status(400).json({ error: "That is already your email address" });
      return;
    }

    const tenant = await getDefaultTenant();
    const clash = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.tenantId, tenant.id), eq(usersTable.email, normalised)))
      .limit(1);

    // Anti-enumeration: whether or not the address is taken, the caller gets
    // the same generic answer. The email is only sent when it's available.
    if (!clash[0]) {
      const token = await createVerificationToken(user.id, "email_change", normalised);
      sendEmailSafely(emailChangeEmail(normalised, token));
    }
    res.json({ message: GENERIC_EMAIL_CHANGE });
  },
);

/* ── Session management ────────────────────────────────────────────────── */

router.get("/account/sessions", async (req, res) => {
  const user = req.user!;
  const currentHash = req.sessionToken ? hashSessionToken(req.sessionToken) : null;
  const rows = await db
    .select({
      id: sessionsTable.id,
      tokenHash: sessionsTable.tokenHash,
      userAgent: sessionsTable.userAgent,
      ipAddress: sessionsTable.ipAddress,
      createdAt: sessionsTable.createdAt,
      lastUsedAt: sessionsTable.lastUsedAt,
      expiresAt: sessionsTable.expiresAt,
    })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, user.id));

  const sessions = rows
    .map((s) => ({
      id: s.id,
      current: s.tokenHash === currentHash,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) ||
      (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0));

  res.json({ sessions });
});

/** Log out everywhere else — the current session stays active. */
router.delete("/account/sessions", async (req, res) => {
  await revokeAllSessions(req.user!.id, req.sessionToken);
  res.json({ message: "Signed out of all other devices" });
});

router.delete("/account/sessions/:id", async (req, res) => {
  const user = req.user!;
  const currentHash = req.sessionToken ? hashSessionToken(req.sessionToken) : null;
  const rows = await db
    .select({ id: sessionsTable.id, tokenHash: sessionsTable.tokenHash })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, req.params.id as string), eq(sessionsTable.userId, user.id)))
    .limit(1);
  const target = rows[0];
  if (!target) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (target.tokenHash === currentHash) {
    res.status(400).json({ error: "Use sign out to end your current session" });
    return;
  }
  await db.delete(sessionsTable).where(eq(sessionsTable.id, target.id));
  res.json({ message: "Session revoked" });
});

/* ── Delete account ────────────────────────────────────────────────────── */

router.delete(
  "/account",
  rateLimit({ name: "del-acct", max: 5, windowMs: 15 * 60_000, keyFn: (req) => req.user?.id ?? req.ip ?? "?" }),
  async (req, res) => {
    const user = req.user!;
    const { password, confirm } = (req.body ?? {}) as Record<string, unknown>;

    // Deliberate confirmation: password for password accounts; the literal
    // string DELETE for OAuth-only accounts (no password to confirm with).
    if (user.passwordHash) {
      if (!(await verifyCurrentPassword(user.passwordHash, password))) {
        res.status(400).json({ error: "Password is incorrect" });
        return;
      }
    } else if (confirm !== "DELETE") {
      res.status(400).json({ error: 'Type "DELETE" to confirm' });
      return;
    }

    // Hard delete, documented: users FK cascades remove sessions, profile,
    // auth identities, and account tokens in one statement. There is no
    // deletedAt column in the current schema (soft delete is a future call).
    await db.delete(usersTable).where(eq(usersTable.id, user.id));

    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ message: "Account deleted" });
  },
);

export default router;
