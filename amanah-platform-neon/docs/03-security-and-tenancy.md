# Security and Multi-Tenancy

## Trust Boundary

Semua data dari browser tidak dipercaya, termasuk user ID, organization ID, role, permission, nominal, stock, status, dan metadata file.

## Request Context

```ts
type RequestContext = {
  requestId: string;
  userId: string;
  organizationId: string;
  membershipId: string;
  permissions: Set<string>;
};
```

Server membangun context setelah memvalidasi session dan membership.

## Tenant Scope

Semua query tenant-owned wajib memasukkan organization scope, termasuk list, detail, count, search, autocomplete, export, dashboard, join, audit, background job, dan file metadata.

## Cross-Organization

Membutuhkan organization relationship aktif, relationship type sesuai, scope program, tanggal valid, access scope, dan permission pengguna.

## Database Roles

Gunakan migration owner dan application runtime role terpisah. Runtime role tidak menjadi owner tabel.

## Postgres RLS

Boleh digunakan sebagai defense in depth. Bila dipakai dengan pooled connection:
- gunakan transaction-local context;
- gunakan `SET LOCAL`;
- jangan mengandalkan persistent session state;
- uji pada pooled connection;
- application authorization tetap wajib.

## API Security

- rate limit;
- secure cookie;
- CSRF sesuai desain auth;
- strict CORS;
- content-type/body limit;
- Zod validation;
- generic error;
- security headers;
- jangan bocorkan SQL atau record existence sensitif.

## Data Classification

```text
public
partner
internal
confidential
restricted
```

Identity, child, health, bank, dan legal asset documents termasuk restricted/confidential.
