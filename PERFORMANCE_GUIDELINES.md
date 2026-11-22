# Performance Optimization Guidelines

## Quick Reference

This guide provides best practices for maintaining the performance improvements achieved in Issue #137..

## Backend Guidelines

### Database Queries

**DO:**
- Use indexes for frequently queried columns
- Use eager loading with `leftJoinAndSelect()` for relations
- Select only required fields with `.select()`
- Use query builders for complex queries
- Implement pagination for all list endpoints

**DON'T:**
- Load unnecessary relations
- Use SELECT * in production
- Create N+1 queries
- Skip WHERE clauses on large tables

### Caching Strategy

**Pattern:**
```typescript
// 1. Check cache
const cached = await this.cacheService.get(key);
if (cached) return cached;

// 2. Fetch from database
const data = await this.repository.find(...);

// 3. Cache result
await this.cacheService.set(key, data, ttl);

return data;
```

**TTL Guidelines:**
- Static data: 1 hour (3600s)
- User-specific: 15 minutes (900s)
- Lists: 5 minutes (300s)
- Real-time: 1 minute (60s)

**Cache Invalidation:**
```typescript
// Invalidate specific patterns
await this.cacheService.delPattern('confessions:');

// NEVER use reset() in production
// await this.cacheService.reset(); // ❌ DON'T
```

### API Response Optimization

**Compression:** Automatically enabled for responses > 1KB

**Field Selection:**
```typescript
// Good: Select only needed fields
.select(['id', 'message', 'createdAt'])

// Bad: Load everything
.find() // Returns all fields
```

## Frontend Guidelines

### Code Splitting

**Dynamic Imports:**
```typescript
// Heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false // if not needed on server
});
```

**When to use:**
- Charts and visualizations
- Admin panels
- Third-party libraries (Stellar SDK)
- Modal content

### React Performance

**Memoization:**
```typescript
// Always add comparison function
const MyComponent = memo(({ data }) => {
  return <div>{data.name}</div>;
}, (prev, next) => {
  return prev.data.id === next.data.id;
});
```

**Hooks:**
```typescript
// useMemo for expensive calculations
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.value, 0);
}, [items]);

// useCallback for functions passed to children
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Image Optimization

**Always use Next.js Image:**
```typescript
<Image
  src={url}
  alt="Description"
  width={400}
  height={300}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Image CDN (if using Cloudinary):**
```typescript
import { optimizeImageUrl } from '@/lib/performance-utils';

const optimizedUrl = optimizeImageUrl(originalUrl, 800);
```

### API Calls

**Debouncing:**
```typescript
import { useDebounce } from '@/lib/hooks/useDebounce';

const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);

useEffect(() => {
  if (debouncedQuery) {
    fetchResults(debouncedQuery);
  }
}, [debouncedQuery]);
```

**Request Deduplication:**
React Query automatically deduplicates requests.

## Database Guidelines

### Index Maintenance

**Review indexes quarterly:**
```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (high seq scans)
SELECT schemaname, tablename, seq_scan, seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC;
```

### Query Optimization Checklist

- [ ] Query uses indexes (check with EXPLAIN ANALYZE)
- [ ] No N+1 queries (use eager loading)
- [ ] Proper pagination implemented
- [ ] Only necessary fields selected
- [ ] WHERE clauses on indexed columns
- [ ] JOIN conditions on indexed columns

## Monitoring

### Backend Metrics to Watch

**Response Times:**
- P50: < 100ms
- P95: < 200ms
- P99: < 500ms

**Database:**
- Query time: < 100ms avg
- Connection pool: 5-20 connections
- Cache hit rate: > 75%

**Alerts:**
- API response > 300ms
- Database query > 150ms
- Cache hit rate < 70%
- Connection pool exhausted

### Frontend Metrics to Watch

**Core Web Vitals:**
- LCP: < 2.5s (Good)
- FID: < 100ms (Good)
- CLS: < 0.1 (Good)

**Custom Metrics:**
- Initial bundle: < 200KB
- TTI: < 3s
- Route transition: < 300ms

## Performance Budget

### Backend Budget

| Resource | Limit | Alert At |
|----------|-------|----------|
| API Response | 200ms | 300ms |
| Database Query | 100ms | 150ms |
| Cache Hit Rate | > 75% | < 70% |

### Frontend Budget

| Resource | Limit | Alert At |
|----------|-------|----------|
| Initial JS | 200KB | 250KB |
| Page Load | 2s | 2.5s |
| LCP | 2.5s | 3s |
| CLS | 0.1 | 0.15 |

## Service-Level Startup Budget

Cold-start is measured as a sequence of named phases at the owning boundary so regressions are attributed to a phase rather than to anecdotal "it feels slow" timing. The budgets below are the source of truth for the startup check; keep them in sync with the budget config used by the harness.

### Backend Cold-Start Phases

| Phase | Budget | Notes |
|-------|--------|-------|
| `config` | 50ms | Env/config load and validation |
| `database` | 500ms | Connection pool warm-up |
| `cache` | 100ms | Cache client connect |
| `modules` | 300ms | Nest module graph init |
| `listen` | 100ms | Bind HTTP listener |
| **total** | **1000ms** | Sum of phases |

### Frontend Cold-Start Phases

| Phase | Budget | Notes |
|-------|--------|-------|
| `bootstrap` | 150ms | App shell / provider mount |
| `route` | 400ms | First route render |
| `hydration` | 300ms | React hydration |
| **total** | **800ms** | Sum of phases |

### Running the Startup Budget Check

```bash
# Backend + frontend cold-start phases against documented budgets
npm run benchmark:triage:test
```

The harness emits one line per phase (`phase`, `measured`, `budget`, `status`) and exits non-zero when any phase exceeds its budget or a required phase is missing from the measurement.

### Pass / Fail Semantics

- **Pass:** every required phase is present and `measured <= budget` for each phase and for the total.
- **Fail (over budget):** a phase or total exceeds its budget; the report names the phase, measured value, and budget.
- **Fail (invalid input):** a malformed budget config (non-numeric, negative, or missing budget) or a measurement missing a required phase fails fast with a descriptive error instead of silently passing.
- **Fail (measurement error):** if a phase throws during measurement, the harness records the failure and exits non-zero; it does not retry silently.

### Regression Evidence

When a startup budget changes, attach the harness output (per-phase measured vs. budget) to the PR so reviewers can see the delta against the documented budgets rather than relying on anecdotal timing.

## Per-Route Bundle & Hydration Budgets

Initial JavaScript budgets are enforced per representative route so a single heavy page cannot silently regress initial load. The values below are the source of truth for the CI budget check; keep them in sync with the budget config used by the build. Hydration thresholds remain profiling targets and are not measured by the bundle check.

### Representative Routes

| Route | Initial JS (gzip) | Hydration (TBT) | Notes |
|-------|-------------------|-----------------|-------|
| `/` (home) | 200KB | 200ms | Marketing/landing surface |
| `/confessions` | 250KB | 300ms | Primary confession list |
| `/confessions/[id]` | 250KB | 300ms | Detail view |
| `/admin` | 350KB | 400ms | Admin panel, heavy tables |

### Hydration Thresholds

- **Total Blocking Time (TBT):** must stay under the per-route limit above.
- **Long tasks during hydration:** no single task > 50ms on a representative route.
- **Hydration mismatch:** any React hydration error fails the check.

### Enforcing Budgets in CI

The frontend CI job measures each representative route's distinct JavaScript chunks from Next.js's app build manifest, gzip-compresses each output chunk, and enforces the initial-JS limits above. A violation fails the job and prints the route, measured total, configured limit, and largest contributing chunks. Hydration TBT and long-task limits require browser profiling; they are not inferred from bundle sizes.

```bash
# Per-route JavaScript budget check (runs in CI after the frontend build)
npm run frontend:budget
```

When a route exceeds its JavaScript budget, the output includes:
- the route path,
- the measured gzip size,
- the configured gzip budget,
- the largest contributing chunks.

### Detecting Oversized Imports

Use the bundle analyzer to attribute weight to specific dependencies before optimizing:

```bash
ANALYZE=true npm run build
```

Common offenders and the fix:

| Oversized import | Fix |
|------------------|-----|
| Stellar SDK loaded on non-wallet routes | `dynamic(() => import(...), { ssr: false })` |
| Chart/visualization libraries | Dynamic import behind the component that renders them |
| Admin-only tables/editors | Route-level code splitting |
| Modal/dialog content | Dynamic import the modal body |

### Dynamic Imports

Use dynamic imports (code splitting) wherever a heavy dependency is not needed for the initial render of a route:

```typescript
const WalletPanel = dynamic(() => import('./WalletPanel'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

Prefer splitting at the route boundary first, then at the component boundary for heavy, conditionally-rendered UI.

## Common Pitfalls

### Backend

1. **Forgetting to invalidate cache**
   - Always invalidate after mutations
   - Use pattern-based keys

2. **Loading too much data**
   - Use field selection
   - Implement pagination

3. **Blocking operations**
   - Use async/await properly
   - Don't block event loop

### Frontend

1. **Over-memoization**
   - Only memo components that re-render often
   - Don't memo simple components

2. **Missing dependencies**
   - Always include all dependencies in useEffect
   - Check console warnings

3. **Premature optimization**
   - Measure first
   - P
