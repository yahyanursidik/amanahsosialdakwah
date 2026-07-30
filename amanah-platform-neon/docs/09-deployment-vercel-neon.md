# Deployment — Vercel and Neon

## Environments

```text
local
preview
staging
production
```

## Variables

Client-safe:

```env
VITE_APP_ENV=
VITE_API_BASE_URL=
VITE_PUBLIC_APP_NAME=
```

Server-only:

```env
DATABASE_URL=
DATABASE_URL_DIRECT=
AUTH_SECRET=
AUTH_TRUSTED_ORIGINS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
SENTRY_DSN=
```

Tidak boleh ada `VITE_DATABASE_URL`.

## Sequence

```text
tests → build → choose/create Neon branch → migration → deploy → smoke test → promote
```

Preview tidak boleh otomatis mengakses data beneficiary production. Gunakan branch dan storage prefix/bucket terpisah.

Production migration adalah langkah CI eksplisit. Perubahan environment variable di Vercel memerlukan deployment baru agar diterapkan.
