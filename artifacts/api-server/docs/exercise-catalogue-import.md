# Exercise catalogue import

Gate 2C imports the exercise definitions embedded in
`artifacts/marcus-grima/src/data/programs.ts` into the development catalogue for
the `marcus-grima` tenant.

## Safety policy

- The command runs only with `NODE_ENV=development`.
- `--tenant marcus-grima` and an explicit same-tenant admin `--actor-id` are
  required.
- Dry-run is the default. `--apply` is required for writes.
- Apply and reconciliation require `--confirm-development-only` and refuse the
  documented Replit deployment markers (`REPLIT_DEPLOYMENT`,
  `REPLIT_DEPLOYMENT_ID`, and `REPLIT_ENV`). The package script does not set
  `NODE_ENV`.
- Every record is validated through the normal exercise write validator.
- The authoritative bundled source and its normalized 47-record inventory are
  pinned by reviewed SHA-256 values. Alternate `--source` input is rejected;
  any source-content change requires an explicit importer review and hash
  update before the command can run.
- Existing matching slugs are skipped only when every managed value and mapping
  is identical. Any difference is reported as a conflict and blocks the entire
  apply before writes begin.
- The entire import, all mappings, and all `exercise:create` audit events share
  one transaction protected by a tenant/import advisory lock. Lock contention
  fails immediately instead of waiting, and any failure rolls back the whole
  run.
- Future `exercise:create` audits record the canonical source, source ID, slug,
  import version, pinned source-file and normalized-source hashes, deterministic
  manifest-record hash, exercise linkage, and initial version. Ownership checks
  compare these values only to internally pinned or generated expectations.
- Normal import mode never updates an existing record, lifecycle state, or
  version.
- The one-time `--reconcile` mode updates only rows proven to be unchanged
  products of this import: exact tenant/slug/source ID, original import audit,
  original version and timestamps, matching active admin actor, draft status,
  and no later exercise audit. Any missing, changed, unowned, or unexpected row
  blocks the complete reconciliation.
- The reconciliation mutation entry point independently rechecks the
  development environment, explicit confirmation, approved source hashes,
  complete canonical manifest, and exact tenant even when invoked outside the
  CLI parser.
- Reconciliation preserves exercise IDs, increments versions, replaces child
  mappings atomically, and records an `exercise:reconcile` audit in the same
  advisory-locked transaction. It never activates, archives, restores, deletes,
  or recreates an exercise.
- The original development import predates complete create-audit provenance.
  Its immutable create and reconciliation events remain unchanged. A dedicated
  append-only attestation mode first verifies all 47 current drafts, mappings,
  media, versions, actors, and historical audit links against the pinned
  manifest, then writes one `exercise:provenance-attestation` per exercise in a
  single advisory-locked transaction. Incomplete legacy create evidence is
  rejected unless the genuine create event, reconciliation event, and exact
  attestation all agree.
- Attestation is all-or-nothing and idempotent. Missing, duplicate,
  contradictory, cross-tenant, wrong-actor, or caller-controlled evidence
  blocks the run. Exact existing attestations are skipped; historical audits
  and exercise rows are never edited.
- All records remain drafts. The source does not contain exercise-level
  difficulty or an explicit movement pattern, so none qualify for activation.
- Programme sets, reps, and rest remain source context in the report/internal
  provenance note; they are not written into definition fields.
- Legacy programme data remains the current workout consumer until a later,
  separately authorized cutover.

## Commands

From `artifacts/api-server`:

```sh
NODE_ENV=development node dist/import-exercise-catalogue.mjs \
  --tenant marcus-grima \
  --actor-id <same-tenant-admin-uuid>
```

Add `--apply --confirm-development-only` only after reviewing the dry-run JSON.
Re-running the dry-run after an import should report 47 skips, zero creates,
and zero conflicts.

The accepted one-time hardening reconciliation used:

```sh
NODE_ENV=development node dist/import-exercise-catalogue.mjs \
  --tenant marcus-grima \
  --actor-id <same-tenant-active-admin-uuid> \
  --reconcile \
  --confirm-development-only
```

The append-only provenance repair uses:

```sh
NODE_ENV=development node dist/import-exercise-catalogue.mjs \
  --tenant marcus-grima \
  --actor-id <same-tenant-active-admin-uuid> \
  --attest-provenance \
  --confirm-development-only
```

This mode is permitted only after the catalogue is already reconciled at
version 2. It changes only the append-only audit log. The first valid run writes
47 attestations; a second run writes zero and reports 47 exact skips.

## Development reconciliation

The accepted run produced:

- Source records: 47
- Unique slugs: 47
- Duplicate normalized names: `Face Pulls` (two source IDs, both preserved)
- Created drafts: 47
- Activated records: 0
- Verified media references: 21
- Records with a canonical primary muscle: 38
- Records awaiting primary-muscle review: 9
- Canonical muscle mappings: 75
- Equipment mappings: 18
- Import-scoped `exercise:create` audit records: 47, all attributed to the
  verified same-tenant admin through the CLI actor type
- Reconciled rows: 47, all preserving identity and advancing from version 1 to
  version 2
- Import-scoped `exercise:reconcile` audit records: 47
- Final unsupported metadata counts: zero performance types, zero lateralities,
  zero difficulties, and zero movement patterns
- Final dry-run and apply/no-op result: 47 exact skips, zero creates, zero
  conflicts, zero activations, and no row, mapping, timestamp, version, or audit
  changes

## Review manifest

“Review” means the legacy primary label is deliberately unsupported or
ambiguous. Every row also requires exercise-level difficulty and movement
pattern review before activation.

| Source ID | Name | Canonical primary | Media | Status |
| --- | --- | --- | --- | --- |
| pull-ups | Pull Ups | lats | yes | draft |
| seated-rows | Seated Rows | review | yes | draft |
| lat-pull-downs | Lat Pull Downs | lats | yes | draft |
| narrow-grip-pull-down | Narrow Grip Pull Down | lats | yes | draft |
| hyper-extension | Hyper Extension | lower_back | yes | draft |
| seated-hammer-curl | Seated Hammer Curl | biceps | yes | draft |
| concentration-curl | Concentration Curl | biceps | yes | draft |
| twentyone-curl | 21's with Dumbbell | biceps | yes | draft |
| flat-bench-press | Flat Bench Press | chest | yes | draft |
| incline-dumbbell-press | Incline Dumbbell Press | upper_chest | yes | draft |
| cable-flies-mid | Cable Flyes Mid Grip | chest | yes | draft |
| weighted-push-ups | Weighted Push Ups | chest | yes | draft |
| tricep-rope-extensions | Tricep Rope Extensions | triceps | yes | draft |
| skull-crushers | Skull Crushers | triceps | yes | draft |
| weighted-dips | Weighted Dips | triceps | yes | draft |
| seated-shoulder-press | Seated Shoulder Press | review | yes | draft |
| lateral-raises | Dumbbell Lateral Raises | side_delts | yes | draft |
| forward-raises | Dumbbell Forward Raises | front_delts | yes | draft |
| face-pulls | Face Pulls | rear_delts | yes | draft |
| rear-delt-fly | Rear Delt Fly | rear_delts | yes | draft |
| shrugs | Shrugs | traps | yes | draft |
| burpees | Burpees | review | no | draft |
| push-up-variations | Push-Up Variations | chest | no | draft |
| jump-squats | Jump Squats | quads | no | draft |
| mountain-climbers | Mountain Climbers | review | no | draft |
| plank-hold | Plank Hold | review | no | draft |
| pike-push-ups | Pike Push-Ups | review | no | draft |
| tricep-chair-dips | Tricep Chair Dips | triceps | no | draft |
| wide-push-ups | Wide Push-Ups | chest | no | draft |
| leg-raises | Leg Raises | review | no | draft |
| bulgarian-split-squats | Bulgarian Split Squats | quads | no | draft |
| glute-bridge-hold | Glute Bridge Hold | glutes | no | draft |
| reverse-lunges | Reverse Lunges | quads | no | draft |
| wall-sit | Wall Sit | quads | no | draft |
| inchworms | Inchworms | review | no | draft |
| spiderman-push-ups | Spiderman Push-Ups | chest | no | draft |
| squat-pulses | Squat Pulses | quads | no | draft |
| cable-chest-fly-low | Cable Chest Fly (Low) | chest | no | draft |
| db-lateral-raise-pump | Lateral Raises (Pump Set) | review | no | draft |
| incline-curl | Incline Dumbbell Curl | biceps | no | draft |
| rope-pushdown-pump | Rope Pushdown (High Rep) | triceps | no | draft |
| face-pull-pump | Face Pulls | rear_delts | no | draft |
| hammer-curl-beach | Hammer Curls | biceps | no | draft |
| leg-press-pump | Leg Press (High Rep) | quads | no | draft |
| hip-thrust-pump | Hip Thrusts | glutes | no | draft |
| leg-curl-pump | Lying Leg Curl | hamstrings | no | draft |
| calf-raise-pump | Standing Calf Raises | calves | no | draft |

The dry-run JSON is the detailed manifest: it includes source prescription,
normalized payload, omitted ambiguous values, compound-equipment warnings, and
review reasons for every row.