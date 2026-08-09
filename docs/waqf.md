# Wakaf

Fase 19 membangun fondasi pengelolaan wakaf tanpa bergantung pada S3 binary
upload. Bukti file dapat ditautkan kemudian melalui Evidence Service ketika
credential `S3_*`, bucket privat, dan CORS production sudah siap.

## Ruang lingkup

Vertical slice ini mencakup:

- aset wakaf;
- dokumen legal wakaf sebagai metadata;
- verifikasi dokumen legal dengan maker-checker;
- registrasi aset setelah dokumen legal terverifikasi;
- penetapan nazhir/pengelola;
- valuasi aset;
- pemanfaatan aset;
- pemeliharaan aset;
- pendapatan aset;
- distribusi manfaat;
- event dan audit command.

## Invariant domain

- aset wakaf tidak boleh hard-delete setelah dicatat;
- registrasi membutuhkan minimal satu dokumen legal terverifikasi;
- pembuat aset tidak boleh menjadi pendaftar aset;
- pencatat dokumen legal tidak boleh menjadi verifikator dokumen yang sama;
- valuasi, maintenance, income, benefit distribution, dan event bersifat
  append-only;
- distribusi manfaat yang ditautkan ke income tidak boleh melampaui nilai
  income terkait;
- semua query tenant-owned wajib scoped `organization_id`;
- UI permission hanya untuk UX, sedangkan service dan RLS tetap menjadi
  pengamanan utama.

## Permission

- `waqf.read`;
- `waqf_assets.manage`;
- `waqf_assets.register`;
- `waqf_legal_documents.manage`;
- `waqf_legal_documents.verify`;
- `waqf_nazhir.manage`;
- `waqf_valuations.record`;
- `waqf_utilizations.manage`;
- `waqf_maintenance.record`;
- `waqf_income.record`;
- `waqf_benefits.distribute`.

Owner dan admin memperoleh seluruh permission. Field officer memperoleh akses
operasional pencatatan, tetapi tidak registrasi/verifikasi legal. Auditor hanya
read-only.

## API

Endpoint berada di `/api/v1/waqf`:

- `GET|POST /assets`;
- `GET /assets/:id`;
- `POST /assets/:id/register`;
- `POST /assets/:id/legal-documents`;
- `POST /legal-documents/:id/verify`;
- `POST /assets/:id/nazhirs`;
- `POST /assets/:id/valuations`;
- `POST /assets/:id/utilizations`;
- `POST /assets/:id/maintenance`;
- `POST /assets/:id/income`;
- `POST /assets/:id/benefits`;
- `GET /contacts`.

Command income dan benefit wajib membawa `Idempotency-Key` agar aman diulang.

## Batas fase

- upload/download dokumen binary menunggu konfigurasi S3 production;
- belum ada workflow approval generik untuk perubahan status wakaf selain
  maker-checker di service;
- belum ada integrasi otomatis ke ledger dana untuk income/manfaat wakaf;
- belum ada laporan wakaf lintas periode; itu masuk fase Reports.

## Validasi

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- server/domain/waqf-rules.test.ts server/routes/waqf-schemas.test.ts
```

Migration production perlu diterapkan secara sadar karena workspace saat ini
hanya memakai branch Neon `production`.
