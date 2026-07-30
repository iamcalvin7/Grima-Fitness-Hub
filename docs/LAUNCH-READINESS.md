# Launch Readiness — Marcus Grima PT

## Summary

The authentication and account lifecycle is fully implemented and tested. The app is **not yet launch-ready** due to two hard external dependencies and several content/product gaps. All auth flows work completely in development using console-logged emails.

---

## Hard Launch Blockers

These must be resolved before any real client uses the app.

### 🔴 1. Email delivery (Resend)
**Status:** Not configured  
**Impact:** Password reset, email verification, and email-change confirmation emails are never delivered to users — they are only logged to the server console.  
**Required action:**
1. Create a [Resend](https://resend.com) account
2. Add and verify a sending domain (DNS records)
3. Create an API key
4. Add Replit Secrets: `RESEND_API_KEY`, `EMAIL_FROM`
5. Restart the API workflow and test a password-reset email end-to-end

### 🔴 2. Google OAuth credentials
**Status:** Not configured  
**Impact:** "Continue with Google" button does not appear; email-only auth works  
**Required action:**
1. Create a Google Cloud project
2. Configure OAuth 2.0 consent screen (needs privacy policy URL + terms of service URL)
3. Add authorized redirect URIs for dev and production domains
4. Add Replit Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
5. Submit app for Google verification before exceeding 100 Google users

> **Note:** If Google sign-in is not a launch requirement, this can be deferred. Email auth is fully functional without it.

---

## Soft Launch Blockers (should fix before public launch)

### 🟡 3. Privacy Policy & Terms of Service pages
**Status:** Not built  
**Impact:** Required by Google OAuth verification; good practice for any user-data app  
**Required action:** Add `/privacy` and `/terms` pages (static content is fine)

### 🟡 4. Apple Sign-in
**Status:** Button visible but disabled  
**Impact:** iOS users who prefer Apple sign-in cannot use it  
**Required action:** Apple Developer Program ($99/year) + Sign in with Apple configuration

### 🟡 5. Static content & CMS
**Status:** Sessions, workouts, meals, leaderboard, offers, memberships show mock/placeholder data  
**Impact:** The app is not usable as a real PT platform without real content  
**Required action:** Build CMS or admin panel for Marcus to manage content

### 🟡 6. Booking system
**Status:** Sessions page shows mock data  
**Required action:** Implement real session booking

---

## ✅ What Is Production-Ready Now

| Feature | Status |
|---|---|
| Email + password signup & signin | ✅ Live |
| Onboarding wizard (8 steps, profile saved to DB) | ✅ Live |
| Session management (30-day cookie sessions, revoke by device) | ✅ Live |
| Forgot password flow (token-gated, anti-enumeration) | ✅ Live |
| Reset password (token validates, all sessions revoked) | ✅ Live |
| Email verification (send, resend, verify via link) | ✅ Live |
| Email change (password-gated, confirmation-gated) | ✅ Live |
| Change password (current password verified, other sessions revoked) | ✅ Live |
| Set password for OAuth-only accounts | ✅ Live |
| Account Security page (password, email, linked identities) | ✅ Live |
| Active Sessions page (list, revoke one, sign out all others) | ✅ Live |
| Delete account (hard delete, password/confirm-gated) | ✅ Live |
| Google OAuth backend (PKCE, state cookie, identity linking rules) | ✅ Live (awaits credentials) |
| OAuth profile-only onboarding for Google users | ✅ Live |
| Apple sign-in placeholder (clearly disabled) | ✅ Live |
| Rate limiting on all sensitive endpoints | ✅ Live |
| Anti-enumeration on all email-touching endpoints | ✅ Live |
| Token hashing (SHA-256, never raw token in DB) | ✅ Live |
| Single-use tokens (reset + verification) | ✅ Live |
| User profile (create, read, update, avatar) | ✅ Live |
| Provider discovery endpoint (`GET /api/auth/providers`) | ✅ Live |

---

## Pre-Launch Checklist

- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM` secrets
- [ ] Verify sending domain on Resend
- [ ] Test password-reset email end-to-end with a real inbox
- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (if Google sign-in needed at launch)
- [ ] Add Google OAuth redirect URIs for the production domain
- [ ] Submit Google OAuth app for verification (if >100 Google users expected)
- [ ] Add Privacy Policy and Terms of Service pages
- [ ] Set `SESSION_SECRET` to a strong random value (if not already done)
- [ ] Promote Marcus's account to `admin` role via direct SQL
- [ ] Run `pnpm --filter @workspace/db run push` against the production database after deploying
- [ ] Schedule or manually run `deleteExpiredSessions()` periodically
- [ ] Add production monitoring (Sentry or equivalent)
- [ ] Review and update content (sessions, workouts, meals) for real data
