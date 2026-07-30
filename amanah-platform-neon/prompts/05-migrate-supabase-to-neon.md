# Prompt — Migrasi Supabase ke Neon

Baca repository dan docs.

Cari seluruh penggunaan:
- `@supabase/supabase-js`;
- Supabase data provider/Auth/Storage/RLS/RPC/Edge Functions/Realtime;
- folder migrations;
- env variables;
- generated types.

Mapping:

```text
Supabase Postgres → Neon Postgres
Supabase data provider → custom Refine REST data provider
Supabase Auth → selected server-side auth
Supabase Storage → S3-compatible storage
Supabase Edge Functions → Hono/Vercel Functions
Supabase RPC → application service + PostgreSQL transaction
Supabase RLS → server authorization + optional Postgres RLS defense in depth
Supabase Realtime → defer/replace only if proven necessary
```

Aturan:
1. Jangan hapus implementasi lama sebelum replacement diuji.
2. Migrasikan satu vertical slice.
3. Pertahankan ID bila memungkinkan.
4. Verifikasi UUID, numeric, timezone, enum, JSON, array, FK.
5. Pindahkan file dengan checksum.
6. Rekonsiliasi record dan nominal.
7. Buat rollback point.
8. Jangan membawa service key lama ke client.

Deliverables: inventory, schema diff, data/auth/storage/function migration plan, security replacement, cutover, reconciliation, rollback, acceptance criteria. Tahap pertama jangan coding.
