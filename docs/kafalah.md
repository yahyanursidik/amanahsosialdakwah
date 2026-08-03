# Kafalah

## Ruang lingkup

Phase 18 mengelola rangkaian kebutuhan penerima, pemasangan kafil, kontrak,
jadwal, pembayaran, penyaluran, monitoring manfaat, dan renewal. Contact Master
tetap menjadi sumber identitas: kontak dengan role `kafil` adalah sponsor dan
kontak dengan role `beneficiary` adalah penerima manfaat.

## Aggregate dan state

Alur utama:

1. petugas membuat kebutuhan berstatus `draft`;
2. aktor berbeda menyetujui kebutuhan menjadi `approved`;
3. matching mengalokasikan sebagian atau seluruh nilai kebutuhan kepada kafil;
4. kontrak dibuat dari matching `proposed`;
5. aktor berbeda mengaktifkan kontrak dan server menghasilkan jadwal;
6. pembayaran kafil dan penyaluran penerima dicatat secara append-only;
7. monitoring dikirim petugas dan diverifikasi aktor berbeda;
8. renewal diajukan dan diputuskan melalui maker-checker.

## Model data

Migration `drizzle/0021_kafalah.sql` membuat:

- `kafalah_needs`;
- `kafalah_matches`;
- `kafalah_contracts`;
- `kafalah_schedules`;
- `kafalah_payments`;
- `kafalah_distributions`;
- `kafalah_monitoring_reports`;
- `kafalah_renewals`;
- `kafalah_events`;
- `kafalah_idempotency_records`.

Semua relasi bisnis memakai pasangan `(id, organization_id)` untuk mencegah
referensi lintas tenant. Nilai uang disimpan sebagai `numeric(20,2)` dan operasi
kapasitas dilakukan langsung oleh PostgreSQL.

## Authorization

Permission tersedia secara granular:

- `kafalah.read`;
- `kafalah_needs.manage` dan `kafalah_needs.approve`;
- `kafalah_matches.manage`;
- `kafalah_contracts.manage`;
- `kafalah_payments.post`;
- `kafalah_distributions.record`;
- `kafalah_monitoring.manage` dan `kafalah_monitoring.verify`;
- `kafalah_renewals.manage` dan `kafalah_renewals.decide`.

Owner dan admin memperoleh seluruh permission. Field officer dapat menjalankan
operasi lapangan tetapi tidak approval, verification, atau decision. Auditor
hanya memperoleh akses baca. UI memeriksa permission untuk UX; service dan RLS
tetap menjadi pengamanan utama.

Policy RLS `SELECT`, `INSERT`, `UPDATE`, dan `DELETE` dinyatakan eksplisit pada
setiap tabel. `DELETE` selalu ditolak. Payment, distribution, event, dan
idempotency record bersifat append-only. Update tabel lain dibatasi sesuai
permission command-nya.

## API

Endpoint berada di `/api/v1/kafalah`:

- `GET /beneficiaries`, `GET /sponsors`;
- `GET|POST /needs`, `POST /needs/:id/approve`;
- `GET|POST /matches`;
- `GET|POST /contracts`, `GET /contracts/:id`,
  `POST /contracts/:id/activate`;
- `POST /schedules/:id/payments`;
- `POST /schedules/:id/distributions`;
- `POST /contracts/:id/monitoring`, `POST /monitoring/:id/decision`;
- `POST /contracts/:id/renewals`, `POST /renewals/:id/decision`.

Payment dan distribution wajib membawa header `Idempotency-Key` minimal 16
karakter. Active organization dan membership selalu dibentuk ulang oleh
request context server-side.

## Invariant sensitif

- pembuat kebutuhan tidak boleh menjadi approver;
- pembuat kontrak tidak boleh menjadi activator;
- pencatat pembayaran tidak boleh menjadi pencatat distribution terkait;
- pengirim monitoring tidak boleh menjadi verifier;
- pengaju renewal tidak boleh menjadi decision maker;
- matching tidak dapat melampaui sisa kebutuhan;
- payment tidak dapat melampaui tagihan jadwal;
- distribution tidak dapat melampaui payment maupun saldo terbayar jadwal;
- hard delete tidak tersedia.

## Validasi development

Gunakan branch Neon development, lalu jalankan:

```bash
npm run db:check
npm run db:migrate
npm run neon:types
npm run neon:test:isolation
npm run neon:test:kafalah-concurrency
npm run quality
npm run build
```

Jangan menerapkan migration langsung ke production sebelum rehearsal branch,
SQL isolation suite, concurrency test, dan build semuanya lulus.
