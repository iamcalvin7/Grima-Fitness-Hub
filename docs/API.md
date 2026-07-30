# API Reference — Marcus Grima PT

Base path: `/api` (all routes are prefixed)

Authentication: HTTP-only cookie `mg_session`. Use `credentials: "include"` on all fetch calls.

---

## Auth Routes

### `POST /auth/signup`
Create a new account.  
**Rate:** 10/15min/IP  
**Body:** `{ email, password, firstName, lastName }`  
**Response 201:** `{ user: { id, email, firstName, lastName, role, createdAt } }`  
**Errors:** 400 validation, 409 email taken

### `POST /auth/signin`
Sign in with email + password.  
**Rate:** 20/15min/IP  
**Body:** `{ email, password }`  
**Response 200:** `{ user }`  
**Errors:** 401 invalid credentials

### `POST /auth/signout`
Revoke the current session cookie.  
**Response 200:** `{ ok: true }`

### `GET /auth/me`
Return the authenticated user.  
**Auth required:** yes  
**Response 200:** `{ user }`  
**Errors:** 401

### `POST /auth/forgot-password`
Request a password-reset email. Always returns the same generic message (anti-enumeration).  
**Rate:** 5/15min/IP  
**Body:** `{ email }`  
**Response 200:** `{ message: "If an account exists…" }`

### `POST /auth/reset-password`
Consume a reset token and set a new password. Revokes all sessions.  
**Rate:** 10/15min/IP  
**Body:** `{ token, password }`  
**Response 200:** `{ message }`  
**Errors:** 400 invalid/expired token, 400 password too short

### `POST /auth/send-verification`
Send (or resend) an email-verification link to the current user.  
**Auth required:** yes  
**Rate:** 3/15min/user  
**Response 200:** `{ message }`

### `POST /auth/verify-email`
Consume a verification or email-change token.  
**Rate:** 10/15min/IP  
**Body:** `{ token }`  
**Response 200:** `{ message, emailChanged: boolean }`  
**Errors:** 400 invalid/expired token

### `GET /auth/providers`
Report which sign-in methods are configured.  
**Response 200:**
```json
{
  "email": true,
  "google": false,
  "apple": { "enabled": false, "reason": "Awaiting Apple Developer Program credentials" },
  "emailDelivery": "console"
}
```

### `GET /auth/google`
Start Google OAuth flow. Redirects to Google.  
**Rate:** 20/15min/IP  
Returns `/?oauth_error=not_configured` if Google credentials are absent.

### `GET /auth/google/callback`
Google OAuth callback. Never call directly — Google redirects here.  
On success: redirects to `/?oauth=success`  
On failure: redirects to `/?oauth_error=google`

---

## Profile Routes

### `GET /profile`
Get the current user's profile.  
**Auth required:** yes  
**Response 200:** `{ profile: ClientProfile | null }`

### `POST /profile`
Create a profile (first-time onboarding).  
**Auth required:** yes  
**Body:** `Partial<ProfileInput>`  
**Response 201:** `{ profile: ClientProfile }`  
**Errors:** 409 profile already exists

### `PATCH /profile`
Update fields on the current profile.  
**Auth required:** yes  
**Body:** `Partial<ProfileInput>`  
**Response 200:** `{ profile: ClientProfile }`

**ProfileInput fields:** `firstName`, `lastName`, `gender`, `dateOfBirth`, `heightCm`, `weightKg`, `goal`, `activityLevel`, `experienceLevel`, `avatarUrl`, `onboardingCompleted`

---

## Account Routes

All account routes require authentication.

### `GET /account/security`
Return email-verification status, whether a password exists, and linked OAuth identities.  
**Response 200:**
```json
{
  "email": "user@example.com",
  "emailVerified": true,
  "hasPassword": true,
  "identities": [{ "id", "provider", "email", "createdAt" }]
}
```

### `PATCH /account/password`
Change (or set) the account password.  
**Rate:** 10/15min/user  
**Body (change):** `{ currentPassword, newPassword }`  
**Body (set, OAuth-only):** `{ newPassword }`  
**Response 200:** `{ message }`  
**Errors:** 400 wrong current password, 400 too short  
**Side effect:** all other sessions revoked

### `POST /account/email`
Request an email-address change. Sends a confirmation link to the new address.  
**Rate:** 5/15min/user  
**Body:** `{ newEmail, password? }` (password required when account has one)  
**Response 200:** `{ message }` (always generic)

### `GET /account/sessions`
List all active sessions for the current user.  
**Response 200:** `{ sessions: [{ id, current, userAgent, ipAddress, createdAt, lastUsedAt, expiresAt }] }`

### `DELETE /account/sessions`
Sign out all devices except the current one.  
**Response 200:** `{ message }`

### `DELETE /account/sessions/:id`
Revoke a specific session. Cannot revoke the current session.  
**Response 200:** `{ message }`  
**Errors:** 404 not found, 400 tried to revoke current session

### `DELETE /account`
Permanently delete the account. Hard delete — FK cascades remove profile, sessions, auth identities, tokens.  
**Rate:** 5/15min/user  
**Body (password account):** `{ password }`  
**Body (OAuth-only):** `{ confirm: "DELETE" }`  
**Response 200:** `{ message }`  
**Errors:** 400 wrong password / confirm

---

## Health

### `GET /`
Server liveness check.  
**Response 200:** `{ ok: true }`

---

## Error Format

All errors: `{ error: string }` with appropriate HTTP status.  
Validation errors may include: `{ error: string, fields: { [fieldName]: string } }`

---

## Frontend Client

`artifacts/marcus-grima/src/lib/api.ts` — `apiRequest<T>(path, options)`.  
Throws `ApiError(status, message, fields?)` on non-2xx. Always uses `credentials: "include"`.
