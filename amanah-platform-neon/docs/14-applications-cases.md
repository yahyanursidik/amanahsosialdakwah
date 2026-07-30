# Applications and Cases

## Scope

Vertical slice ini mencakup intake pengajuan, submit, screening independen,
konversi pengajuan diterima menjadi kasus, penugasan kasus, timeline, dan audit.
Asesmen detail berada pada fase berikutnya.

## Alur

```text
Draft
→ Submitted
→ In screening
→ Accepted / Rejected
→ Converted
→ Case open
→ Assigned
```

Hanya `accepted` yang dapat dikonversi. Satu pengajuan hanya dapat menghasilkan
satu kasus. Pembuat pengajuan tidak dapat melakukan screening sendiri.

## Tables

- `aid_applications`
- `application_screenings`
- `beneficiary_cases`
- `application_case_events`
- `audit_events`

Semua tabel tenant-owned memakai `organization_id`, UUID, `timestamptz`, index
tenant/status, RLS, dan runtime role `app_runtime`. Screening, timeline, serta
audit bersifat append-only. Applications dan cases tidak mendukung hard delete.

## API

```text
GET  /api/v1/applications
POST /api/v1/applications
GET  /api/v1/applications/:id
POST /api/v1/applications/:id/submit
POST /api/v1/applications/:id/screen
POST /api/v1/applications/:id/convert-to-case

GET  /api/v1/cases
GET  /api/v1/cases/:id
POST /api/v1/cases/:id/assign
```

API memakai Hono, Zod, Drizzle, response envelope, request ID, session Neon
Auth, membership aktif, permission server-side, transaction-local RLS context,
dan audit dalam transaksi yang sama.

## Permissions

- `applications.read`
- `applications.manage`
- `applications.submit`
- `applications.screen`
- `applications.convert`
- `cases.read`
- `cases.manage`
- `cases.assign`
- `audit.read`

Komponen UI hanya memeriksa permission. Backend memeriksa ulang permission dan
RLS tetap menjadi defense in depth.

## Migration

- Baseline: `drizzle/0000_stale_luke_cage.sql` (hasil introspeksi; tidak
  diterapkan ulang).
- Feature: `drizzle/0001_applications_cases.sql`.
- Policy hardening:
  `drizzle/0002_harden_application_case_audit_policies.sql`.
- Branch uji: `dev-neon-foundation`.

Rollback tidak boleh menghapus data yang sudah dipakai. Untuk branch disposable,
hapus branch. Untuk environment shared, nonaktifkan route/permission terlebih
dahulu dan lakukan migration korektif; jangan drop tabel transaksi secara
langsung.

## Tests

- unit test transisi application/case;
- API health/error envelope;
- RLS tenant A tidak dapat membaca pengajuan tenant B;
- user tanpa `applications.read` tidak melihat row;
- hard delete ditolak;
- typecheck, lint, test, build, dan Drizzle check.

## Dependencies

List/detail melakukan join ke Program, Contact, dan Profile. Custom role yang
memakai modul ini perlu permission baca pada resource terkait agar data relasi
tidak disembunyikan RLS.
