# Topic Facets, Stale Schedule Reconciliation, Profile Field Authorization, and API Client Drift

This document specifies the architecture and test contracts implemented for issues #391, #392, #393, and #397.

---

## 1. Rate-Limited Public Topic Facets for Discovery (#391)

### Overview
Exposes bounded aggregate topic counts (`GET /confessions/search/discovery/facets`) derived exclusively from visible, non-deleted, and approved confessions.

### Safeguards & Invalidation
- **Visibility Filter**: Only includes records satisfying `isDeleted = false AND isHidden = false AND moderationStatus = 'approved'`.
- **Bounded Output**: Results are capped between 1 and 50 topics (default: 25).
- **Caching & Invalidation**: Results are cached for 60 seconds and immediately invalidated upon `confession.moderated`, `confession.deleted`, or `confession.restored` lifecycle events.

---

## 2. Database-Backed Reconciliation for Stale Scheduled Publications (#392)

### Overview
Detects scheduled confessions that missed their scheduled publishing window (due to worker restarts, database network partitions, or delayed cron triggers) and safely resumes execution.

### Concurrency & Terminal State Protections
- **`SKIP LOCKED` Concurrency**: Stale candidate queries employ `setLock('pessimistic_write').setOnLocked('skip_locked')`, guaranteeing that multiple parallel workers or concurrent scheduler runs never publish the same confession twice.
- **Terminal State Classification**: If a scheduled record was deleted prior to publication or encounters non-recoverable integrity errors, it is transitioned to `status: 'failed'` to avoid infinite retry loops.

---

## 3. Field-Level Authorization Matrix for Profile Responses (#393)

### Overview
Enforces strict role-based visibility across user profile fields at serialization boundaries.

### Visibility Matrix
| Field | Owner | Moderator | Authenticated Peer | Anonymous Public |
|---|:---:|:---:|:---:|:---:|
| `id`, `username`, `displayName`, `avatarUrl` | Yes | Yes | Yes | Yes |
| `reputationScore` | Yes | Yes | If `isDiscoverable` | If `isDiscoverable` |
| `email` | Yes | No | No | No |
| `stellarWallet` | Yes | Yes (Audit) | No | No |
| `privacySettings` | Yes | No | No | No |
| `roles` | Yes | Yes | No | No |
| `twoFactorEnabled` | Yes | No | No | No |
| `createdAt` | Yes | Yes | No | No |
| `password`, `encryptionKey`, `resetToken` | **Never** | **Never** | **Never** | **Never** |

---

## 4. Cross-Layer Validation for Generated API Client Defaults (#397)

### Overview
Automates contract comparison between the backend OpenAPI specification and generated frontend TypeScript client models.

### Drift Categories Checked
- **`MISSING_PROPERTY`**: Field declared in OpenAPI schema is absent from client model.
- **`TYPE_MISMATCH`**: Data type drift (e.g. string vs number, or primitive vs array).
- **`NULLABILITY_DRIFT`**: An OpenAPI required non-null field defined as optional or nullable in the client model.
- **`DEFAULT_VALUE_DRIFT`**: Inconsistent defaults across layers (e.g., pagination limit differences).
