---
name: Weekly schedule and recurrence
description: Weekly planner and recurring availability coexist while all bookable sessions remain ordinary dated records.
---

Use ordinary dated `training_sessions` as the weekly schedule source of truth. New slots may omit a session type, but must set capacity explicitly. Admin-managed recurring availability may materialize typed future sessions into that same table.

**Why:** The operator needs both direct control of one-off weekly slots and a safe way to keep recurring, typed availability bookable without changing the established booking domain.

**How to apply:** Keep dated sessions as the only client-bookable records. Reconcile recurrence changes through the protected admin workflow, preserve manually created sessions, and treat active bookings as a lock on automatic deletion or schedule details. The convenience materializer remains development-only unless a separate production scheduling decision is made.

## Planner timezone rule

The weekly planner uses the schedule's local calendar for its columns, while an existing session keeps its own location-local calendar date when it is edited or duplicated.

**Why:** A weekly grid is a local-calendar interface while stored sessions are absolute timestamps. Mixing those meanings can silently move a session by a day, making a correct range-overlap check look faulty.

**How to apply:** Treat calendar-key changes as an explicit scheduling decision; never infer a location-local date from the grid column when retaining an existing session's instant.