# Product Roadmap — Marcus Grima PT

This roadmap follows the sprint model used to build v1. All items below are post-launch.

---

## Phase 1 — Launch Unblocking (before any real users)

1. **Email delivery** — Resend account, verified domain, `EMAIL_FROM` configured
2. **Google OAuth credentials** — Google Cloud project, consent screen, redirect URIs, verification
3. **Privacy Policy & Terms** — Static pages required for Google verification and good practice
4. **First admin user** — Marcus's account promoted to admin role
5. **Session cleanup job** — Schedule `deleteExpiredSessions()` (daily cron)

---

## Phase 2 — Core Product (first real clients)

1. **Admin panel** — Marcus can create/manage client accounts, post content, view usage
2. **Real session booking** — Calendar view, session types, availability slots, confirmation emails
3. **Workout tracking** — Log sets/reps/weight; history view; personal records
4. **Meal plan builder** — Editable meal plans per client; macro tracking
5. **CMS for stories** — Marcus posts daily content (text, image, video) without touching code
6. **Push notifications** — Session reminders, daily challenge alerts (PWA or native)
7. **Object Storage for avatars** — Move from DB data URLs to Replit Object Storage

---

## Phase 3 — Engagement & Monetisation

1. **Apple Sign-in** — Apple Developer account required ($99/year)
2. **Leaderboard — real data** — Connect to workout logs; weekly/monthly challenges
3. **In-app messaging** — Real-time or async messaging between Marcus and clients
4. **Progress photos** — Secure, private upload with timeline view
5. **Memberships & payments** — Stripe integration; subscription plans; invoices
6. **Client-facing reports** — Weekly/monthly progress summaries (PDF export)

---

## Phase 4 — White-Labelling

1. **Multi-tenancy** — Per-trainer tenant, subdomain routing, branding config in DB
2. **Trainer onboarding** — Self-service sign-up for other trainers
3. **Template marketplace** — Workout and meal plan templates trainers can share
4. **Custom domains** — Each trainer brand on their own domain

---

## Security Backlog

- [ ] MFA / TOTP (Google Authenticator-style second factor)
- [ ] Redis-backed rate limiting (horizontal scaling)
- [ ] OAuth identity unlinking
- [ ] Session rotation on each request
- [ ] Sentry (or equivalent) for error monitoring
- [ ] GDPR data export endpoint
- [ ] Soft delete (deletedAt) for users and profiles
- [ ] IP-based anomaly detection on sign-in

---

## Technical Debt

- [ ] Split the large Onboarding.tsx into smaller step components
- [ ] Replace hardcoded stats (sessions count, streak) with real data
- [ ] Add database indexes for production query performance
- [ ] Set up CI (GitHub Actions: typecheck + build + e2e on PR)
- [ ] Add unit tests for auth utility functions (hashPassword, verifyPassword, token lifecycle)
