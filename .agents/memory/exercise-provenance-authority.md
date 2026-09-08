---
name: Exercise provenance authority
description: Separation between immutable historical import attribution and current authorization to verify or mutate the exercise catalogue.
---

Historical exercise provenance must be derived fail-closed from the exact tenant-scoped create, reconciliation, and attestation chain. It remains valid if the historical actor is later demoted or replaced.

**Why:** Requiring the historical actor to remain an active admin made valid Gate 2C provenance unverifiable after an independently authorized admin replacement. Conversely, treating a current operator as the historical actor would rewrite attribution and weaken evidence.

**How to apply:** Authenticate every verification caller and lock/revalidate every mutation operator as a current active same-tenant admin. Derive historical actors only from exact linked audit evidence. Attribute new writes to the actual operator, preserve old actor IDs, and keep reviewed content drift separate from ownership validity.

Post-import management history must remain replayable without weakening historical attribution. Exercise writes and lifecycle actions require a caller-reviewed version precondition, and normalized no-op saves must preserve versions and audit history.

**Why:** Hard-coded lifecycle assumptions, stale caller state, and no-op writes can invalidate legitimate immutable provenance or overwrite a newer review.

**How to apply:** For each new exercise mutation or lifecycle action, extend strict replay and API-backed negative coverage. Preserve append-only history rather than adding permissive evidence fallbacks.