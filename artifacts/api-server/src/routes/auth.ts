import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  revokeSession,
} from "../lib/sessions";
import { getDefaultTenant } from "../lib/tenant";
import { attachUser, requireAuth } from "../middlewares/auth";

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

router.post("/auth/signup", async (req, res) => {
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

router.post("/auth/signin", async (req, res) => {
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
  // Verify against a dummy hash when the user is missing to keep timing uniform.
  const valid = user
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

router.post("/auth/signout", attachUser, async (req, res) => {
  if (req.sessionToken) await revokeSession(req.sessionToken);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", attachUser, requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

export default router;
