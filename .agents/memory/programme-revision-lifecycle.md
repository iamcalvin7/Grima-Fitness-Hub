---
name: Programme revision lifecycle
description: Durable rules for programme publishing, revision integrity, and legacy import eligibility.
---

Published programme content is an immutable revision. Editing a published programme creates a replacement draft; clients continue seeing the prior published revision until the replacement is published.

**Why:** Mutable published children or loosely constrained revision pointers can silently change client prescriptions and invalidate historical meaning.

**How to apply:** Require caller-reviewed versions for mutations, preserve normalized no-ops, constrain draft/published pointers to the same tenant and template, and validate both old and new ancestry when child ownership changes.

Legacy programme imports must map every referenced exercise to an active same-tenant catalogue record and must not partially import, substitute, or activate exercises to make a batch pass.

**Why:** A source programme can reference an intentionally ineligible exercise; weakening mapping rules would change approved catalogue or programme meaning.

**How to apply:** Run a pinned dry run first, report structured blockers, and enter write mode only when the complete source maps unambiguously with no blockers.