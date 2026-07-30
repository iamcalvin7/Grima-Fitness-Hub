# Authentication — Marcus Grima PT

## Overview

Authentication is cookie-session-based. There are no JWTs. Every server response that references auth state is derived from the HTTP-only session cookie (`mg_session`).

---

## Sign-in Methods

| Method | Status | Notes |
|---|---|---|
| Email + password | ✅ Live | scrypt via node:crypto |
| Google OAuth | ✅ Live | requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` secrets |
| Apple | ⏳ Modelled, not enabled | awaits Apple Developer Program credentials |

---

## Password Hashing

Format: `scrypt:<salt_hex>:<hash_hex>`  
Algorithm: `crypto.scryptSync`, N=16384, r=8, p=1, keylen=64  
File: `artifacts/api-server/src/lib/password.ts`

Accounts created via Google OAuth have `passwordHash = null`. The sign-in endpoint runs a dummy hash on bad attempts to keep timing constant regardless of whether an account exists.

---

## Session Model

- **Table:** `sessions` (PostgreSQL via Drizzle)
- **Cookie:** `mg_session` — HTTP-only, SameSite=Lax, 30-day TTL
- **Storage:** only the SHA-256 hash of the opaque token is persisted; the raw token never touches the DB
- **Rotation:** none currently (a future upgrade is to rotate on each request)
- **Revocation:** immediate — deleting the row from `sessions` ends the session
- **Sensitive changes:** password reset, email change, and OAuth linking that changes sessions all call `revokeAllSessions`, optionally keeping the current session alive

Columns on `sessions`: `id`, `userId`, `tokenHash`, `userAgent`, `ipAddress`, `lastUsedAt`, `createdAt`, `expiresAt`

---

## Token Lifecycle

### Password Reset (`password_reset_tokens`)
1. `POST /api/auth/forgot-password` — generates a random 32-byte token → stores SHA-256 hash with 30-min expiry
2. Email is sent (or console-logged in dev) with `/?reset=<raw-token>`
3. `POST /api/auth/reset-password` — validates hash, marks `usedAt`, updates `passwordHash`, revokes ALL sessions
4. Tokens are single-use. Race condition: if two processes try to consume the same token simultaneously, only one succeeds (optimistic locking via `usedAt IS NULL`).

### Email Verification / Change (`verification_tokens`)
1. `POST /api/auth/send-verification` — generates token, stores with `purpose='email_verify'`, 24-hour TTL
2. `POST /api/auth/verify-email` — validates, marks `usedAt`, sets `emailVerifiedAt`
3. For email change: `POST /api/account/email` — generates token with `purpose='email_change'` and `newEmail` field
4. Same verify endpoint — on `email_change` it swaps `users.email` and revokes all sessions

---

## Google OAuth Flow

1. `GET /api/auth/google` — generates PKCE verifier + challenge + state, stores in signed-ish state cookie (`mg_oauth_state`), redirects to Google
2. Google redirects to `GET /api/auth/google/callback`
3. State cookie is validated (CSRF protection)
4. Code exchanged for access token via server-to-server TLS call (no id_token trust from URL)
5. Userinfo fetched from Google's OIDC endpoint
6. Identity resolved (see rules below), session created, state cookie cleared
7. Redirect to `/?oauth=success` — frontend's `OAuthCallback` component refreshes AuthContext from the new session cookie

### Identity Linking Rules

| Scenario | Action |
|---|---|
| Known identity (provider+sub exists) | Sign in that user |
| Unknown identity, email matches existing account, Google says verified | Link identity, sign in |
| Unknown identity, email matches existing account, Google says unverified | Refuse — no silent account takeover |
| Unknown identity, no matching account | Create passwordless account, link identity |
| No email from Google | Refuse |

Linking is additive only — there is no unlink flow in v1.

---

## Anti-Enumeration

All auth endpoints that touch email addresses return identical responses whether or not an account exists:
- `POST /api/auth/forgot-password` → always "If an account exists…"
- `POST /api/auth/signup` → 409 on duplicate (cannot enumerate; the message says "An account with that email already exists" but this is intentional — sign-up is expected to be user-visible)
- `POST /api/auth/signin` → always "Invalid email or password"

---

## Rate Limiting

In-memory fixed-window rate limiter (`artifacts/api-server/src/lib/rateLimit.ts`). Per-process — if running multiple API instances, use a shared store (Redis).

| Endpoint | Limit |
|---|---|
| `POST /auth/signin` | 20 req / 15 min / IP |
| `POST /auth/signup` | 10 req / 15 min / IP |
| `POST /auth/forgot-password` | 5 req / 15 min / IP |
| `POST /auth/reset-password` | 10 req / 15 min / IP |
| `POST /auth/send-verification` | 3 req / 15 min / user |
| `POST /auth/verify-email` | 10 req / 15 min / IP |
| `PATCH /account/password` | 10 req / 15 min / user |
| `POST /account/email` | 5 req / 15 min / user |
| `DELETE /account` | 5 req / 15 min / user |
| `GET /auth/google` | 20 req / 15 min / IP |

---

## Email Delivery

Provider-independent abstraction (`artifacts/api-server/src/lib/email.ts`).

| Environment | Behaviour |
|---|---|
| `RESEND_API_KEY` set | Sends real email via Resend API |
| No `RESEND_API_KEY` | Logs full email body to server stdout (console transport) |

`GET /api/auth/providers` returns `emailDelivery: "resend" | "console"` so the frontend and ops can surface this clearly.

**Launch requirement:** `RESEND_API_KEY` + a verified sending domain on Resend + `EMAIL_FROM` set to a sender on that domain.

---

## Tenant Model

Single-tenant today. Every user is associated with the default tenant (`slug: "marcus-grima"`). The seam is `getDefaultTenant()` in `artifacts/api-server/src/lib/tenant.ts`. Multi-tenancy is a future upgrade requiring per-tenant auth config and subdomain routing.
