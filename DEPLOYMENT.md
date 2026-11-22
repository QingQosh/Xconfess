# Deployment

This document covers how releases are cut, validated, and rolled back for the
application and its database schema. It also defines the **rollback evidence
archive** used to record application and schema rollback drills, and the
**contributor workflow** for shipping a migration-backed feature.

## Release compatibility gate

Before any release is promoted, run:

```sh
npm run check:release-compatibility && npm run secret-scan:artifacts
```

`check:release-compatibility` verifies that the current application build is
compatible with the schema version it will run against. `secret-scan:artifacts`
scans build and release artifacts for leaked credentials. Both must pass.

## Contributor workflow: migration-backed features

A migration-backed feature ships in five ordered stages. Each stage has a
runnable command and a clear pass/fail signal. Do not skip ahead: a later stage
assumes the previous one passed.

### 1. Define the entity

Add the entity to the persistence layer alongside its existing siblings. Keep
the definition additive — new columns are nullable or carry a default so
pre-existing rows remain valid.

```ts
// src/db/entities/example.ts
export const exampleEntity = {
  table: 'examples',
  columns: {
    id: { type: 'uuid', primaryKey: true },
    label: { type: 'text', notNull: true },
    createdAt: { type: 'timestamptz', notNull: true, default: 'now()' },
  },
} as const;
```

### 2. Author the migration

Generate the migration from the entity definition, then review the generated
up/down pair before committing. Every migration **must** include a working
`down` step.

```sh
npm run db:migration:generate -- --name add_examples
npm run db:migration:status
```

`db:migration:status` must report the new migration as `pending` and no
unexpected drift. If it reports drift, reconcile the entity definition before
continuing.

### 3. Test the migration

Run the focused migration tests plus the full suite. Tests must cover the
primary flow and the compatibility/regression risks (existing rows survive the
up migration; the down migration restores the prior schema).

```sh
npm run test:migrations && npm test
```

### 4. Roll back

Prove the down migration works before deploying. Apply it, confirm the schema
returns to the prior version, then re-apply the up migration.

```sh
npm run db:migration:down && npm run db:migration:status
npm run db:migration:up && npm run db:migration:status
```

Record the schema rollback drill in the evidence archive (see below).

### 5. Deploy

Promote only after the compatibility gate and both rollback drills pass:

```sh
npm run check:release-compatibility && npm run secret-scan:artifacts
```

### Success, validation, and failure semantics

- **Success** — the migration applies cleanly, tests pass, and the down
  migration restores the prior schema.
- **Validation** — a migration without a `down` step, or one that introduces a
  non-nullable column without a default on a populated table, is rejected in
  review and by `db:migration:status` drift checks.
- **Authorization** — only the release pipeline identity may apply migrations in
  shared environments; local application credentials cannot.
- **Failure / retry** — a failed migration is rolled back to the last applied
  version before retrying. Re-running an already-applied migration is a no-op
  (idempotent on migration id), so retries are safe.

## Rollback drills

Two kinds of rollback drills are exercised before a release is considered
safe to promote:

- **Application rollback** — redeploy the previous application build against the
  current schema.
- **Schema rollback** — apply the down migration for the release's schema change
  while the previous application build is running.

Each drill produces an evidence record (see below). A release is not eligible
for promotion until both drill records exist for the release under test.

## Rollback evidence archive

The evidence archive lives at the owning release boundary (the release
pipeline), not in application runtime storage. Records are written by the
release tooling and are read-only to application code.

### Record shape

Each archived record contains:

| Field | Description |
| --- | --- |
| `id` | Stable record identifier. |
| `releaseId` | Release the drill was run against. |
| `drillType` | `application` or `schema`. |
| `startedAt` / `completedAt` | Drill timestamps (ISO 8601, UTC). |
| `durationMs` | Wall-clock duration of the drill. |
| `inputs` | **Sanitized** drill inputs only. |
| `decisionPoints` | Ordered list of `{ at, decision, rationale }` entries. |
| `outcome` | `success`, `failed`, or `aborted`. |
| `failureReason` | Present only when `outcome` is not `success`. |
| `retentionUntil` | Timestamp after which the record is eligible for purge. |

### Sanitization

Drill inputs are sanitized before they are persisted. Raw secrets, tokens,
connection strings, and unsanitized request/response payloads are **never**
written to the archive. Only the fields required to reproduce the decision
points are retained; everything else is redacted at capture time. Records that
fail sanitization are rejected rather than stored partially.

### Retention

- Records are retained for the configured retention window (default 180 days)
  and carry an explicit `retentionUntil` timestamp.
- Records past `retentionUntil` are purged by the release tooling; purging is
  idempotent and safe to retry.
- Records for a release that is still under active rollback investigation are
  pinned and excluded from purge until the investigation is closed.

### Access controls

- Writing records requires the release pipeline identity; application runtime
  credentials cannot write to the archive.
- Reading records requires an operator role with release-audit permission.
- Access is logged; reads of records containing `failureReason` are audited.

### Success, validation, and failure semantics

- **Success** — the drill completes and a sanitized record with
  `outcome: "success"` is archived.
- **Validation** — a record missing required fields, carrying an unknown
  `drillType`, or failing sanitization is rejected with a validation error and
  is not persisted.
- **Authorization** — a write or read from an identity without the required
  permission is rejected and audited; no partial record is written.
- **Failure / retry** — a drill that fails is archived with `outcome: "failed"`
  and a `failureReason`. Archive writes are retried with backoff on transient
  storage errors; retries are idempotent on `id`, so a repeated write does not
  create duplicate records. A drill may be re-run, producing a new record that
  supersedes the failed one for promotion purposes.

## Compatibility and existing data

The archive is additive: existing releases without drill records remain valid,
and the compatibility gate treats a missing record as "not yet drilled" rather
than as a failure of previously released data. No application schema change is
required to adopt the archive. Migration-backed features follow the same rule:
migrations are additive and safe for existing data and clients.
