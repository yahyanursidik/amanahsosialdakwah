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
