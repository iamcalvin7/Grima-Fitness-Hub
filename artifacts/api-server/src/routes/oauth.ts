import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, usersTable, authIdentitiesTable } from "@workspace/db";
import { createSession } from "../lib/sessions";
import { getDefaultTenant } from "../lib/tenant";
import { rateLimit } from "../lib/rateLimit";
import { logger } from "../lib/logger";
import { appBaseUrl } from "../lib/emailTemplates";
import { setSessionCookie, requestMeta } from "./auth";
import { emailDeliveryMode } from "../lib/email";

const router: IRouter = Router();

/**
 * Google OAuth (authorization-code + PKCE).
 *
 * Configuration-driven: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET secrets.
 * When absent, GET /api/auth/providers reports google:false and the app
 * shows email auth only — nothing breaks.
 *
 * Apple: modelled in auth_identities (provider='apple') but intentionally
 * disabled here until Apple Developer credentials exist. It is reported as
 * { apple: { enabled:false, reason } } so the UI can show it as "coming
 * soon" instead of a broken button.
 */

const OAUTH_STATE_COOKIE = "mg_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${appBaseUrl()}/api/auth/google/callback`;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** Signed-ish state cookie payload: state + PKCE verifier, short-lived. */
function setStateCookie(res: Response, payload: { state: string; verifier: string }) {
  res.cookie(OAUTH_STATE_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_TTL_MS,
    path: "/api/auth/google",
  });
}

function readStateCookie(req: Request): { state: string; verifier: string } | null {
  try {
    const raw = (req.cookies as Record<string, string>)[OAUTH_STATE_COOKIE];
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: unknown; verifier?: unknown };
    if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string") return null;
    return { state: parsed.state, verifier: parsed.verifier };
  } catch {
    return null;
  }
}

/* ── Provider discovery for the frontend ───────────────────────────────── */

router.get("/auth/providers", (_req, res) => {
  res.json({
    email: true,
    google: googleConfigured(),
    apple: {
      enabled: false,
      reason: "Awaiting Apple Developer Program credentials",
    },
    emailDelivery: emailDeliveryMode(),
  });
});

/* ── Start ─────────────────────────────────────────────────────────────── */

router.get(
  "/auth/google",
  rateLimit({ name: "oauth-start", max: 20, windowMs: 15 * 60_000 }),
  (req, res) => {
    if (!googleConfigured()) {
      res.redirect(`${appBaseUrl()}/?oauth_error=not_configured`);
      return;
    }
    const state = b64url(randomBytes(16));
    const verifier = b64url(randomBytes(32));
    const challenge = b64url(createHash("sha256").update(verifier).digest());
    setStateCookie(res, { state, verifier });

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  },
);

/* ── Callback ──────────────────────────────────────────────────────────── */

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

router.get("/auth/google/callback", async (req, res) => {
  const fail = (reason: string) => {
    logger.warn({ reason }, "google oauth callback rejected");
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth/google" });
    res.redirect(`${appBaseUrl()}/?oauth_error=google`);
  };

  try {
    if (!googleConfigured()) return fail("not_configured");

    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error) return fail(`provider_error:${error}`);

    const stored = readStateCookie(req);
    // State must match the value bound to this browser via the cookie (CSRF).
    if (!stored || !state || state !== stored.state) return fail("state_mismatch");
    if (!code) return fail("missing_code");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
        code_verifier: stored.verifier,
      }),
    });
    if (!tokenRes.ok) return fail(`token_exchange_${tokenRes.status}`);
    const tokens = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokens.access_token) return fail("no_access_token");

    // Userinfo straight from Google over TLS — authoritative for this flow.
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail(`userinfo_${infoRes.status}`);
    const info = (await infoRes.json()) as GoogleUserInfo;
    if (!info.sub) return fail("no_subject");

    const user = await resolveGoogleUser(info);
    if (!user) return fail("link_refused");

    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));
    const { token } = await createSession(user.id, requestMeta(req));
    setSessionCookie(res, token);
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth/google" });
    res.redirect(`${appBaseUrl()}/?oauth=success`);
  } catch (err) {
    logger.error({ err }, "google oauth callback failed");
    return fail("exception");
  }
});

/**
 * Identity resolution & linking rules (documented in docs/AUTH.md):
 * 1. Known identity (provider+sub)      → that user signs in.
 * 2. Unknown identity, email matches an
 *    existing account                   → link ONLY when Google asserts the
 *                                          email is verified; also marks the
 *                                          account email verified.
 * 3. Unknown identity, unverified email
 *    matching an existing account       → refuse (no silent takeover).
 * 4. No matching account                → create a passwordless user (+
 *                                          identity); email verified if
 *                                          Google says so.
 */
async function resolveGoogleUser(info: GoogleUserInfo) {
  const identityRows = await db
    .select()
    .from(authIdentitiesTable)
    .where(
      and(
        eq(authIdentitiesTable.provider, "google"),
        eq(authIdentitiesTable.providerUserId, info.sub),
      ),
    )
    .limit(1);

  if (identityRows[0]) {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, identityRows[0].userId))
      .limit(1);
    const user = users[0];
    return user && user.isActive ? user : null;
  }

  const email = info.email?.trim().toLowerCase();
  const tenant = await getDefaultTenant();

  if (email) {
    const existing = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.tenantId, tenant.id), eq(usersTable.email, email)))
      .limit(1);
    const user = existing[0];
    if (user) {
      if (!info.email_verified || !user.isActive) return null; // rule 3
      await db.insert(authIdentitiesTable).values({
        userId: user.id,
        provider: "google",
        providerUserId: info.sub,
        email,
      });
      if (!user.emailVerifiedAt) {
        await db
          .update(usersTable)
          .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));
      }
      return user;
    }
  }

  if (!email) return null; // we require an email to create an account

  // Rule 4: create a passwordless account.
  const inserted = await db
    .insert(usersTable)
    .values({
      tenantId: tenant.id,
      email,
      passwordHash: null,
      firstName: info.given_name?.trim() || info.name?.split(" ")[0] || "Member",
      lastName: info.family_name?.trim() || info.name?.split(" ").slice(1).join(" ") || "",
      avatarUrl: info.picture ?? null,
      emailVerifiedAt: info.email_verified ? new Date() : null,
      lastLoginAt: new Date(),
    })
    .returning();
  const user = inserted[0];
  if (!user) return null;
  await db.insert(authIdentitiesTable).values({
    userId: user.id,
    provider: "google",
    providerUserId: info.sub,
    email,
  });
  return user;
}

export default router;
