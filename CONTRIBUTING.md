# Contributing

Thanks for helping improve this project. This guide covers the local workflow, the module map that helps you find the right owners and tests, the contributor workflow for migration-backed features, and the validation commands CI runs.

## Getting started

1. Fork the repository and create a topic branch from `main`.
2. Install dependencies with `npm ci`.
3. Make your change, add focused tests, and run the validation commands below before opening a pull request.

## Module map

The contributor-ready module map lives at `docs/MODULE_MAP.md`. It is generated from maintained source metadata — primarily `.github/CODEOWNERS` and the repository layout — and lists, for each domain module:

- the module path and a short description,
- the owning team(s) from `CODEOWNERS`,
- the key test files that exercise the module,
- the validation commands to run before requesting review.

### Regenerating the map

After you add, move, or remove a module, or change ownership in `.github/CODEOWNERS`, regenerate the map:

```bash
npm run docs:module-map
```

Commit the regenerated `docs/MODULE_MAP.md` alongside your change. CI runs the same generator in check mode (`npm run docs:module-map:check`) and fails the build if the committed map is stale, so an out-of-date artifact will block your pull request.

### Failure behavior

The generator exits non-zero with a clear message when:

- `.github/CODEOWNERS` is missing or cannot be read,
- a `CODEOWNERS` entry cannot be parsed (for example, a pattern with no owners),
- a module has no matching owner in `CODEOWNERS`,
- a referenced key test path does not exist on disk.

Fix the underlying metadata rather than editing the generated file by hand; manual edits will be overwritten on the next regeneration.

## Creating a migration-backed feature

A migration-backed feature adds a persisted entity, a schema migration, tests, and a rollback path. Follow the full sequence below so the change is safe for existing data and clients.

### 1. Define the entity

Add the entity to the owning module (see `docs/MODULE_MAP.md` for the module path and owners). Keep the entity definition and its types in the module that owns the data:

```ts
// src/<module>/entities/<entity>.ts
export interface Widget {
  id: string;
  name: string;
  createdAt: string;
}
```

### 2. Author the migration

Create a new migration file in the migrations directory. Migrations must be forward-only and idempotent where possible, and must include a matching `down` step for rollback:

```ts
// migrations/<timestamp>-add-widget.ts
export async function up(db: MigrationClient): Promise<void> {
  await db.schema.createTable('widgets', (t) => {
    t.string('id').primary();
    t.string('name').notNullable();
    t.string('created_at').notNullable();
  });
}

export async function down(db: MigrationClient): Promise<void> {
  await db.schema.dropTable('widgets');
}
```

Apply the migration locally with the repository's migration tooling:

```bash
npm run migrate:up
```

### 3. Add tests

Add focused tests for the primary flow and for compatibility/regression risks (existing rows, nullability, and rollback):

```ts
// src/<module>/entities/<entity>.test.ts
describe('widgets migration', () => {
  it('creates the widgets table', async () => {
    await up(db);
    expect(await db.schema.hasTable('widgets')).toBe(true);
  });

  it('rolls back cleanly', async () => {
    await up(db);
    await down(db);
    expect(await db.schema.hasTable('widgets')).toBe(false);
  });
});
```

### 4. Roll back

If a migration fails or must be reverted, run the rollback step and confirm the schema returns to its prior state:

```bash
npm run migrate:down
```

Rollback semantics: `migrate:down` reverts the most recent applied migration. If the `down` step fails, the migration is left applied and the command exits non-zero — fix the `down` step and re-run rather than editing the database by hand.

### 5. Deploy

Document any schema, configuration, rollout, or user-facing contract changes in the pull request and confirm they are safe for existing data and clients. Deploy migrations before the code that depends on them, and keep the `down` step available until the rollout is verified.

### Failure and retry semantics

- **Validation:** a migration that references a missing table, column, or type fails fast and exits non-zero; nothing is partially applied.
- **Retry:** re-running `npm run migrate:up` is safe — already-applied migrations are skipped.
- **Authorization:** migrations run only through the deployment pipeline or a maintainer's local environment; do not run them against shared environments from a feature branch.

## Validation

Run the documentation checks locally before pushing:

```bash
npm run ci:doc-audit && npm run ci:doc-links
```

These are the same checks CI enforces. If they fail, address the reported issue and re-run until they pass.

## Pull requests

- Keep changes scoped to the issue you are solving; avoid unrelated refactors.
- Include tests for the primary flow and for the privacy, compatibility, and regression risks specific to your change.
- Document any schema, configuration, rollout, or user-facing contract changes and confirm they are safe for existing data and clients.
- Make sure the module map is regenerated and committed when ownership or module layout changes.
