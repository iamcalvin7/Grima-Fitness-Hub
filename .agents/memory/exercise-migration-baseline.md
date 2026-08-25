---
name: Exercise migration baseline
description: The authorized development-only re-baseline that established the canonical exercise catalogue migration.
---

`0011_exercise_catalogue.sql` is the canonical, complete version-aware exercise catalogue migration. It was re-baselined in development only after verifying all exercise tables were empty, no external tables depended on them, and a fresh database backup was created. Do not amend it again.

**Why:** The originally recorded pre-amendment SQL could not be recovered, so a clean development-only reset of the empty exercise schema and its two related ledger rows established one reproducible canonical baseline without affecting production or application data.

**How to apply:** Add every future exercise schema change as a new migration. Never delete or rewrite `0011`, and never repeat an exercise-schema reset unless separately authorized with the same data, dependency, backup, and environment safeguards.