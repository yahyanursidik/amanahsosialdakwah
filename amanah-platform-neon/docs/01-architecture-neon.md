# Architecture — Neon Edition

## Keputusan Utama

Neon adalah PostgreSQL serverless. Neon tidak otomatis menggantikan Auth, Storage, Edge Functions, dan data provider Supabase. Karena frontend memakai Vite, wajib ada backend API.

## Topologi

```text
Refine + React + Vite
        ↓ HTTPS
Hono API di Vercel Functions
        ↓ Drizzle ORM
Neon Postgres

Evidence → S3-compatible object storage
```

## Struktur Repository

```text
src/
├── app/
├── components/
├── features/
├── providers/
├── schemas/
└── types/

api/
├── index.ts
├── app.ts
├── middleware/
├── routes/
├── services/
├── repositories/
├── domain/
├── db/
├── auth/
├── storage/
└── tests/

drizzle/
├── migrations/
└── meta/
```

## Database Connectivity

```env
DATABASE_URL=
DATABASE_URL_DIRECT=
```

- Pooled URL untuk runtime serverless.
- Direct URL untuk migration bila diperlukan.
- Keduanya server-only.

## Refine

Gunakan custom REST data provider:

```text
getList → GET /api/v1/:resource
getOne  → GET /api/v1/:resource/:id
create  → POST /api/v1/:resource
update  → PATCH /api/v1/:resource/:id
custom  → command endpoint
```

Workflow tidak memakai update generic:

```text
POST /api/v1/assessments/:id/submit
POST /api/v1/assessments/:id/approve
POST /api/v1/distributions/:id/verify
```

## Authentication

Default: Better Auth dengan Neon Postgres. Neon Auth boleh dipilih setelah branch integration, provider, session model, dan kesiapan produksi divalidasi. Jangan mencampur keduanya.

## Storage

Neon hanya menyimpan metadata file. Binary disimpan di S3-compatible storage menggunakan signed URL.

## Observability

Minimum:
- structured log;
- request ID;
- error monitoring;
- audit event;
- slow-query log;
- environment marker.
