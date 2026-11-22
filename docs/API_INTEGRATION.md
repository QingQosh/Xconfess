# API Integration Guide

This guide helps third-party developers integrate with the xConfess HTTP API.
It covers authentication, public endpoints, rate limits, error handling, webhook delivery, and copy-paste examples in `curl`, JavaScript, and Python.

## Base URL

All endpoints are served under the server base URL plus the global API prefix:

- `https://<your-host>/api`

For local development, the backend runs at `http://localhost:5000/api` by default.

## Authentication Overview

xConfess uses stateless JWT authentication for protected routes.
Third-party integrations should authenticate by exchanging email/password credentials for an access token.

### Supported auth endpoints

- `POST /api/users/register` — create a new account
- `POST /api/users/login` — login with email/password
- `POST /api/auth/login` — alternative login endpoint (same payload)
- `GET /api/auth/me` — get profile for current JWT user
- `GET /api/auth/session` — get authenticated session information
- `POST /api/auth/logout` — acknowledge logout
- `POST /api/auth/forgot-password` — request password reset
- `POST /api/auth/reset-password` — complete password reset

### Login request

`POST /api/auth/login`

Request body:

```json
{
  "email": "alice@example.com",
  "password": "Str0ng!Pass#1"
}
```

Successful response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "anonymousUserId": "anon_7f3a2b1c",
  "user": {
    "id": 1,
    "username": "alice_42",
    "role": "user",
    "is_active": true
  }
}
```

> Tip: `POST /api/users/login` is equivalent for login flows and can be used interchangeably.

### Use the JWT

Include the token on protected requests:

```http
Authorization: Bearer <access_token>
```

### Profile endpoints

- `GET /api/auth/me`
- `GET /api/auth/session`
- `GET /api/users/profile`

These return the current authenticated user profile. Use whichever route best fits your integration.

## Login anomaly detection and step-up challenges

Login attempts are scored for risk. High-risk attempts require a second factor
(step-up challenge) or are blocked, depending on the configured policy. Every
anomaly and step-up event is correlated by a `requestId` so operators can trace
a single attempt end to end.

### Anomaly signals

| Signal              | Description |
|---------------------|-------------|
| `credential_stuffing` | Many distinct accounts attempted from the same source in a short window. |
| `impossible_travel`   | Two successful logins from geographically distant locations within an implausible time window. |
| `velocity`            | Login attempt rate for an account or source exceeds the configured threshold. |
| `device_novelty`      | Login from a device fingerprint not previously seen for the account. |
| `ip_novelty`          | Login from an IP address/ASN not previously seen for the account. |

### Risk scoring

Each signal contributes a weighted score; the sum is clamped to `0–100`.

| Signal              | Weight |
|---------------------|--------|
| `credential_stuffing` | 40 |
| `impossible_travel`   | 35 |
| `velocity`            | 20 |
| `device_novelty`      | 15 |
| `ip_novelty`          | 10 |

Policy thresholds:

- `score < 40` — allow, no challenge.
- `40 ≤ score < 70` — require a step-up challenge (second factor).
- `score ≥ 70` — block the attempt.

### Step-up challenge flow

When a login is challenged, the login response does not return an access token.
Instead it returns a challenge that must be completed before a token is issued.

`POST /api/auth/login` (challenged) response:

```json
{
  "status": "step_up_required",
  "requestId": "req_5b1e9c",
  "challengeId": "chal_2f7a",
  "riskScore": 55,
  "signals": ["device_novelty", "ip_novelty"],
  "expiresAt": "2026-04-25T10:05:00.000Z"
}
```

Complete the challenge:

`POST /api/auth/login/step-up`

```json
{
  "challengeId": "chal_2f7a",
  "code": "123456"
}
```

On success the normal login response (with `access_token`) is returned. On
failure the challenge can be retried until `expiresAt`, after which a new login
attempt is required.

Blocked attempts return `403 Forbidden`:

```json
{
  "status": "blocked",
  "requestId": "req_5b1e9c",
  "riskScore": 80,
  "signals": ["credential_stuffing", "velocity"]
}
```

### Correlation by request ID

Every login attempt is assigned a `requestId`. The same `requestId` is echoed on
the login response, the step-up challenge, and any anomaly/step-up event emitted
to operators, so a single attempt can be reconstructed across systems. Clients
should log the `requestId` from responses for support and debugging.

### Privacy limits

Anomaly detection follows data minimization:

- Only derived signals and scores are stored; raw credentials are never retained.
- IP addresses and device fingerprints are stored as salted hashes, not raw values.
- Signal history is retained for a bounded window (default 30 days) and then purged.
- Operators see signal names and scores, not raw sensitive identifiers.

## Account deletion orchestration

Account deletion is a stateful, idempotent job. Deletion spans posts, messages,
exports, notifications, analytics, and chain references, each with different
retention requirements, so the API exposes an explicit lifecycle rather than a
single destructive call.

### Lifecycle states

| `state`         | Meaning | Terminal |
|-----------------|---------|----------|
| `requested`     | Deletion was requested but not yet confirmed by the user. | no |
| `confirmed`     | The user confirmed intent; the grace period has started. | no |
| `grace_period`  | Waiting out the configurable grace window; deletion can still be cancelled. | no |
| `processing`    | The job is actively deleting and anonymizing records. | no |
| `completed`     | All deletable records are gone and retained records are de-identified. | yes |
| `failed`        | The job hit a terminal error; inspect `failureReason` and retry. | yes |
| `cancelled`     | The user cancelled during the grace period; nothing was deleted. | yes |

Transitions are one-directional: `requested → confirmed → grace_period →
processing → completed | failed`, with `cancelled` reachable only from
`confirmed` or `grace_period`.

### Endpoints

- `POST /api/account/deletion` — request deletion (enters `requested`)
- `POST /api/account/deletion/confirm` — confirm intent (enters `confirmed`/`grace_period`)
- `POST /api/account/deletion/cancel` — cancel during the grace period
- `GET /api/account/deletion` — fetch current job status

All endpoints require the `Authorization: Bearer <access_token>` header and
operate on the authenticated user only.

### Request deletion

`POST /api/account/deletion`

```json
{
  "reason": "Leaving the platform"
}
```

Response:

```json
{
  "state": "requested",
  "jobId": "del_9f2c1a",
  "gracePeriodSeconds": 604800,
  "requestedAt": "2026-04-25T10:00:00.000Z",
  "scheduledFor": null
}
```

### Confirm deletion

`POST /api/account/deletion/confirm`

```json
{
  "confirmationToken": "del_9f2c1a"
}
```

Confirmation is required before any data is touched. On success the job enters
`grace_period` and `scheduledFor` is set to the end of the grace window.

### Cancel deletion

`POST /api/account/deletion/cancel`

Cancellation is only accepted while the job is in `confirmed` or
`grace_period`. Once `processing` begins, cancellation returns `409 Conflict`.

### Status

`GET /api/account/deletion`

```json
{
  "state": "grace_period",
  "jobId": "del_9f2c1a",
  "gracePeriodSeconds": 604800,
  "requestedAt": "2026-04-25T10:00:00.000Z",
  "scheduledFor": "2026-05-02T10:00:00.000Z",
  "retainedRecords": [
    { "category": "financial", "reason": "legal_retention", "anonymized": true }
  ]
}
```

### Idempotency and observability

Deletion requests are idempotent: repeating `POST /api/account/deletion` while a
job is active returns the existing job rather than creating a new one. Every
state transition is recorded with a timestamp so the user-facing status and
operator audit trail stay consistent.

## Rollback evidence archive

Application and schema rollback drills produce an evidence record at the owning
release boundary. The archive stores sanitized drill inputs, decision points,
duration, and outcomes so a drill can be reviewed and audited after the fact.

### What is archived

Each evidence record captures:

- `drillId` — stable identifier for the drill run.
- `kind` — `application` or `schema`.
- `inputs` — sanitized drill inputs (secrets, tokens, and raw payloads are redacted before storage).
- `decisionPoints` — ordered list of `{ at, decision, rationale }` entries recorded during the drill.
- `durationMs` — wall-clock duration of the drill.
- `outcome` — `succeeded`, `failed`, or `aborted`.
- `createdAt` / `expiresAt` — retention window boundaries.

Raw secrets, credentials, and unsanitized request/response bodies are never
stored. Inputs are sanitized at write time; if sanitization fails the record is
rejected rather than persisted.

### Endpoints

- `POST /api/release/rollback-evidence` — archive a drill evidence record
- `GET /api/release/rollback-evidence` — list archived records (paginated)
- `GET /api/release/rollback-evidence/:drillId` — fetch a single record

All endpoints require `Authorization: Bearer <access_token>` with an operator
role. Requests without a valid token return `401 Unauthorized`; authenticated
users without the operator role receive `403 Forbidden`.

### Archive a record

`POST /api/release/rollback-evidence`

```json
{
  "drillId": "drill_2026_04_25_app",
  "kind": "application",
  "inputs": { "targetVersion": "v1.8.0", "previousVersion": "v1.7.3" },
  "decisionPoints": [
    { "at": "2026-04-25T10:01:00.000Z", "decision": "proceed", "rationale": "health checks green" }
  ],
  "durationMs": 42000,
  "outcome": "succeeded"
}
```

Response `201 Created`:

```json
{
  "drillId": "drill_2026_04_25_app",
  "kind": "application",
  "outcome": "succeeded",
  "durationMs": 42000,
  "createdAt": "2026-04-25T10:02:00.000Z",
  "expiresAt": "2026-07-24T10:02:00.000Z"
}
```

### Validation and failure semantics

- Missing or malformed fields return `400 Bad Request` with a `details` array.
- `kind` must be `application` or `schema`; `outcome` must be `succeeded`, `failed`, or `aborted`.
- `durationMs` must be a non-negative integer.
- If sanitization detects unsanitized secrets the request is rejected with `422 Unprocessable Entity`.
- Archiving is idempotent per `drillId`: re-posting the same `drillId` returns the existing record with `200 OK` instead of creating a duplicate.
- Transient storage failures return `503 Service Unavailable`; clients may retry with the same `drillId` safely.

### Retention and access controls

- Evidence records are retained for a bounded window (default 90 days) and then purged.
- Only operator-role tokens can read or write evidence; records are never exposed on public endpoints.
- Listing responses omit sanitized input bodies by default; fetch a single record to inspect inputs.
