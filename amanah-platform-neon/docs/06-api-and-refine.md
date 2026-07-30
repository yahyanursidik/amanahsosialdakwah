# API and Refine Data Provider

## Base Path

```text
/api/v1
```

## Resource Endpoint

```text
GET    /api/v1/programs
POST   /api/v1/programs
GET    /api/v1/programs/:id
PATCH  /api/v1/programs/:id
POST   /api/v1/programs/:id/archive
```

## Data Provider

Implementasikan `getList`, `getOne`, `getMany`, `create`, `update`, `custom`, dan delete hanya bila domain mengizinkan.

Data provider:
- mengirim credentials;
- membawa active organization request;
- memetakan pagination/filter/sort allowlist;
- menormalisasi error;
- mempertahankan request ID;
- mendukung abort signal bila memungkinkan.

## Response List

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0, "requestId": "uuid" }
}
```

## Commands

Gunakan command endpoint untuk submit, verify, approve, cancel, reverse, complete, archive, dan export.

## Error Codes

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
INVALID_STATE
INSUFFICIENT_FUNDS
INSUFFICIENT_STOCK
DUPLICATE_REQUEST
RATE_LIMITED
INTERNAL_ERROR
```

## Idempotency

Gunakan `Idempotency-Key` untuk receipt, disbursement, webhook, goods receipt, shipment confirmation, sponsor payment, dan report generation.
