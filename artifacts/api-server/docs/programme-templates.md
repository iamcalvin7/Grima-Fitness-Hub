# Programme template publishing API

Programme templates are tenant-scoped stable identities. Content lives in
numbered revisions; a published revision and its ordered days and exercise
prescriptions are immutable. A template may have one current draft and one
current published revision.

## Client contract

Authenticated clients (and admins) can use:

* `GET /api/programmes`
* `GET /api/programmes/:id`

Only published, non-archived templates in the caller's tenant are returned.
Trainers are not granted this client surface by the current role policy.

## Admin contract

* `GET /api/admin/programmes`
* `GET /api/admin/programmes/:id`
* `POST /api/admin/programmes`
* `PATCH /api/admin/programmes/:id/draft` (the `If-Match` header is the draft
  revision version)
* `POST /api/admin/programmes/:id/replacement-draft`
* `POST /api/admin/programmes/:id/publish` (the `If-Match` header is the draft
  revision version)
* `POST /api/admin/programmes/:id/archive` (the `If-Match` header is the
  stable template version and a non-empty `reason` is required). A published
  programme with a replacement draft cannot be archived; the API returns
  `409 programme_has_draft` until that draft is published.

Create and edit payloads contain `name`, optional `slug`, `description`,
`difficulty`, `goal`, and ordered `days`. Each day contains `name`,
`estimatedMinutes`, and ordered `exercises`; each prescription contains
`exerciseId`, `sets`, `reps`, optional `restSeconds`, and optional `notes`.
Exercise IDs must be active records in the same tenant. Identity, status,
versions, actor IDs, timestamps, and tenant IDs are server-controlled.

The importer is development-only and dry-run by default:

```sh
NODE_ENV=development pnpm --filter @workspace/api-server run import:programmes \
  --tenant <tenant-slug> --actor-id <admin-uuid>
```

Write mode requires both `--write` and `--confirm-development-only`. It pins
the bundled source hash/version, maps source exercise IDs deterministically to
active same-tenant catalogue records, creates draft revisions only, and
rolls back on any ambiguity, missing mapping, conflict, or invalid source.