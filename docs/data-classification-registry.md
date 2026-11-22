# Data Classification Registry & Schema Governance

## Overview
The Data Classification Registry establishes an authoritative source of truth for the classification, ownership, retention, and export behavior of persisted fields across all entities in the Xconfess platform.

## Classification Dimensions

### 1. Sensitivity Levels
- **`PUBLIC`**: Freely visible to unauthenticated or public viewers (e.g., confession text, public profile handle).
- **`INTERNAL`**: System-generated IDs, internal counters, or operational metadata not intended for external consumption.
- **`CONFIDENTIAL`**: Private user attributes, non-public relationships, or author linkages for anonymous submissions.
- **`RESTRICTED_PII`**: Highly sensitive personally identifiable information (e.g., email addresses, hashed passwords, session secrets).

### 2. Ownership
- **`USER`**: User-generated or user-identifying data.
- **`SYSTEM`**: Platform-generated operational metadata.
- **`ORGANIZATION`**: Platform administrative configuration.

### 3. Retention Categories
- **`EPHEMERAL_30D`**: Telemetry and logs automatically rotated after 30 days.
- **`ACCOUNT_LIFETIME`**: Retained as long as the user account remains active.
- **`LEGAL_7Y`**: Audit logs retained for 7 years to meet compliance mandates.
- **`PERMANENT`**: Immutable on-chain transaction references.

### 4. Export Behavior
- **`EXPORTABLE`**: Included in user GDPR data export archives.
- **`REDACTED`**: Anonymized or masked prior to inclusion in exports.
- **`EXCLUDED`**: Strictly omitted from exports (e.g., password hashes, security tokens).

## Schema Completeness Reviews
During CI/CD and pull request reviews, the `DataClassificationRegistry.validateSchemaCompleteness()` check verifies that newly introduced TypeORM entities or columns have corresponding classifications registered.
