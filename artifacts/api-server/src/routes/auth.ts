import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  revokeSession,
  revokeAllSessions,
} from "../lib/sessions";
import { getDefaultTenant } from "../lib/tenant";
import { attachUser, requireAuth } from "../middlewares/auth";
import { rateLimit } from "../lib/rateLimit";
import {
  createPasswordResetToken,
  createVerificationToken,
  findValidResetToken,
  findValidVerificationToken,
  consumeResetToken,
  consumeVerificationToken,
} from "../lib/tokens";
import { sendEmailSafely } from "../lib/email";
import { isDevelopmentOutsideDeployment } from "../lib/developmentEnvironment";
import {
  emailChangeEmail,
  emailVerificationEmail,
  passwordResetEmail,
} from "../lib/emailTemplates";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

function requestMeta(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip ?? undefined,
  };
}

router.post("/auth/signup", rateLimit({ name: "signup-ip", max: 10, windowMs: 15 * 60_000 }), async (req, res) => {
  const { email, password, firstName, lastName } = (req.body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
    return;
  }
  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim()
  ) {
    res.status(400).json({ error: "First and last name are required" });
    return;
  }

  const tenant = await getDefaultTenant();
  const normalisedEmail = email.trim().toLowerCase();

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.tenantId, tenant.id),
        eq(usersTable.email, normalisedEmail),
      ),
    )
    .limit(1);

  if (existing[0]) {
    // Generic response — do not confirm whether the email is registered.
    res.status(400).json({
      error: "Unable to create an account with these details",
    });
    return;
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(usersTable)
    .values({
      tenantId: tenant.id,
      email: normalisedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      lastLoginAt: new Date(),
    })
    .returning();

  const user = inserted[0];
  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  const { token } = await createSession(user.id, requestMeta(req));
  setSessionCookie(res, token);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/auth/signin", rateLimit({ name: "signin-ip", max: 20, windowMs: 15 * 60_000 }), async (req, res) => {
  const { email, password } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const tenant = await getDefaultTenant();
  const rows = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.tenantId, tenant.id),
        eq(usersTable.email, email.trim().toLowerCase()),
      ),
    )
    .limit(1);

  const user = rows[0];
  // Verify against a dummy hash when the user is missing or has no password
  // (OAuth-only account) to keep timing uniform and answers generic.
  const valid = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : (await hashPassword(password), false);

  if (!user || !valid || !user.isActive) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  const { token } = await createSession(user.id, requestMeta(req));
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

/**
 * Development-only Marcus admin sign-in.
 *
 * Identity is entirely server-owned: the request has no credential or
 * identity fields. The configured password is checked against every active
 * admin in the default tenant, and a session is issued only when exactly one
 * account matches.
 */
router.post("/auth/dev-signin/admin", async (req, res) => {
  if (!isDevelopmentOutsideDeployment()) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const adminPassword = process.env.MG_ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).json({ error: "Development admin sign-in unavailable" });
    return;
  }

  try {
    const tenant = await getDefaultTenant();
    const candidates = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.tenantId, tenant.id),
          eq(usersTable.role, "admin"),
          eq(usersTable.isActive, true),
        ),
      );

    const matches: User[] = [];
    for (const candidate of candidates) {
      if (!candidate.passwordHash) continue;
      try {
        if (await verifyPassword(adminPassword, candidate.passwordHash)) {
          matches.push(candidate);
        }
      } catch {
        // A malformed stored hash is a configuration failure, not a reason to
        // expose credential or account details to the caller.
        res.status(503).json({ error: "Development admin sign-in unavailable" });
        return;
      }
    }

    if (matches.length !== 1) {
      res.status(503).json({ error: "Development admin sign-in unavailable" });
      return;
    }

    const user = matches[0]!;
    const { token } = await createSession(user.id, requestMeta(req));
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch {
    res.status(503).json({ error: "Development admin sign-in unavailable" });
  }
});

router.post("/auth/signout", attachUser, async (req, res) => {
  if (req.sessionToken) await revokeSession(req.sessionToken);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", attachUser, requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

/* ─────────────────────────────────────────────────────────────────────────
   Password recovery & email verification.
   All request endpoints return the SAME generic response whether or not the
   account exists (anti-enumeration), and all tokens are stored hashed,
   single-use, and expiring.
──────────────────────────────────────────────────────────────────────── */

const GENERIC_FORGOT =
  "If an account exists for that email, a reset link has been sent.";

router.post(
  "/auth/forgot-password",
  rateLimit({ name: "forgot-ip", max: 5, windowMs: 15 * 60_000 }),
  async (req, res) => {
    const { email } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      // Still generic — invalid input gets the same shape of answer.
      res.json({ message: GENERIC_FORGOT });
      return;
    }
    const tenant = await getDefaultTenant();
    const rows = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.tenantId, tenant.id),
          eq(usersTable.email, email.trim().toLowerCase()),
        ),
      )
      .limit(1);
    const user = rows[0];
    if (user && user.isActive) {
      const token = await createPasswordResetToken(user.id);
      sendEmailSafely(passwordResetEmail(user.email, token));
    }
    res.json({ message: GENERIC_FORGOT });
  },
);

router.post(
  "/auth/reset-password",
  rateLimit({ name: "reset-ip", max: 10, windowMs: 15 * 60_000 }),
  async (req, res) => {
    const { token, password } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
      return;
    }
    const row =
      typeof token === "string" && token.length > 0
        ? await findValidResetToken(token)
        : null;
    if (!row || !(await consumeResetToken(row.id))) {
      // Expired, unknown, and already-used tokens all get the same answer.
      res.status(400).json({ error: "This reset link is invalid or has expired" });
      return;
    }
    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, row.userId));
    // Sensitive change: every session for this user is invalidated.
    await revokeAllSessions(row.userId);
    res.json({ message: "Password updated. Please sign in with your new password." });
  },
);

router.post(
  "/auth/send-verification",
  attachUser,
  requireAuth,
  rateLimit({ name: "send-verify", max: 3, windowMs: 15 * 60_000, keyFn: (req) => req.user?.id ?? req.ip ?? "?" }),
  async (req, res) => {
    const user = req.user!;
    if (user.emailVerifiedAt) {
      res.json({ message: "Email is already verified" });
      return;
    }
    const token = await createVerificationToken(user.id, "email_verify");
    sendEmailSafely(emailVerificationEmail(user.email, token));
    res.json({ message: "Verification email sent" });
  },
);

router.post(
  "/auth/verify-email",
  rateLimit({ name: "verify-ip", max: 10, windowMs: 15 * 60_000 }),
  async (req, res) => {
    const { token } = (req.body ?? {}) as Record<string, unknown>;
    const row =
      typeof token === "string" && token.length > 0
        ? await findValidVerificationToken(token)
        : null;
    if (!row || !(await consumeVerificationToken(row.id))) {
      res.status(400).json({ error: "This verification link is invalid or has expired" });
      return;
    }

    if (row.purpose === "email_change" && row.newEmail) {
      // Email switches only now, after verified ownership of the new address.
      const tenant = await getDefaultTenant();
      const clash = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.tenantId, tenant.id),
            eq(usersTable.email, row.newEmail),
          ),
        )
        .limit(1);
      if (clash[0] && clash[0].id !== row.userId) {
        // Address was taken between request and confirmation.
        res.status(400).json({ error: "This verification link is invalid or has expired" });
        return;
      }
      await db
        .update(usersTable)
        .set({
          email: row.newEmail,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, row.userId));
      // Sensitive change: sign out every session; user signs back in with the new email.
      await revokeAllSessions(row.userId);
      res.json({ message: "Email updated. Please sign in again.", emailChanged: true });
      return;
    }

    await db
      .update(usersTable)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, row.userId));
    res.json({ message: "Email verified", emailChanged: false });
  },
);

export { EMAIL_RE, MIN_PASSWORD_LENGTH, publicUser, setSessionCookie, requestMeta };
export default router;
