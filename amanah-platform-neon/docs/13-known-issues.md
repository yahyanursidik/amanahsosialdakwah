# Known Issues

## Template

### ISSUE-XXX — Judul

**Severity:** Critical / High / Medium / Low

**Area:** Auth / Tenancy / API / Database / Funds / Inventory / Storage / UI / Reporting

**Description**

**Impact**

**Workaround**

**Proposed fix**

**Blocked by**

**Status:** Open / In progress / Deferred / Resolved

### ISSUE-001 — Dua pola API selama migrasi bertahap

**Severity:** Medium

**Area:** API

**Description**

Program dan CRM masih memakai endpoint generik `/api/data`, sedangkan
Applications & Cases sudah memakai Hono `/api/v1`.

**Impact**

Business rule Program/CRM belum seluruhnya dipaksakan pada application service
server-side.

**Workaround**

Jangan menambah workflow sensitif baru ke `/api/data`. Semua modul baru wajib
memakai Hono command endpoint.

**Proposed fix**

Migrasikan Program terlebih dahulu, kemudian CRM, ke repository/service Hono
tanpa mengubah kontrak UI sekaligus.

**Blocked by**

Tidak ada.

**Status:** In progress

### ISSUE-002 — Baseline Drizzle pada database existing

**Severity:** Low

**Area:** Database

**Description**

`drizzle/0000_stale_luke_cage.sql` adalah hasil introspeksi database existing
dan tidak boleh diterapkan ulang.

**Impact**

Menjalankan Drizzle migrator standar tanpa migration bridge dapat mencoba
membuat ulang tabel lama.

**Workaround**

Gunakan `npm run db:migrate` yang melewati baseline `0000`.

**Proposed fix**

Setelah seluruh migration legacy dikonsolidasikan, dokumentasikan proses
baseline marker formal untuk environment baru dan shared.

**Blocked by**

Migrasi bertahap modul lama.

**Status:** Open

### ISSUE-003 — Evidence upload belum diaktifkan

**Severity:** Medium

**Area:** Storage

**Description**

Assessment Engine dan Distribution Engine sudah mempunyai metadata evidence,
tetapi belum membuka endpoint upload atau download berkas.

**Impact**

Template dengan pertanyaan evidence wajib belum dapat dipublikasikan. Bukti
tidak boleh dimasukkan sebagai URL publik atau object key dari browser.

**Workaround**

Gunakan template tanpa evidence wajib sampai Evidence Service tersedia.
Distribution hanya memakai field note, pernyataan penerima, atau referensi tanda
terima yang tidak memuat object key maupun URL publik.

**Proposed fix**

Implementasikan fase Evidence Service: private S3-compatible storage, signed
upload/download URL, checksum, MIME/size validation, ownership, confirmation,
versioning, dan audit.

**Blocked by**

Roadmap fase 17 — Evidence Service.

**Status:** Open

# Known Issues

## Evidence object storage belum dikonfigurasi

- Project Neon production berada di `aws-ap-southeast-1`, sedangkan Neon Object
  Storage beta masih terbatas pada `us-east-2`.
- Evidence Service menggunakan adapter S3-compatible, tetapi variabel `S3_*`,
  bucket privat, dan CORS production belum tersedia.
- Metadata/RLS/versioning aktif; upload dan download binary akan mengembalikan
  error konfigurasi yang aman sampai storage disiapkan.

## Bundle frontend besar

- Route-level lazy loading telah diterapkan pada Fase 22. Pantau ukuran initial
  chunk pada setiap build dan pecah dependency vendor hanya jika hasil ukur
  menunjukkan initial chunk kembali melewati batas 500 kB.

## Rate limiting terdistribusi belum diaktifkan

- API telah memiliki body limit, same-site mutation guard, request ID, dan
  header keamanan.
- Rate limiting terdistribusi perlu diaktifkan melalui Vercel Firewall. Limiter
  in-memory sengaja tidak digunakan karena tidak konsisten antar-instance.
- Lihat `docs/production-hardening.md` untuk deployment gate dan baseline.
