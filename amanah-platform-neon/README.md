# Amanah Platform — Neon Edition

Sistem multi-tenant untuk pengelolaan amanah sosial-dakwah: dana, bantuan barang, asesmen, CRM, mitra penyalur, distribusi, kafalah, wakaf, bukti lapangan, inventaris, logistik, pelaporan, dan audit.

## Stack

### Frontend
- Refine Core
- React + Vite
- TypeScript strict
- React Router
- React Hook Form + Zod
- shadcn/ui

### Backend
- Vercel Functions
- Hono
- Drizzle ORM
- Neon Postgres
- Better Auth atau Neon Auth (pilih satu)
- S3-compatible object storage untuk file

## Arsitektur

```text
Browser / Refine + Vite
        ↓ HTTPS /api/v1
Vercel Functions + Hono
        ↓ Drizzle ORM
Neon Postgres

File privat → S3-compatible object storage
```

Frontend **tidak boleh terhubung langsung ke Neon**. `DATABASE_URL` hanya tersedia di server.

## Mulai Membaca

1. `AGENTS.md`
2. `docs/00-project-context.md`
3. `docs/01-architecture-neon.md`
4. `docs/03-security-and-tenancy.md`
5. `docs/04-database-and-migrations.md`
6. `docs/10-vibe-coding-roadmap.md`
