# Neon Database and Migrations

## Tooling

- Neon Postgres
- Drizzle ORM
- Drizzle Kit
- Neon serverless driver atau PostgreSQL driver yang telah divalidasi
- Vitest integration tests

## Environment

```env
DATABASE_URL=
DATABASE_URL_DIRECT=
NEON_API_KEY=
NEON_PROJECT_ID=
```

Semua server-only.

## Connection

- runtime: pooled URL;
- migration: direct URL bila dibutuhkan tool/session behavior.

## Scripts

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx api/db/migrate.ts",
  "db:studio": "drizzle-kit studio",
  "db:check": "drizzle-kit check",
  "db:seed": "tsx api/db/seed.ts",
  "db:test": "vitest run api/tests/database"
}
```

## Migration Rules

1. Satu logical change per migration.
2. Jangan edit migration shared.
3. Untuk perubahan besar: tambah nullable → backfill → constraint.
4. Hindari lock panjang.
5. Dokumentasikan destructive effect.
6. Backup/branch sebelum perubahan destruktif.
7. Sertakan rollback notes.

## Neon Branching

```text
main → production
staging → staging
preview → PR/test
```

Gunakan data sintetik atau dianonimkan pada non-production.

## Schema Convention

```text
id uuid primary key
organization_id uuid not null
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid
updated_by uuid
```

## Precision

```text
money numeric(20,2)
quantity numeric(20,4)
currency char(3)
```

## Concurrency

Gunakan atomic condition, `SELECT ... FOR UPDATE`, serializable transaction bila tepat, unique constraint, atau advisory lock yang terdokumentasi. Uji alokasi dana, stock reservation, packing, matching, dan idempotency.
