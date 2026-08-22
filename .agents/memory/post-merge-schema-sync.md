---
name: Post-merge schema synchronization
description: Safe database setup behavior after task merges.
---

Post-merge setup uses the checked-in SQL migration ledger rather than Drizzle schema push. The runner recognizes verified legacy schema objects once, records their migration filenames, and then applies only unrecorded migration files with PostgreSQL error-stop enabled.

**Why:** Drizzle schema push can prompt about existing unique constraints in the non-interactive merge environment, even when the catalog already contains those constraints. Accepting that prompt would require unsafe truncation.

**How to apply:** Keep migrations additive and ordered, and do not replace the ledger runner with `drizzle-kit push` in the merge script. When adding a migration to an older installation, add a narrowly scoped legacy sentinel only if it is needed to establish the initial baseline safely.