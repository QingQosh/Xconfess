# Publication Outbox, Collection Bulk Deletion, Response Redaction, and Analytics Consent

This document outlines the security, persistence, and contract specifications for issues #398, #399, #400, and #402.

---

## 1. Transactional Outbox for Scheduled Publications (#398)

### Overview
Atomically couples scheduled confession persistence and domain event generation in a single database transaction, ensuring zero loss of publication triggers.

### Event Lifecycle & Idempotency
- **Deduplication Key**: Format `pub-outbox:<confessionId>:<eventType>`. Repeated scheduling requests or transactional retries never duplicate event rows.
- **Ordered Delivery Checkpoints**: Sequential processing via `checkpoint_seq` and bounded batch size (25 events).
- **Dead-Letter Handling**: If event dispatch fails 5 times, the event is marked `DEAD_LETTER` with recorded `last_error` and logged for operational monitoring.

---

## 2. Owner-Safe Bulk Deletion for Private Collections (#399)

### Overview
Enables bulk deletion of user-owned collections and their association memberships while guaranteeing that referenced confession records remain intact.

### Boundary Guarantees
- **Bounded Request Limit**: Bounded to at most 25 collection IDs per request.
- **Ownership Verification**: Enforces that only collections belonging to the caller (`userId`) are purged.
- **Cascading Memberships**: Drops `user_collection_items` records in the collection without modifying or deleting the linked `anonymous_confessions`.
- **Idempotency**: Collections that have already been deleted are safely tallied in `alreadyDeletedIds` rather than aborting the transaction.

---

## 3. API-Level Response Redaction Assertions (#400)

### Overview
Provides an automated security assertion suite that verifies private and sensitive fields are never exposed in public, cross-account, error, or list responses.

### Forbidden Field Set
`assertNoPrivateFieldsLeaked` recursively scans payloads for:
- Credentials: `password`, `salt`, `resetToken`, `authSecret`
- Encryption: `encryptionKey`, `aesKey`, `rawSecret`
- Authentication: `jwtToken`, `accessToken`, `refreshToken`, `twoFactorSecret`, `otpSecret`, `apiKey`, `privateKey`
- Sensitive Identifiers: `internalIp`

---

## 4. Versioned Consent for Optional Analytics Collection (#402)

### Overview
Captures explicit, versioned user consent choices for optional telemetry and product analytics.

### Privacy Safeguards
- **Policy Versioning**: Stores exact policy version (`policy_version`, e.g. `2026.11-v1`) and timestamp.
- **Unblocked Rejection**: If a user refuses analytics consent (`consentGiven: false`), core product flows continue uninterrupted without degraded functionality.
- **Immediate Cessation on Withdrawal**: Calling `withdrawConsent(userId)` sets `withdrawnAt` and immediately halts downstream telemetry collection for that user.
