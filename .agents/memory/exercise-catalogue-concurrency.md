---
name: Exercise catalogue concurrency
description: Why every exercise edit and lifecycle transition must use the same versioned compare-and-set rule.
---

Exercise definition edits and lifecycle transitions must compare the version they read and atomically increment it when they commit. A lifecycle-status predicate alone is not enough, including for activation after validation.

**Why:** A concurrent draft edit can invalidate required exercise metadata after activation validates an older snapshot. Status can remain `draft`, allowing a status-only activation to publish an invalid definition. Concurrent mapping replacements can likewise overwrite each other while both appear successful.

**How to apply:** Any future mutation that reads an exercise and then changes its definition or lifecycle must use the same versioned compare-and-set boundary. Validation, child mapping changes, the parent update, and audit records must remain in one transaction; stale requests return a conflict.