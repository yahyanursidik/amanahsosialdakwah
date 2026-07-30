# Cash Distribution Engine

## Scope fase 12

Fase ini mencatat pelaksanaan amanah setelah uang telah dibukukan sebagai
disbursement. Distribution tidak membuat jurnal dana baru dan tidak menggantikan
Funds Engine.

Alur status:

`draft -> ready -> assigned -> in_progress -> executed -> confirmed? -> verified -> completed`

Jalur koreksi memakai `revision_required -> in_progress` sebagai siklus baru.
Rencana yang belum dilaksanakan dapat dibatalkan secara tercatat.

## Prasyarat

- disbursement berstatus `posted`;
- allocation berstatus `approved`;
- program allocation sama dengan program kasus;
- kasus berstatus `eligible`;
- contact penerima berstatus `active`;
- total rencana aktif tidak melebihi nilai disbursement.

Prasyarat diperiksa saat membuat rencana, menandai siap, dan menyelesaikan
distribusi. Pemeriksaan saldo/rencana dilakukan setelah row lock pada
disbursement.

## Segregation of duties

- petugas hanya dapat memulai dan melaksanakan distribusi jika menjadi assignee
  aktif;
- pembuat rencana dan pelaksana tidak boleh memverifikasi distribusi yang sama;
- verifikasi memerlukan pelaksanaan berhasil dan sedikitnya satu bukti;
- konfirmasi penerima wajib jika flag `requires_confirmation` aktif;
- completion hanya dapat dilakukan setelah hasil `verified`.

Komponen UI memeriksa permission untuk UX. Service API memeriksa permission dan
PostgreSQL RLS tetap menjadi batas keamanan utama.

## Integritas dan audit

- command sensitif memakai `Idempotency-Key`;
- execution, confirmation, evidence, verification, dan event bersifat
  append-only;
- konteks, penerima, sumber dana, dan nominal rencana tidak dapat diedit;
- status final `completed` dan `cancelled` immutable;
- seluruh foreign key tenant memakai pasangan `(id, organization_id)`;
- seluruh tabel exposed mengaktifkan RLS dengan SELECT, INSERT, UPDATE, dan
  DELETE policy eksplisit;
- hard delete selalu ditolak;
- setiap command menghasilkan distribution event dan audit event.

## Evidence pada fase ini

Fase 12 hanya menerima metadata bukti non-berkas yang privat:

- `field_note`;
- `beneficiary_statement`;
- `receipt_reference`.

Tidak ada URL publik, object key browser, atau upload semu. Foto/dokumen akan
ditambahkan pada fase 17 melalui storage privat, signed URL, checksum, validasi
MIME/ukuran, dan audit.

## Permission

- `distributions.read`
- `distributions.manage`
- `distributions.ready`
- `distributions.assign`
- `distributions.execute`
- `distributions.confirm`
- `distributions.verify`
- `distributions.complete`
- `distributions.cancel`
- `distribution_evidence.read`
- `distribution_evidence.manage`

Owner dan admin memperoleh seluruh permission. Field officer memperoleh read,
execute, confirm, dan evidence manage. Auditor memperoleh read, verify, dan
complete. Assignment tetap divalidasi terhadap membership aktif.

## Validasi

```powershell
npm run db:check
npm run neon:migrate
npm run neon:seed
npm run neon:test:isolation
npm run neon:types
npm run quality
npm run build
```

Migration dan test harus dijalankan pada branch Neon development.

## Batas fase

- belum ada upload file evidence;
- belum ada optimasi rute atau geolocation presisi;
- belum ada distribusi barang/inventory;
- belum ada OTP delivery provider;
- satu rencana menyalurkan nominal penuh dalam satu execution berhasil per
  siklus.
