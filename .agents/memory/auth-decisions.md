---
name: Auth architecture decisions
description: Cookie sessions, scrypt, tenant model, CORS, security rules, OAuth linking — durable decisions made across all auth sprints.
---

## Session model
- HTTP-only cookie `mg_session`, 30-day TTL, DB-backed (`sessions` table)
- Only the SHA-256 hash of the opaque token is stored; raw token never touches DB
- `revokeAllSessions(userId, exceptToken?)` — revokes all sessions, optionally keeping the current one alive (used after password change, email change)
- Sensitive changes (password reset, email change, delete account) revoke ALL sessions

**Why:** trivial server-side revocation; no token refresh complexity; no JS-accessible token.

## Password hashing
- Format: `scrypt:<salt_hex>:<hash_hex>` (node:crypto scryptSync, N=16384, r=8, p=1, keylen=64)
- `passwordHash` is nullable — OAuth-only accounts have `null`
- Sign-in always runs a dummy hash on failure to equalize timing

**Why:** no bcrypt dependency; built-in; modern algorithm.

## Anti-enumeration
- `forgot-password`, `signin`, `signup` (409 is intentionally visible — sign-up expects it) all return identical responses regardless of account existence
- Timing equalized with dummy hash calls on missing accounts or null passwordHash

## Token security
- Reset tokens: 32-byte random, SHA-256 hash stored, 30-min TTL, single-use (`usedAt IS NULL` check)
- Verification tokens: same pattern, 24-hour TTL, `purpose` field (`email_verify` / `email_change`), `newEmail` for email-change
- Concurrent redemption safe: UPDATE ... WHERE usedAt IS NULL; only one succeeds

## Google OAuth
- PKCE (S256 challenge), state cookie for CSRF
- Code exchanged server-to-server over TLS; userinfo fetched from Google OIDC endpoint
- Trust: Google-verified email assertion; never trust unverified email to link to existing account

## OAuth identity linking rules
1. Known identity (provider+sub) → sign in that user
2. Unknown identity, email matches existing account, Google says verified → link + sign in
3. Unknown identity, email matches existing account, Google says unverified → REFUSE (no silent takeover)
4. No matching account → create passwordless user + link identity
5. No email from Google → refuse

## Tenant model
- `getDefaultTenant()` returns slug `marcus-grima`; every user has a `tenantId`
- Multi-tenancy is a future upgrade; the seam exists now

## CORS
- Allowlist from `REPLIT_DEV_DOMAIN` + `REPLIT_DOMAINS` — never `origin: true`

## Rate limiting
- In-memory fixed-window, per-process
- Replace with Redis for horizontal scaling
- Limits: signin 20/15min, signup 10/15min, forgot 5/15min, reset 10/15min, account mutations 3–10/15min

## Email delivery
- `EmailService` interface; `ConsoleEmailService` (dev) vs `ResendEmailService` (production)
- `RESEND_API_KEY` presence switches the implementation
- `sendEmailSafely()` — fire-and-forget, never leaks delivery failures to callers
- `GET /api/auth/providers` reports `emailDelivery: "resend" | "console"`

## OAuth-only onboarding
- Google users land authenticated but with no profile → App.tsx detects `!profile?.onboardingCompleted` → shows `<Onboarding profileOnly />`
- Profile-only wizard skips name (pre-filled from Google) and login steps; runs gender → age → weight → height → goal → activity → createProfile

## Development admin authentication
- Admin shortcuts must be unavailable in deployments, choose no request-controlled identity or role, and create only the normal cookie session.
- A temporary onboarding bypass must be bound in memory to the exact authenticated admin ID and role, and cleared on every session or identity transition.
- Development admin profile loading is read-only; it must never migrate browser-local profile data or create/update the admin profile.

**Why:** A boolean bypass can leak across user changes, while legacy local-profile migration can silently persist another browser user's data into the admin account.
