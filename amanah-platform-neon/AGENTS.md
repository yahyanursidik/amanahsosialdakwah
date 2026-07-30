# AGENTS.md

## 1. Identitas Proyek

Project: **Amanah Platform**

Domain: sistem multi-tenant pengelolaan amanah sosial-dakwah untuk lembaga pemberi amanah, pengelola, mitra penyalur, donatur, wakif, kafil, vendor, penerima, dana, barang, kafalah, wakaf, asesmen, approval, gudang, logistik, pelaporan, dan audit.

## 2. Stack Wajib

### Frontend
- Refine Core
- React
- Vite
- TypeScript strict
- React Router
- React Hook Form
- Zod
- shadcn/ui

### Backend
- Vercel Functions
- Hono
- Drizzle ORM
- Neon Postgres
- PostgreSQL transactions
- Zod validation

### Authentication
Gunakan **satu** sistem autentikasi:
- Better Auth dengan Neon Postgres; atau
- Neon Auth setelah integrasi branch dan provider divalidasi.

Jangan memasang dua sistem autentikasi tanpa rencana migrasi resmi.

### File Storage
- S3-compatible private object storage.
- Signed upload/download URL.
- Jangan menyimpan file binary di PostgreSQL.

## 3. Wajib Dibaca Sebelum Coding

1. Baca `AGENTS.md`.
2. Baca `docs/00-project-context.md`.
3. Baca dokumen domain yang terkait dengan tugas.
4. Periksa source, migration, tests, schema, service, dan komponen reusable.
5. Cari implementasi serupa sebelum membuat yang baru.

Jangan coding hanya berdasarkan prompt terbaru.

## 4. Aturan Arsitektur

1. Browser tidak boleh terkoneksi langsung ke Neon.
2. `DATABASE_URL` hanya server-side.
3. Credential database tidak boleh menggunakan prefix `VITE_`.
4. Refine menggunakan custom REST data provider.
5. Semua akses data melalui backend API.
6. Route handler harus tipis.
7. Business rules berada di application service/domain, bukan hanya React.
8. Operasi sensitif wajib memakai database transaction.
9. Record resmi yang approved tidak boleh diubah diam-diam.
10. Gunakan amendment, cancellation, reversal, atau corrective entry.
11. Jangan hard delete transaksi dana, asesmen, approval, penyaluran, wakaf, dan audit.
12. Jangan melakukan refactor di luar scope.

## 5. Aturan Multi-Tenant

1. Jangan percaya `organization_id` dari body/query browser.
2. Resolve user dan session di server.
3. Verifikasi membership aktif di server.
4. Verifikasi permission, program scope, region scope, dan warehouse scope.
5. Tabel tenant-owned harus mempunyai `organization_id` atau jalur ownership yang terdokumentasi.
6. Semua repository query wajib scoped tenant.
7. Search, count, export, relation, dashboard, dan file metadata juga wajib scoped.
8. Akses lintas organisasi memerlukan relationship dan permission eksplisit.
9. Tambahkan integration test isolasi tenant.

## 6. Authorization

Gunakan permission, bukan hardcoded role.

```text
resource.action
```

Contoh:

```text
program.read
assessment.submit
assessment.approve
fund.allocate
distribution.verify
inventory.adjust
waqf.manage
audit.read
```

Permission pada UI hanya untuk UX. Backend harus memeriksa ulang.

## 7. Database

1. Gunakan UUID kecuali ada alasan terdokumentasi.
2. Gunakan `numeric`, bukan float, untuk uang.
3. Gunakan `timestamptz` dan simpan UTC.
4. Gunakan constraint database untuk invariant.
5. Gunakan transaction untuk operasi multi-record.
6. Semua perubahan schema melalui Drizzle migration.
7. Jangan mengubah migration yang sudah dijalankan di shared environment.
8. Runtime role tidak boleh menjadi owner tabel.
9. Gunakan idempotency key untuk command yang mungkin diulang.
10. Uji concurrency untuk alokasi dana dan reservasi stok.
11. Balance resmi berasal dari ledger/movement, bukan state browser.

## 8. Workflow

Status sensitif tidak boleh memakai generic CRUD update.

Dilarang:

```ts
await db.update(assessments).set({ status: "approved" });
```

Gunakan command:

```ts
await approveAssessment({ assessmentId, actor, comment });
```

Command memeriksa tenant, permission, status saat ini, self-approval, evidence, workflow, concurrency, dan audit.

## 9. Dana

1. Pisahkan commitment, receipt, allocation, disbursement, distribution, reconciliation.
2. Jangan menghitung official balance hanya di browser.
3. Tidak boleh over-allocation.
4. Restricted fund tidak boleh digunakan pada program tidak kompatibel.
5. Disbursement wajib merujuk allocation approved.
6. Koreksi menggunakan adjustment/reversal.
7. Seluruh command resmi menggunakan transaction dan audit.

## 10. Inventaris

1. Stock movement adalah source of truth.
2. Stok tidak boleh negatif.
3. Batch dan expiry wajib bila relevan.
4. Gunakan FEFO.
5. Stock opname menghasilkan discrepancy, bukan overwrite langsung.
6. Adjustment memerlukan approval dan audit.
7. Packing mencatat batch aktual.
8. Transfer membuat source dan destination movement seimbang.

## 11. File dan Bukti

1. Private by default.
2. Signed URL dibuat server-side dan berumur pendek.
3. Metadata file disimpan di Neon.
4. Validasi MIME, ukuran, ownership, dan tujuan upload.
5. Jangan overwrite evidence submitted.
6. Buat versi baru dan pertahankan versi lama.
7. Pisahkan consent dokumentasi internal dan publikasi.
8. Jangan tampilkan identitas privat di laporan publik.
9. Audit download atau deletion yang sensitif.

## 12. Coding Standard

1. TypeScript strict wajib.
2. Hindari `any`.
3. Gunakan Zod pada API boundary.
4. Route handler tipis.
5. Gunakan domain-specific error.
6. Jangan bocorkan SQL error atau stack trace.
7. Gunakan English untuk code naming dan Indonesian untuk UI copy.
8. Jangan menambah dependency tanpa alasan.
9. Jangan duplikasi component, hook, service, atau schema.

## 13. API

Base path:

```text
/api/v1
```

Gunakan envelope konsisten dan request ID.

Success:

```json
{ "data": {}, "meta": { "requestId": "uuid" } }
```

Error:

```json
{ "error": { "code": "FORBIDDEN", "message": "Anda tidak memiliki akses.", "requestId": "uuid" } }
```

Pagination server-side. Filter/sort menggunakan allowlist. Command retry-safe memakai `Idempotency-Key`.

## 14. Testing

Setiap fitur relevan harus mempunyai:
- unit test;
- API/database integration test;
- tenant isolation test;
- permission test;
- state transition test;
- concurrency test untuk dana/stok;
- regression test untuk bug.

Jangan mengandalkan snapshot test saja.

## 15. Definition of Done

Fitur selesai jika:
- migration selesai;
- server authorization tersedia;
- tenant scope tersedia;
- Zod validation tersedia;
- business rule server-side tersedia;
- audit tersedia bila perlu;
- loading/empty/error/denied state tersedia;
- mobile diperiksa;
- test, typecheck, lint, build lulus;
- docs diperbarui;
- tidak ada secret di repository.

## 16. Laporan Setelah Coding

Laporkan:
1. perubahan;
2. alasan;
3. file berubah;
4. dampak migration;
5. dampak authorization/tenant;
6. test aktual yang dijalankan;
7. risiko tersisa;
8. docs yang diperbarui.

Jangan mengklaim test lulus bila belum dijalankan.
