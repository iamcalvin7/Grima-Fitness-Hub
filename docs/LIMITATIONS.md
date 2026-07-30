# Limitations — Marcus Grima PT (v1)

## Authentication & Accounts

| Limitation | Impact | Future path |
|---|---|---|
| Apple Sign-in is not enabled | Users cannot sign in with Apple. Button is visible but disabled ("coming soon"). | Add Apple Developer account + `Sign in with Apple` service ID + private key |
| Google OAuth requires verification for >100 users | Unverified OAuth apps are limited to 100 users | Submit Google OAuth app for verification before launch |
| No MFA / 2FA | No second factor beyond password or OAuth | Add TOTP (time-based OTP) as a future security upgrade |
| No password strength meter | Users can set weak passwords (minimum 8 chars enforced) | Add zxcvbn client-side strength indicator |
| Rate limiter is in-memory per-process | If the API scales horizontally, rate limits do not apply across instances | Replace with Redis-backed store |
| No social sign-in unlinking | Users cannot unlink a Google identity once linked | Add DELETE /api/account/identities/:id endpoint |
| Email change revokes all sessions | User must sign back in on all devices after confirming email change | Intentional security decision; document in UX copy |
| No email change confirmation resend | If the email-change confirmation email is lost, user must submit a new request | Add explicit resend endpoint |

## Email Delivery

| Limitation | Impact |
|---|---|
| Resend API key not configured | All transactional emails (password reset, verification) are logged to server console only — not delivered to users |
| No sending domain configured | Even with a Resend key, emails may land in spam without a verified domain |
| No email queue / retry | If Resend's API returns an error, the email is lost; there is no retry mechanism |
| `onboarding@resend.dev` fallback sender | Resend's shared domain is rate-limited and unbranded; must set `EMAIL_FROM` |

**This is a launch blocker.** Email flows are fully implemented but inoperable without a Resend account and verified sending domain.

## Data & Storage

| Limitation | Impact |
|---|---|
| Avatars stored as base64 data URLs in Postgres | ~300 KB per user in the `profiles` table; acceptable for <500 users, degrades after |
| No avatar deletion endpoint | Users can replace but not remove their avatar |
| `dateOfBirth` is approximate | Onboarding age input → Jan 1 of birth year; not a real date of birth |
| No data export | Users cannot download their data (GDPR Article 20 right to portability) |
| Hard delete only | Account deletion is permanent with no recovery window |

## Product Scope

| Limitation | Notes |
|---|---|
| No admin panel | Marcus cannot create/manage user accounts from the app; must use the database directly |
| Session stats (47 sessions, 8 this month, 12-day streak) are hardcoded | Not connected to real data yet |
| Workouts, Meal Plan, Leaderboard, Offers, Memberships, Team pages are placeholder | Content is static mock data |
| Story/challenge content is hardcoded | No CMS for Marcus to post content |
| Booking system not implemented | Sessions page shows mock data |

## Infrastructure

| Limitation | Notes |
|---|---|
| No expired-session cleanup job | `deleteExpiredSessions()` exists but is not scheduled; expired rows accumulate |
| No structured error monitoring | No Sentry or equivalent; errors only in Pino logs |
| No backup strategy documented | Replit Postgres provides point-in-time recovery but no explicit backup plan is set |
| Single-region deployment | Replit deploys to a single region by default |
