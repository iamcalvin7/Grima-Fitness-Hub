# Changelog — Marcus Grima PT

## Sprint 4 — Authentication & Account Lifecycle (2026-07-30)

### Added — Backend

- `auth_identities` table: links OAuth provider accounts to internal users (supports Google and Apple)
- `password_reset_tokens` table: single-use, hashed, 30-minute TTL
- `verification_tokens` table: single-use, hashed, 24-hour TTL, supports `email_verify` and `email_change` purposes
- `users.passwordHash` made nullable (OAuth-only accounts have no password)
- `lib/tokens.ts`: token generation (random 32 bytes), SHA-256 hashing, create/find/consume helpers for both token types
- `lib/email.ts`: provider-independent `EmailService` interface; `ConsoleEmailService` (dev) + `ResendEmailService` (production, behind `RESEND_API_KEY`); `emailDeliveryMode()` and `sendEmailSafely()`
- `lib/emailTemplates.ts`: branded HTML + text email templates for password reset, email verification, email change
- `lib/rateLimit.ts`: in-memory fixed-window rate limiter middleware
- `routes/account.ts`: `GET /account/security`, `PATCH /account/password`, `POST /account/email`, `GET/DELETE /account/sessions`, `DELETE /account/sessions/:id`, `DELETE /account`
- `routes/oauth.ts`: `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/providers`; PKCE flow, state cookie CSRF protection, identity resolution and linking rules
- `routes/auth.ts` additions: `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/send-verification`, `POST /auth/verify-email`; rate limiting on sign-in and sign-up
- `lib/sessions.ts`: `revokeAllSessions(userId, exceptToken?)` helper
- Sign-in endpoint handles `passwordHash = null` (OAuth-only) without leaking timing

### Added — Frontend

- `ForgotPassword.tsx`: enter email, request reset link, confirmation state
- `ResetPassword.tsx`: set new password via `?reset=<token>` link; success state navigates to sign-in
- `VerifyEmailHandler.tsx`: auto-verifies token from `?verify=<token>`; handles both `email_verify` and `email_change`
- `OAuthCallback.tsx`: handles `?oauth=success` (refreshes AuthContext) and `?oauth_error=...`
- `AccountSecurity.tsx`: security overview (email, password, identities), change-password panel, set-password panel, change-email panel, verification banner with resend, delete-account link
- `ActiveSessions.tsx`: list active sessions with device/browser/IP/time, revoke individual, sign out all others
- `DeleteAccount.tsx`: deliberate confirmation (password or literal "DELETE"), hard delete
- `Onboarding.tsx`: Google button (config-driven), Apple button (visible but disabled), "Forgot password?" link on sign-in, `profileOnly` mode for OAuth users (skips name/login steps), `useAuthProviders()` hook, `startGoogleSignIn()` function
- `Profile.tsx`: Security and Active Sessions navigation in Settings section
- `App.tsx`: new `Page` types (`security`, `active-sessions`, `delete-account`); query-param modal system for `?reset`, `?verify`, `?oauth`; `profileOnly` onboarding gate for authenticated users without a completed profile

---

## Sprint 3 — Client Profiles (2026-07)

- `profiles` table: create, read, update via `/api/profile`
- `AuthContext`: `profile`, `isProfileLoading`, `refreshProfile`, `updateProfile`, `createProfile`
- Legacy localStorage migration (`mg_profile`, `mg_avatar`) to server on first sign-in
- Avatar upload: canvas crop to 256px JPEG data URL
- Onboarding wizard profile answers saved to DB
- Profile page: display + edit name, avatar, goals, personal info

---

## Sprint 2 — Authentication Foundation (2026-07)

- Email + password accounts via Express API
- scrypt hashing (`lib/password.ts`)
- DB-backed sessions (`sessions` table, `mg_session` cookie, 30-day TTL)
- `attachUser` / `requireAuth` / `requireRole` middlewares
- Anti-enumeration on signin/signup
- CORS allowlist from `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS`
- Tenant model (single-tenant, `marcus-grima` slug)

---

## Sprint 1 — Core UI (2026-07)

- React + Vite + TypeScript + Tailwind scaffolding
- State-routed page system
- Home: story ring, story viewer, sessions grid
- Sessions, Messages, Profile, Workouts, Meal Plan, Leaderboard, Offers, Memberships, Team pages
- Onboarding wizard (8 steps)
- Design system: near-black + green primary, uppercase tracked labels
