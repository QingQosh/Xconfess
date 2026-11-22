# Performance Baseline

This document defines the frontend bundle and hydration budgets for representative
routes, the service-level startup budgets for backend and frontend cold-start
phases, how they are measured, and how CI enforces them. Budgets exist so that
large dependencies and client components cannot silently regress initial load or
hydration time, and so that cold-start regressions are caught against documented
numbers rather than anecdotal timing.

## Representative routes

Budgets are checked on the routes that exercise the heaviest client surfaces:

| Route | Description |
| --- | --- |
| `/` | Landing / marketing shell |
| `/dashboard` | Authenticated dashboard |
| `/composer` | Composer / editor surface |
| `/settings` | Settings and account management |

## Budgets

Budgets are expressed as gzipped transfer sizes for the JavaScript that a route
loads on first paint, plus a hydration time ceiling measured on a throttled
profile.

| Route | Initial JS (gzip) | Route chunk (gzip) | Hydration (ms) |
| --- | --- | --- | --- |
| `/` | 170 KB | 60 KB | 1200 |
| `/dashboard` | 220 KB | 90 KB | 1800 |
| `/composer` | 260 KB | 120 KB | 2200 |
| `/settings` | 200 KB | 80 KB | 1600 |

Shared framework/runtime code counts toward the initial JS budget. Route chunks
are the code that is only needed once the route is entered and should be loaded
via dynamic `import()` so it does not inflate the initial payload.

## Service-level startup budgets

Cold-start is measured per phase so a regression can be attributed to the owning
boundary instead of a single opaque number. Each phase has a documented ceiling
in milliseconds; a run passes only when every phase is at or below its budget.

| Service | Phase | Budget (ms) |
| --- | --- | --- |
| backend | `config_load` | 150 |
| backend | `db_connect` | 800 |
| backend | `route_register` | 250 |
| backend | `ready` | 1200 |
| frontend | `bundle_parse` | 400 |
| frontend | `first_paint` | 900 |
| frontend | `hydrate` | 1200 |
| frontend | `ready` | 1500 |

Phase budgets are the source of truth for the startup harness; the harness reads
this table so the numbers live in one place. A phase that is not reported by a
run is treated as a failure (missing phase data), not as zero.

## Measuring startup

1. Build the production artifacts (`npm run frontend:build` and the backend
   build) so cold-start reflects shipped code.
2. Run the startup harness (`npm run benchmark:triage:test`), which records each
   phase for backend and frontend and compares it to the budgets above.
3. Run the frontend budget check (`npm run frontend:budget`) for bundle and
   hydration budgets.

The harness is repeatable: it discards warm-up runs, reports the median of the
remaining samples, and prints measured value, budget, and delta per phase.

## Enforcing in CI

The frontend pipeline runs the budget checks after the production build. A
violation fails the job and prints the offending route or phase, the measured
value, the budget, and the delta so the regression is actionable:

```
FAIL /composer
  initial JS: 281.4 KB (budget 260 KB, +21.4 KB)
  hydration:  2410 ms (budget 2200 ms, +210 ms)
  largest contributors:
    +18.2 KB  some-heavy-dependency
    +6.1 KB   ./components/ComposerEditor

FAIL backend:db_connect
  measured: 940 ms (budget 800 ms, +140 ms)
```

When a budget is exceeded, either reduce the payload/phase time or raise the
budget with a justification in the pull request. Raising a budget without
justification is not accepted.

## Failure and invalid-input semantics

- A malformed budget config (non-numeric or negative budget) fails the run with
  a clear error instead of silently skipping the check.
- A missing phase in a measurement run fails the run; phases are never assumed
  to be zero.
- A failed measurement operation (build error, harness crash) fails the job and
  is reported as an error, distinct from a budget violation.

## Oversized imports

The budget check reports the largest contributors to each route's payload. Any
single dependency or module that adds more than 10 KB (gzip) to a route's initial
payload is flagged for review. Prefer:

- dynamic `import()` for code that is only needed after interaction or on a
  specific route,
- route-level code splitting so heavy surfaces do not load on first paint,
- lighter alternatives when a dependency is only used for a small feature.

## Hydration

Hydration budgets cover the time from first paint to the route becoming
interactive on a throttled profile. Regressions usually come from large client
component trees or work done during hydration. Keep client components scoped to
the smallest subtree that needs interactivity and defer non-critical work until
after hydration.

## Validation

Run the full validation before opening a pull request:

```
npm run benchmark:triage:test && npm run frontend:budget
```

And the full frontend validation:

```
npm run frontend:lint && npm run frontend:typecheck && npm run frontend:test && npm run frontend:build
```
