---
name: Profile data model decisions
description: Why profiles is a separate table, field semantics (experience vs activity, DOB vs age), avatar storage interim.
---

- **Separate `profiles` table, not columns on `users`.** **Why:** `users` stays a lean auth/identity record shared by all roles; client fitness data grows independently. **How to apply:** new client-specific fields go in `profiles`; identity/credential fields go in `users`.
- **Onboarding "activity level" (Beginner/Intermediate/Advanced) is stored as `experience_level`.** `activity_level` is reserved for real activity semantics (Sedentary/Lightly Active/Active/Very Active). Don't conflate them.
- **Age → approximate `date_of_birth`** (Jan 1 of birth year) — wizard collects age, DB stores DOB; UI derives age back from DOB.
- **Avatars are 256px JPEG data URLs in `profiles.avatar_url`** (server validates raster-only data URLs, no SVG — script risk; 300k char cap; express.json limit 400kb). Interim until App Storage; the swap point is just the `avatarUrl` value format.
- **Profile API semantics:** GET returns `{profile: null}` (200) when absent; POST 409 on duplicate; ownership only from session; whitelist validation ignores unknown fields.
- **Frontend races:** profile fetches are user-bound (ref check before setState); splash stays up until `isProfileLoading` settles for authenticated users; legacy `mg_profile` migration is once-per-user-per-load and never overwrites an existing server profile.
