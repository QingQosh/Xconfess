# Contributor Issue Backlog

These issues are ready to create in GitHub once repository authentication is restored. Each one is scoped for a focused contributor pull request with clear acceptance criteria.

## 1. Replace deprecated Edge runtime usage in frontend proxy routes

Labels: `frontend`, `nextjs`, `good first issue`

Next.js 16 warns that the Edge Runtime is deprecated during production builds. Audit frontend route handlers, proxy files, and middleware-style code that explicitly opts into edge runtime and move eligible handlers to the Node.js runtime.

Acceptance criteria:
- `npm run frontend:build` completes without the Edge Runtime deprecation warning.
- Auth/session and API proxy behavior remains covered by existing tests.
- Any route that must remain edge-based is documented with a short code comment explaining why.

## 2. Add deployment smoke checks for frontend auth and dashboard routes

Labels: `frontend`, `testing`, `deployment`

Add a small Playwright smoke suite that verifies deployed frontend routes load after a production build: home, login, register, dashboard redirect behavior, and admin redirect behavior.

Acceptance criteria:
- The smoke test can run against `BASE_URL`.
- Tests verify page shell rendering and no missing Next static assets.
- The suite is wired into CI or documented as a release-gate command.

## 3. Improve backend test log hygiene

Labels: `backend`, `testing`, `developer-experience`

The backend Jest suite passes, but expected error-path tests emit a large amount of Nest error output. Reduce noisy logs in tests without hiding real failures.

Acceptance criteria:
- `npx jest --config jest.config.js --runInBand --silent` remains green.
- Test logs no longer obscure pass/fail summaries in normal runs.
- Error-path assertions still verify that important log calls occur.

## 4. Resolve backend Jest open-handle warning

Labels: `backend`, `testing`, `quality`

The backend test run completes successfully but Jest reports that it did not exit cleanly. Identify the open handle and close it in the relevant test setup or teardown.

Acceptance criteria:
- Backend Jest exits without the open-handle warning.
- No production code is weakened just to satisfy tests.
- Add a short note in the relevant test helper if teardown behavior is non-obvious.

## 5. Add production environment validation examples

Labels: `docs`, `deployment`, `good first issue`

The backend now validates required environment variables strictly. Improve deployment docs with copy-ready examples for staging and production without exposing real secrets.

Acceptance criteria:
- Document required backend variables including database, JWT, encryption, CORS, Redis, and public API URLs.
- Include exact health check endpoints: `/api/health/live` and `/api/health/ready`.
- Include guidance that frontend API URLs should include `/api`.

## 6. Add admin responsive visual regression coverage

Labels: `frontend`, `admin`, `testing`

The admin layout has mobile drawer and desktop sidebar states. Add coverage that protects both layouts from regressions.

Acceptance criteria:
- Playwright screenshots or DOM assertions cover mobile and desktop admin navigation.
- Tests verify the drawer opens, closes, traps focus, and restores focus.
- Existing admin auth tests remain green.

## 7. Tighten service worker handling for Next static assets

Labels: `frontend`, `pwa`, `bug`

A stale service worker can intercept `_next/static` requests and produce MIME/404 errors during local development. Improve the service worker strategy so Next build assets are fetched network-first and failures do not poison the cache.

Acceptance criteria:
- `_next/static/*` requests bypass stale cached text/plain responses.
- Local dev no longer logs repeated `FetchEvent` network errors for Next chunks.
- Add a regression test or documented manual verification steps.

## 8. Create contributor-friendly seed data scenarios

Labels: `backend`, `developer-experience`, `database`

Improve seed data so contributors can quickly test normal user, admin, feed, moderation, and notification workflows locally.

Acceptance criteria:
- `npm run seed` works from the repo root with path aliases resolved.
- Seed output lists created accounts and local login credentials.
- Data includes at least one admin, one normal user, several confessions, reactions, comments, and reports.

## 9. Add deployment rollback runbook

Labels: `docs`, `deployment`, `operations`

Create a short rollback runbook for the current SSH/PM2 deployment workflow.

Acceptance criteria:
- Documents how to identify the last successful GitHub Actions deployment.
- Explains backend-first rollback and frontend-second rollback.
- Includes health check commands for backend readiness and frontend route smoke checks.

## 10. Polish empty and error states across secondary screens

Labels: `frontend`, `design`, `good first issue`

Audit secondary screens such as messages, search, analytics, settings, and notifications for inconsistent empty/error copy and styling.

Acceptance criteria:
- Empty and error states use concise professional copy.
- States use the shared brand surfaces and button styles.
- Screens remain accessible with meaningful headings and labelled actions.

## 11. Add a contributor workflow for creating migration-backed features

Labels: `docs`, `backend`, `database`, `developer-experience`

Document the complete sequence for shipping a feature that requires a database migration: entity definition, migration authoring, tests, rollback, and deployment. Examples must be runnable against the repository's actual migration tooling and npm scripts.

Acceptance criteria:
- The workflow documents each stage in order: entity definition, migration authoring, tests, rollback, and deployment.
- Every command and code snippet is runnable against the repository's real migration tooling and npm scripts.
- Success, validation/authorization, and failure/retry semantics are stated explicitly for the migration workflow.
- Focused automated tests cover the primary flow plus compatibility and regression risks (documented commands and paths exist, rollback steps are present).
- `npm run ci:doc-audit && npm run ci:doc-links` passes.

### Contributor workflow: migration-backed features

This is the end-to-end sequence for adding a feature that needs a schema change. Follow the stages in order; each stage has an explicit success signal and a failure/retry path.

#### Stage 1 — Define the entity

Add or extend the TypeORM entity under `backend/src/**/entities`. Keep the entity change additive (new nullable columns or new tables) so existing rows and clients keep working.

```ts
// backend/src/features/entities/feature-flag.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  key: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;
}
```

- Success: the entity compiles and is registered wherever the app's entity list lives.
- Validation: new columns are nullable or have defaults; no destructive type changes.
- Failure/retry: if the entity fails to compile, fix the type before authoring a migration — never hand-edit generated migrations to compensate.

#### Stage 2 — Author the migration

Generate a migration from the entity diff, then review it before committing.

```bash
# Generate a migration from the current entity state
npm run migration:generate -- backend/src/migrations/AddFeatureFlags

# Apply pending migrations locally
npm run migration:run

# Inspect what is pending without applying
npm run migration:show
```

- Success: `migration:run` applies cleanly and `migration:show` reports no pending migrations.
- Validation: the generated `up()` is additive and the `down()` fully reverses it.
- Failure/retry: if `migration:run` fails, fix the migration and re-run; if a migration was partially applied, revert with `npm run migration:revert` before retrying.

#### Stage 3 — Test the feature

Add focused tests for the primary flow and the compatibility/regression risks (existing rows, default values, rollback).

```bash
# Backend unit/integration tests
npx jest --config jest.config.js --runInBand
```

- Success: the new tests pass alongside the existing suite.
- Validation: tests cover the happy path, invalid input rejection, and that pre-existing data still reads correctly after the migration.
- Failure/retry: a failing migration test means the schema change is not backward compatible — adjust the entity/migration, not the test.

#### Stage 4 — Roll back safely

Every migration must be reversible. Verify the rollback path before deploying.

```bash
# Revert the most recent migration
npm run migration:revert

# Confirm the schema is back to the expected state
npm run migration:show
```

- Success: `migration:revert` runs the `down()` cleanly and `migration:show` reflects the reverted state.
- Validation: re-running `migration:run` after a revert restores the schema (round-trip check).
- Failure/retry: if `down()` fails, stop and fix it before deploying — an irreversible migration must not ship.

#### Stage 5 — Deploy

Migrations run as part of the backend deploy. Deploy the backend (which applies migrations) before the frontend that depends on the new contract.

```bash
# Backend deploy applies pending migrations, then restarts
# (see DEPLOYMENT.md for the SSH/PM2 sequence)
curl -fsS https://<backend-host>/api/health/ready
```

- Success: `/api/health/ready` returns healthy after the backend restart.
- Validation: confirm `migration:show` on the target reports no pending migrations.
- Failure/retry: if readiness fails, follow the rollback runbook (issue #9) — revert the migration and redeploy the previous backend build before touching the frontend.

#### Documentation checks

Run the documentation gates before opening the PR:

```bash
npm run ci:doc-audit && npm run ci:doc-links
```
