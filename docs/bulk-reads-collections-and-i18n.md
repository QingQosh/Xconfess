# Bulk Reads, Private Collections, Content-Type Limits, and Locale-Negotiated Errors

This document records the architectural contracts and security guarantees implemented for issues #385, #390, #395, and #396.

---

## 1. Rate-Limited Bulk Reads for User-Owned Resources (#385)

### Overview
Provides a bounded, performant batch read endpoint (`POST /bulk-reads`) that allows clients to request up to 50 resource items in a single round trip while maintaining strict per-item authorization and input ordering.

### Key Semantics
- **Bounded Batch Limit**: Requests containing more than 50 IDs are deterministically rejected with `400 Bad Request` (`MAX_BATCH_SIZE_EXCEEDED`).
- **Input Ordering Preservation**: The response `results` array strictly mirrors the index and ID order of the input `ids` array.
- **Per-Item Status Mapping**:
  - `200 SUCCESS`: Authorized and returned with data payload.
  - `404 NOT_FOUND`: Resource does not exist or has been deleted.
  - `403 FORBIDDEN`: Resource exists but is owned by another user and not public.
- **Cost Throttling**: Protected with `@RequestCost(COST.MEDIUM)` to guard against denial-of-service abuse.

---

## 2. Explicit API Contract for User-Owned Collections (#390)

### Overview
Delivers private collection management (`/collections`) allowing authenticated users to organize saved confessions with optimistic concurrency control and stable ordering.

### Endpoints
- `POST /collections` - Create private collection; auto-increments display order.
- `GET /collections` - List caller's collections ordered by `displayOrder ASC`.
- `GET /collections/:id` - Retrieve collection metadata; enforces strict ownership.
- `PATCH /collections/:id` - Update name, description, or privacy. Supports `expectedVersion` for optimistic locking (`409 Conflict` on race conditions).
- `POST /collections/reorder` - Atomically updates `displayOrder` across user's collections.
- `DELETE /collections/:id` - Deletes collection.

---

## 3. Safe Request-Body Parsing Limits per Content Type (#395)

### Overview
Applies early content-length and content-type enforcement before delegating to resource-intensive body parsers:
- **`application/json`**: 100 KiB maximum limit.
- **`application/x-www-form-urlencoded`**: 50 KiB maximum limit.
- **`multipart/form-data`**: 15 MiB maximum limit (uploads only).
- **Unsupported Mutation Types**: Mutations with unsupported media types return `415 Unsupported Media Type`.
- **Oversized Payloads**: Evaluated from `Content-Length` header as well as in-flight stream counters to block chunked transfer abuse, returning `413 Payload Too Large`.

---

## 4. Locale Negotiation for Public API Error Messages (#396)

### Overview
Standardizes client error messaging by translating user-facing error text into the client's preferred language while preserving machine-readable error codes and logs in English.

### Behavior
- **`Accept-Language` Parsing**: Evaluates incoming headers (e.g., `fr-CH, fr;q=0.9, en;q=0.8`) against supported locales (`en`, `es`, `fr`, `de`, `ar`). Defaults to `en`.
- **Response Headers**: Sets `Content-Language: <locale>` on error responses.
- **Stable Error Codes**: Machine-readable codes (`code: "PAYLOAD_TOO_LARGE"`, `code: "COLLECTION_NOT_FOUND"`, etc.) and backend log messages remain completely language-neutral and unchanging for automated API consumers and monitoring alerts.
