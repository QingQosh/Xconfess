# Contributor Guide

This guide is the starting point for external contributors working on xConfess.
It ties together local setup, issue selection, branch names, pull request
linking, validation commands, and review handoff.

## Choosing Work

Before starting work, choose an open issue, check that it is not already
assigned, and look for an existing pull request that mentions the same issue
number or title. If the issue is unclear or broad, ask a maintainer to confirm
scope before opening a large PR.

## Local Setup

Run these commands from a fresh clone of the repository.

```bash
git clone https://github.com/Xconfess/Xconfess.git
cd Xconfess
npm install
```

Start the local infrastructure:

```bash
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
```

Copy the local environment templates:

```bash
cp xconfess-backend/.env.example xconfess-backend/.env
cp xconfess-frontend/.env.example xconfess-frontend/.env.local
```

The example files are intentionally safe for local development. Do not commit
`.env` or `.env.local`, and do not paste private keys, tokens, passwords, or
production credentials into issues, pull requests, screenshots, or logs.

For a faster local UI workflow, you may add this value to
`xconfess-frontend/.env.local`:

```bash
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

## Running The App

Run the full stack from the repository root:

```bash
npm run dev
```

Or run one service at a time:

```bash
npm run dev:backend
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Live health check: `http://localhost:5000/api/health/live`
- Readiness health check: `http://localhost:5000/api/health/ready`
- Postgres: `localhost:55432`
- Redis: `localhost:6379`

## Branch Naming

Use a small, issue-focused branch name:

```bash
git checkout -b docs/contributor-guide
git checkout -b fix/comment-search-proxy
git checkout -b test/wave-demo-journey-smoke
```

Keep each branch scoped to one issue. Avoid unrelated formatting, generated
files, dependency upgrades, or cleanup unless the issue explicitly asks for them.

## Validation Commands

Run the smallest relevant check while developing, then run the full CI command
before opening the pull request when practical.

```bash
# Backend only
npm run backend:build
npm run backend:lint
npm run backend:test

# Frontend only
npm run frontend:lint
npm run frontend:test
npm run frontend:build

# Contracts only
npm run contract:fmt:check
npm run contract:lint
npm run contract:test
npm run contract:build:release

# Full repository check
npm run ci
```

If a full check cannot run locally because a dependency, Docker service, or
platform tool is unavailable, document the failed command and the exact blocker
in the pull request body.

## Creating A Migration-Backed Feature

This section walks through the complete sequence for adding a feature that
persists data: entity definition, migration authoring, tests, rollback, and
deployment. Follow the steps in order; each step has a runnable command or code
snippet validated against the repository's migration tooling.

### 1. Define The Entity

Add the entity under `xconfess-backend/src/` next to the feature it belongs to.
Keep the entity declarative and let the migration own the schema.

```ts
// xconfess-backend/src/example/example.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
```

Register the entity with the backend data source so both the app and the
migration CLI see it. Do not rely on `synchronize: true`; schema changes must
always go through a migration.

### 2. Author The Migration

Generate a migration from the entity diff, then review the generated file
before committing it.

```bash
npm run backend:migration:generate -- src/migrations/AddExamples
```

If the generator is unavailable, create the file by hand under
`xconfess-backend/src/migrations/` using the same timestamped naming convention
and implement both `up` and `down`:

```ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddExamples1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'examples',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('examples');
  }
}
```

Apply and inspect migrations locally:

```bash
npm run backend:migration:run
npm run backend:migration:show
```

### 3. Test The Feature

Add focused tests that cover the primary flow plus the compatibility and
regression risks specific to the change (existing rows, nullable columns,
backfill behavior). Run them with:

```bash
npm run backend:test
```

### 4. Roll Back Safely

Every migration must be reversible. Verify the `down` path locally before
opening the pull request:

```bash
npm run backend:migration:revert
npm run backend:migration:run
```

If a migration cannot be safely reversed (for example a destructive column
drop), document the manual rollback steps in the pull request and in
`DEPLOYMENT.md`.

### 5. Deploy

Migrations run as part of the deployment pipeline before the new application
version serves traffic. See `DEPLOYMENT.md` for the rollout and rollback
sequence. Do not run migrations manually against production outside that
pipeline.

### Success, Validation, And Failure Semantics

- **Success:** the migration applies cleanly, `backend:migration:show` lists it
  as executed, and the feature's tests pass.
- **Validation/authorization:** only the deployment pipeline (or an authorized
  maintainer locally) may run migrations; contributors cannot apply migrations
  to shared environments.
- **Failure/retry:** a failed migration aborts the deployment and leaves the
  previous version serving traffic. Fix the migration in a new commit and
  re-run the pipeline; do not hand-edit applied migrations. If a migration
  partially applied, use `backend:migration:revert` to return to the last good
  state before retrying.

## Advanced Search Query Grammar

Advanced search is parsed and enforced by the backend at the owning boundary
(`backend/src/search`). The parser accepts only the documented grammar below;
anything outside it is rejected with a stable validation error rather than
being silently interpreted or forwarded to the database.

### Allowlisted Fields

Only these fields may appear on the left of an operator:

- `author` — message author handle
- `conversation` — conversation id
- `tag` — message tag
- `before` / `after` — ISO-8601 date bounds
- `has` — attachment presence (`has:attachment`)

Any other field name is rejected with `SEARCH_UNKNOWN_FIELD`.

### Allowlisted Operators

- `field:value` — equality match
- `field:"quoted value"` — equality match with spaces
- `-field:value` — negation
- Bare terms (no operator) are treated as full-text terms

Operators outside this set (for example `field>value`, `field~value`, or
wildcards like `field:*`) are rejected with `SEARCH_UNSUPPORTED_OPERATOR`.

### Complexity Limits

The parser caps query complexity so a single request cannot trigger an
expensive scan. Exceeding any limit is rejected with `SEARCH_QUERY_TOO_COMPLEX`:

- Maximum of 32 tokens per query
- Maximum of 16 clauses (field matches plus bare terms)
- Maximum nesting depth of 2 (one level of parentheses)
- Maximum of 256 characters per quoted value

### Validation Error Codes

Malformed or disallowed expressions return a stable error code and message so
clients can render consistent feedback:

| Code | Meaning |
| --- | --- |
| `SEARCH_EMPTY_QUERY` | Query is empty or whitespace only |
| `SEARCH_UNKNOWN_FIELD` | Field is not in the allowlist |
| `SEARCH_UNSUPPORTED_OPERATOR` | Operator is not in the allowlist |
| `SEARCH_UNBALANCED_QUOTES` | Quoted value is not terminated |
| `SEARCH_UNBALANCED_PARENS` | Parentheses are unbalanced |
| `SEARCH_QUERY_TOO_COMPLEX` | A complexity limit was exceeded |

### Failure Semantics

- Invalid queries are rejected before any database access; they never reach
the query builder.
- Rejections return `400 Bad Request` with the error code above and a
  human-readable message; they are not retried automatically.
- Authorization is checked before parsing, so unauthorized callers receive
  `403` regardless of query validity.

### Testing Expectations

Backend tests for this area must cover the expected path plus adversarial
inputs (unknown fields, unsupported operators, unbalanced quotes/parens, and
queries that exceed the complexity caps) and the regression risk of a
malformed query reaching the database. Run them with:

```bash
npm run backend:test
```

## Message Retention And Expiry

Private messages have an explicit, enforceable lifecycle. Retention is chosen
per conversation and enforced by the backend at the ownership boundary; clients
must not assume messages live forever or that local copies outlive the server.

### Supported Retention Choices And Defaults

Moderation reviewers interpret ambiguous policy cases. To keep decisions
consistent without letting consensus replace policy review, reviewer guidance is
versioned and reviewers are calibrated against anonymized exercises.

### Versioned Annotation Guidelines

- Guidelines are versioned; every review decision records the guideline version
  it was made under so past decisions remain reproducible.
- Publishing a new guideline version is an authorized action (moderator/admin)
  enforced at the owning backend boundary; unauthorized publishes are rejected
  with `403`.
- A decision referencing an unknown or retired guideline version is rejected
  with `422` rather than silently falling back to the latest version.

### Anonymized Calibration Exercises

- Calibration exercises present anonymized cases (no reporter or author
  identity) so reviewers judge the policy question, not the person.
- Exercise responses are stored separately from live moderation decisions and
  never affect a real case outcome.
- Only authorized reviewers may fetch exercises or submit responses;
  unauthorized access is rejected at the boundary.

### Measuring Agreement

- Reviewer agreement (e.g. inter-rater agreement such as Cohen's or Fleiss'
  kappa) is computed over calibration responses and reported as a signal.
- Agreement is **not** a substitute for policy review: a high-agreement but
  policy-incorrect answer is still wrong, and consensus never auto-resolves a
  live case.
- Agreement metrics are advisory; final decisions remain with authorized
  reviewers applying the current guideline version.

### Testing Expectations

Backend tests for this area must cover the expected path plus rejection cases
(unauthorized guideline publish, unknown guideline version, unauthorized
calibration access) and the regression risk that agreement metrics are treated
as advisory rather than as an automatic decision. Run them with:

```bash
npm run backend:test
```

## Safe Policy Replay

Policy migrations need a way to estimate how decisions would change under a new
policy version **without** touching live user content or notifying anyone. The
replay command runs over a selected set of moderation cases in isolation.

### Running A Replay

```bash
npm run 
