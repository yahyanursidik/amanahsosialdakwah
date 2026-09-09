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
- Target database saat ini: branch Neon `production`.

Rollback tidak boleh menghapus data yang sudah dipakai. Untuk environment
production, nonaktifkan route/permission terlebih dahulu dan lakukan migration
korektif; jangan drop tabel transaksi secara langsung.

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
tidak disembunyikan RLS. Intake menerima contact aktif dengan role `beneficiary`
atau `applicant`; lihat `19-partners-and-applicants.md` untuk batasan pengaju
atas nama penerima lain.

## Program beneficiary journey

Halaman detail Program menyediakan read model lintas alur untuk calon penerima:

```text
Pengajuan -> kasus -> asesmen -> approval -> rencana distribusi -> PIC pelaksana
```

Endpoint `GET /api/v1/programs/:id/beneficiary-journey` selalu memvalidasi
membership aktif, organisasi aktif, dan `programs.read`. Data setiap tahap hanya
dimasukkan bila pemanggil juga memiliki permission baca tahap tersebut:

- `applications.read` untuk pengajuan dan kebutuhan;
- `cases.read` untuk status kasus;
- `crm_contacts.read` untuk nama, alamat non-sensitif, dan tautan profil;
- `assessments.read` untuk hasil asesmen;
- `approval_requests.read` untuk status serta aktor approval;
- `distributions.read` untuk rencana, status, dan PIC pelaksana.

Identitas sensitif tidak masuk ke endpoint atau tabel daftar. PIC yang tersedia
sekarang adalah petugas organisasi dari `distribution_assignments`, bukan kontak
mitra eksternal.

Untuk program dengan banyak pengajuan, endpoint menerima query server-side
`page`, `pageSize` (10–100), `q`, dan `stage`. Filter tahap tersedia untuk
`needs_action`, `in_distribution`, dan `completed`; pencarian mencakup nama
penerima, nomor pengajuan, kebutuhan, dan nomor kasus. Respons membawa metadata
pagination sehingga browser tidak perlu memuat seluruh jejak sekaligus.

Paket gudang, shipment, dan PIC mitra diikat melalui
`program_beneficiary_fulfillments` (migration `0026`). Record mengikat
pengajuan, penerima, packing paket, mitra, dan PIC; warehouse dibaca dari
packing dan status pengiriman dibaca dari `logistics_shipments`, sehingga tidak
ada status operasional kedua yang dapat menyimpang. Command pembuatan memeriksa
kapasitas packing dalam transaksi, active role `distribution_partner`, tenant,
dan `Idempotency-Key`, lalu mencatat audit event.

Migration belum dijalankan otomatis pada database production. Sampai migration
diterapkan, halaman Program secara eksplisit menunjukkan bahwa jejak fulfilment
belum tersedia dan tidak membuat asosiasi gudang/mitra semu.
