# Development Log

## Template

### YYYY-MM-DD — Judul

**Goal**

**Completed**

- item

**Files changed**

- `path/file.ts`

**Migration**

- nama migration;
- Neon branch;
- hasil.

**Security impact**

- tenant/permission/data impact.

**Tests run**

```text
command → result
```

**Decisions**

**Known limitations**

**Next recommended task**

### 2026-07-30 — Applications and Cases vertical slice

**Goal**

Membangun fase 8 sesuai roadmap dengan pola backend Hono/Drizzle yang dapat
dipakai modul berikutnya.

**Completed**

- baseline Drizzle dari schema branch development;
- application intake, submit, screening, dan case conversion;
- case list, detail, assignment, timeline, dan audit;
- API `/api/v1` dengan request ID, envelope, Zod, membership, permission, dan
  transaction-local RLS;
- UI Refine responsive dan permission-aware;
- RLS isolation serta no-hard-delete test.

**Files changed**

- `api/app.ts`
- `api/db/applications-schema.ts`
- `api/services/application-case-service.ts`
- `api/routes/applications.ts`
- `api/routes/cases.ts`
- `drizzle/0001_applications_cases.sql`
- `drizzle/0002_harden_application_case_audit_policies.sql`
- `src/pages/applications/*`
- `src/pages/cases/*`

**Migration**

- `drizzle/0001_applications_cases.sql`;
- `drizzle/0002_harden_application_case_audit_policies.sql`;
- Neon branch `dev-neon-foundation`;
- kedua migration diterapkan dan SQL isolation test lulus.

**Security impact**

- organization header divalidasi terhadap membership aktif di server;
- command memeriksa permission, status, dan relasi tenant;
- RLS berjalan sebagai `app_runtime`;
- screening, timeline, dan audit append-only;
- pembuat pengajuan tidak dapat melakukan screening sendiri.

**Tests run**

```text
npm run typecheck → pass
npm run lint → pass
npm run test → 11 files / 46 tests pass
npm run db:check → pass
npm run neon:test:isolation → 2 SQL tests pass
npm run build → pass
```

**Decisions**

- modul lama tetap memakai `/api/data` selama migrasi bertahap;
- modul baru memakai Hono REST `/api/v1`;
- baseline Drizzle `0000` tidak diterapkan ulang pada database existing.

**Known limitations**

- Program dan CRM belum dipindahkan ke Hono/Drizzle service pattern;
- mutation error presentation masih memakai perilaku Refine dasar;
- case state setelah assignment belum mencakup assessment engine.

**Next recommended task**

- fase 9 Assessment Engine.

### 2026-07-30 — Assessment Engine vertical slice

**Goal**

Membangun fase 9 dengan template berversi, scoring server-side, asesmen kasus,
dan review independen.

**Completed**

- template, version, section, dan question authoring;
- publish command tanpa silent edit pada versi published;
- case assessment, answer validation, scoring, submit, review, dan revision;
- self-review prevention dan update outcome kasus dalam transaction;
- Hono REST `/api/v1`, Refine resource, route, navigasi, dan permission-aware UI;
- RLS eksplisit dan composite tenant foreign keys;
- metadata evidence private disiapkan tanpa membuka upload yang belum aman.

**Files changed**

- `api/db/assessments-schema.ts`
- `api/domain/assessment-rules.ts`
- `api/services/assessment-service.ts`
- `api/routes/assessment-templates.ts`
- `api/routes/assessments.ts`
- `drizzle/0003_famous_xorn.sql`
- `drizzle/0004_eminent_valkyrie.sql`
- `drizzle/0005_aspiring_thanos.sql`
- `src/features/assessments/*`
- `src/pages/assessments/*`
- `db/tests/assessment_isolation.sql`

**Migration**

- ketiga migration Assessment Engine diterapkan;
- Neon branch `dev-neon-foundation`;
- seed permission diterapkan;
- TypeScript database types diperbarui untuk 37 tabel;
- tiga SQL isolation test lulus.

**Security impact**

- browser tetap tidak menerima credential database;
- organization dan membership di-resolve server-side;
- semua command memeriksa permission dan berjalan sebagai `app_runtime`;
- composite foreign key mencegah relasi parent lintas organisasi;
- reviews/events/evidence append-only dan transaksi tidak dapat di-hard-delete;
- reviewer tidak boleh sama dengan asesor.

**Tests run**

```text
npm run typecheck → pass
npm run lint → pass
npm run test → 13 files / 56 tests pass
npm run db:check → pass
npm run neon:test:isolation → 3 SQL tests pass
npm run build → pass
npm audit → 0 vulnerabilities
```

**Decisions**

- versi template published immutable; koreksi dibuat sebagai versi baru;
- scoring resmi selalu dihitung ulang di server saat submit;
- pertanyaan evidence wajib belum dapat dipublish sampai Evidence Service aktif;
- assessment approval langsung memperbarui status case menjadi eligible atau
  not eligible; Approval Engine berikutnya menangani workflow approval generik.

**Known limitations**

- upload/download evidence menunggu fase 17;
- Program dan CRM masih menggunakan `/api/data`;
- bundle frontend utama masih menghasilkan peringatan ukuran chunk.

**Next recommended task**

- fase 10 Approval Engine.

### 2026-07-30 — Approval Engine vertical slice

**Goal**

Membangun fase 10 dan menyediakan akun login development untuk setiap role
sistem.

**Completed**

- workflow, version, step, publish, request snapshot, submit, decision,
  revision, rejection, cancellation, dan timeline;
- maker-checker, kuorum, row lock, unique approval vote, immutable final state,
  audit, RLS, dan composite tenant foreign key;
- UI Refine untuk workflow dan request dengan route serta action
  permission-aware;
- provisioning idempotent Neon Auth untuk owner, admin, field officer, dan
  auditor;
- seluruh akun diikat ke membership aktif organisasi `IHSANUL-ADAB-DEV` dan
  login password diverifikasi.

**Migration**

- `drizzle/0006_wealthy_madame_web.sql`;
- `drizzle/0007_dusty_sauron.sql`;
- Neon branch `dev-neon-foundation`;
- migration diterapkan dan empat SQL isolation test lulus.

**Security impact**

- password akun acak hanya dicetak sekali dan tidak disimpan di repository;
- keputusan memeriksa permission langkah tanpa hardcode role;
- actor action harus sama dengan profile session;
- request final dan action approval immutable;
- browser tetap tidak menerima database credential.

**Tests run**

```text
npm run typecheck → pass
npm run lint → pass
npm run test → 14 files / 60 tests pass
npm run db:check → pass
npm run neon:test:isolation → 4 SQL tests pass
```

**Decisions**

- workflow mengacu pada permission, bukan role;
- request menyimpan snapshot versi workflow, langkah, dan subjek;
- revisi membuat siklus baru tanpa menghapus action siklus sebelumnya;
- akun dibuat hanya pada branch development.

**Known limitations**

- subject approval baru mendukung assessment dan case;
- integrasi status ke Funds dan modul transaksi berikutnya belum dibuat.

**Next recommended task**

- fase 11 Funds.

## 2026-07-30 — Fase 11 Funds

**Completed**

- menambahkan restriction, commitment, receipt, allocation, disbursement,
  reversal, ledger, reconciliation, dan idempotency record;
- menghubungkan draft allocation ke Approval Engine melalui subject
  `fund_allocation`;
- menambahkan API transaction-safe dengan exact numeric, row locking, audit,
  dan idempotent retry;
- menambahkan dashboard dan form operasional Funds berbasis Refine;
- menambahkan RLS per command, composite tenant foreign key, no hard delete,
  dan trigger append-only;
- menambahkan unit test aturan dana, validasi request, SQL tenant isolation,
  dan concurrency test;
- menerapkan migration `drizzle/0008_magenta_boomer.sql`, sinkronisasi policy
  `drizzle/0009_lyrical_mongoose.sql`, dan hardening least-privilege
  `drizzle/0010_optimal_sebastian_shaw.sql` pada branch Neon development,
  menjalankan seed, dan meregenerasi types.

**Decisions**

- ledger menjadi sumber kebenaran saldo;
- commitment, receipt, allocation, disbursement, dan distribution merupakan
  konsep berbeda;
- allocation baru mengubah saldo setelah approval final dan aktivasi eksplisit;
- koreksi transaksi final menggunakan reversal;
- nominal lintas API memakai string desimal, bukan JavaScript float.

**Validation**

- seluruh SQL tenant isolation test lulus;
- concurrency test menghasilkan satu alokasi berhasil, satu ditolak, saldo akhir
  tetap benar;
- typecheck, lint, unit test, build, dan audit dijalankan sebelum handoff.

**Known limitations**

- reversal belum memiliki workflow approval tersendiri;
- integrasi rekening koran masih manual;
- cash distribution dilanjutkan pada fase 12.

**Next recommended task**

- fase 12 Cash Distribution.

## 2026-07-30 — Fase 12 Cash Distribution

**Completed**

- menambahkan plan, assignment, execution, confirmation, evidence metadata,
  verification, event, dan idempotency record;
- menghubungkan distribution ke disbursement posted, allocation approved,
  program, kasus eligible, dan contact penerima aktif;
- menambahkan command workflow, row locking, limit nilai rencana, maker-checker,
  siklus revisi, audit, dan append-only protection;
- menambahkan list, create, dan detail workflow berbasis Refine dengan action
  permission-aware;
- menambahkan unit test aturan/status dan SQL tenant isolation;
- menerapkan `drizzle/0011_magenta_morlocks.sql` pada branch
  `dev-neon-foundation`, menjalankan seed, dan memperbarui types untuk 60 tabel.

**Decisions**

- distribution adalah bukti pelaksanaan, bukan jurnal uang kedua;
- data konteks dan nominal rencana immutable;
- verifikator harus berbeda dari pembuat dan pelaksana;
- evidence fase ini hanya metadata privat non-berkas;
- upload evidence tetap menunggu Evidence Service fase 17.

**Validation**

- `npm run quality` — 18 test files / 76 tests lulus;
- `npm run db:check` — schema valid;
- `npm run neon:test:isolation` — 6 SQL tests lulus;
- `npm run build` — production bundle berhasil;
- `npm audit --audit-level=high` — 0 vulnerabilities.

**Next recommended task**

- fase 13 Goods & Inventory.

## 2026-07-30 — Fase 13 Procurement

**Completed**

- menambahkan procurement request, purchase order, goods receipt, vendor
  invoice, event, dan idempotency record;
- menambahkan Hono REST `/api/v1/procurement` dengan command submit, approve,
  cancel, create PO, issue PO, receive goods, dan record invoice;
- menambahkan UI Refine untuk daftar, pembuatan draft, detail, dan command
  operasional procurement;
- menambahkan RLS eksplisit, composite tenant foreign key, append-only trigger,
  no hard delete, dan perluasan audit policy;
- menambahkan permission procurement pada seed development.

**Decisions**

- goods receipt fase ini belum membuat stock movement; inventory source of truth
  masuk fase 14;
- quotation disimpan sebagai konteks quote pada request/PO, bukan tabel
  quotation terpisah;
- issue PO dan receive goods memakai idempotency key karena rawan retry.

**Known limitations**

- approval procurement masih command permission-based, belum memakai workflow
  approval generik;
- invoice hanya menyimpan referensi pembayaran dan belum mengubah ledger dana;
- upload nota/invoice menunggu Evidence Service.

**Next recommended task**

- fase 14 Inventory and Warehouse.

## 2026-07-30 — Fase 14 Inventory and Warehouse

**Completed**

- menambahkan master produk inventory, gudang, batch, balance, movement,
  adjustment request, dan idempotency record;
- menambahkan API `/api/v1/inventory` untuk produk, gudang, saldo, movement,
  adjustment, dan posting goods receipt ke stok;
- menambahkan UI Refine untuk ringkasan inventory, master produk/gudang,
  saldo, movement, dan workflow adjustment;
- menambahkan RLS eksplisit, composite tenant foreign key, no hard delete,
  append-only movement, maker-checker adjustment, dan policy audit inventory;
- menambahkan permission inventory pada migration dan seed development;
- menambahkan unit test aturan inventory, schema validation, dan SQL tenant
  isolation.

**Decisions**

- `inventory_movements` menjadi sumber kebenaran stok;
- `inventory_balances` adalah cache transaksi yang tidak boleh diedit manual;
- adjustment final menggunakan posting movement, bukan update saldo langsung;
- goods receipt dapat diposting ke inventory melalui command idempotent.

**Known limitations**

- transfer antar-gudang, reservasi, FEFO picking, dan stock opname lengkap masuk
  fase berikutnya;
- UI posting goods receipt ke produk inventory masih perlu form mapping khusus;
- upload bukti kerusakan/hilang menunggu Evidence Service.

**Next recommended task**

- fase 15 Aid Packages atau hardening Inventory transfer/reservation sebelum
  packing paket.

## 2026-08-01 — Fase 15 Aid Packages

**Completed**

- menambahkan template paket dan komponen per paket;
- menambahkan rencana packing, batch aktual FEFO, substitusi terkontrol, dan
  unpack reversal;
- membukukan `packing_out` dan `unpack_in` sebagai movement inventory
  append-only;
- menambahkan Hono REST, Refine resources, UI operasional, RLS, permission,
  audit, dan idempotency;
- menambahkan unit test aturan/schema dan SQL tenant isolation.

**Decisions**

- template aktif immutable; koreksi menggunakan template baru;
- batch aktual dipilih server-side memakai FEFO dan row lock;
- produk substitusi wajib satuan sama dan alasan terdokumentasi;
- unpack membuat corrective movement baru dan tidak menghapus packing.

**Known limitations**

- shipment dan tracking masuk fase 16 Logistics;
- evidence berkas menunggu fase 17 Evidence Service;
- reservation dan transfer antar-gudang masih perlu hardening tersendiri.

**Next recommended task**

- fase 16 Logistics.

## 2026-08-01 — Rekonsiliasi database production

**Completed**

- mengaudit schema dan ledger migration production tanpa reset;
- merekonsiliasi migration lama yang objeknya sudah ada;
- menerapkan Assessment, Inventory, Aid Packages, dan hardening Distribution;
- memulihkan policy RLS, grant runtime, permission, dan trigger append-only;
- membuat organisasi production `IHSANUL-ADAB`;
- membuat dan memverifikasi login Neon Auth untuk owner, admin, field officer,
  dan auditor beserta membership aktif dan role masing-masing;
- mengarahkan `.neon` dan `.env` lokal ke branch `production`;
- menautkan workspace ke project Vercel utama `amanahsosialdakwah`.

**Security impact**

- tidak ada reset atau seed development yang dijalankan pada production;
- seluruh migration diuji lebih dahulu pada clone rehearsal production;
- koneksi direct/unpooled tetap hanya untuk operasi schema lokal;
- password acak tidak disimpan di repository;
- pengunggahan secret database ke Vercel belum dilakukan tanpa persetujuan
  eksplisit terpisah.

**Validation**

- 10 SQL tenant isolation suites lulus pada rehearsal dan production;
- schema production memiliki tabel `inventory_movements` dan Aid Packages;
- akun production berhasil dibuat dan login password diverifikasi.

**Next recommended task**

- pasang environment variable Neon production pada Vercel setelah persetujuan
  eksplisit, lalu redeploy dan lakukan smoke test login production.

## 2026-08-01 — Fase 16 Logistics

**Completed**

- menambahkan master kurir, shipment, tracking, delivery, return, incident, dan
  idempotency record;
- menghubungkan shipment hanya ke packing paket berstatus `packed`;
- menambahkan command dispatch, tracking, delivery, return, receive return,
  report incident, dan resolve incident;
- menambahkan UI Refine untuk daftar logistik, pembuatan kurir/shipment, detail,
  timeline, dan action permission-aware;
- menambahkan RLS eksplisit, composite tenant foreign key, append-only trigger,
  immutable shipment context, maker-checker, audit, dan least-privilege grant;
- menguji migration pada clone rehearsal sebelum menerapkannya ke production;
- memperbarui generated database types menjadi 86 tabel.

**Decisions**

- Logistics melacak perjalanan paket dan bukan ledger stok kedua;
- alamat dan telepon tidak dikirim pada response daftar shipment;
- return tidak otomatis mengembalikan stok dan perlu pemeriksaan sebelum
  unpack/reversal;
- event final delivery dan tracking bersifat append-only;
- bukti berkas tetap masuk Phase 17 Evidence Service.

**Migration**

- `drizzle/0019_logistics.sql`;
- rehearsal `prod-rehearsal-logistics-20260801` lulus 11 SQL isolation suites;
- migration yang sama diterapkan ke Neon `production` dan seluruh suite lulus.

**Next recommended task**

- fase 17 Evidence Service dengan object storage private dan signed URL.

## 2026-08-01 — Fase 17 Evidence Service

**Completed**

- menambahkan evidence file metadata, access event, publication, klasifikasi,
  dan version chain;
- menambahkan signed PUT 10 menit, signed GET 5 menit, HEAD verification,
  quarantine, soft deletion, dan controlled publication;
- memvalidasi entity ownership, MIME allowlist, ukuran maksimum 25 MB, serta
  restricted permission;
- menambahkan UI daftar, upload langsung ke signed URL, detail, download,
  publication consent, dan deletion workflow;
- menambahkan RLS eksplisit, append-only access audit, immutable identity,
  tenant isolation, serta role permission;
- menguji migration pada rehearsal sebelum menerapkan `0020` ke production;
- memperbarui generated database types menjadi 89 tabel.

**Decisions**

- project Neon `aws-ap-southeast-1` tidak dapat memakai Neon Object Storage beta
  yang saat ini terbatas pada `us-east-2`;
- adapter menggunakan kontrak S3-compatible sehingga provider dapat dipilih
  tanpa mengubah domain/service;
- object key tidak memuat nama penerima, nomor identitas, atau nama asli file;
- delete bersifat logical dan penghapusan fisik menunggu retention policy;
- publication record tidak mengubah bucket privat menjadi publik.

**Migration**

- `drizzle/0020_evidence_service.sql`;
- rehearsal `prod-rehearsal-evidence-20260801` lulus 12 SQL isolation suites;
- migration yang sama diterapkan ke Neon `production` dan seluruh suite lulus.

**Known limitations**

- bucket dan credential `S3_*` production belum dikonfigurasi;
- end-to-end binary upload/download menunggu bucket, CORS, dan environment
  variable Vercel;
- antivirus/malware scanning belum tersedia;
- lifecycle physical deletion belum dijalankan otomatis.

**Next recommended task**

- fase 18 Kafalah setelah bucket Evidence dikonfigurasi dan smoke test binary
  diselesaikan.
