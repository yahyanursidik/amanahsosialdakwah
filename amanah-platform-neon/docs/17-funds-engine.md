# Funds & Amanah Engine

## Scope fase 11

Fase ini menyediakan vertical slice dana:

- pembatasan dana unrestricted atau terikat program;
- komitmen pemberi amanah;
- penerimaan kas;
- draft alokasi yang terhubung ke Approval Engine;
- aktivasi alokasi yang telah disetujui;
- penyaluran terhadap alokasi aktif;
- reversal;
- rekonsiliasi;
- ledger append-only;
- idempotency dan penguncian saldo untuk transaksi bersamaan.

Distribution belum termasuk fase ini. Disbursement adalah perpindahan uang,
sedangkan Distribution pada fase berikutnya akan mencatat pelaksanaan bantuan,
bukti, konfirmasi penerima, dan verifikasi lapangan.

## Model saldo

Ledger adalah sumber kebenaran. Tabel transaksi menyimpan fakta bisnis dan
`fund_ledger_entries` menyimpan dampak nominalnya.

| Command | available | allocated | disbursed |
| --- | ---: | ---: | ---: |
| Receipt posted | `+amount` | `0` | `0` |
| Receipt reversed | `-amount` | `0` | `0` |
| Allocation approved | `-amount` | `+amount` | `0` |
| Allocation reversed | `+amount` | `-amount` | `0` |
| Disbursement posted | `0` | `-amount` | `+amount` |
| Disbursement reversed | `0` | `+amount` | `-amount` |

Saldo kas adalah `available + allocated`. `disbursed` merupakan total kumulatif
yang telah keluar, setelah memperhitungkan reversal.

Semua nominal disimpan sebagai `numeric(20,2)` dan dikirim melalui API sebagai
string desimal. JavaScript floating point tidak digunakan untuk keputusan saldo.

## State dan approval

- commitment tidak menambah saldo;
- receipt langsung posted dan menambah available;
- allocation dibuat sebagai draft;
- Approval Engine menyimpan snapshot allocation;
- allocation hanya dapat diaktifkan jika ada approval request final berstatus
  `approved` untuk subject `fund_allocation`;
- disbursement hanya dapat merujuk allocation `approved`;
- transaksi final tidak diedit atau dihapus; koreksi dibuat sebagai reversal.

## Concurrency dan idempotency

Command sensitif mewajibkan header `Idempotency-Key`:

- post receipt;
- activate/reverse allocation;
- post/reverse disbursement;
- create reconciliation.

Key unik per organisasi dan request hash harus sama saat retry. Respons command
yang telah selesai disimpan sebagai snapshot sehingga retry tidak membuat
ledger entry kedua.

Restriction atau allocation dikunci dengan `SELECT ... FOR UPDATE` sebelum saldo
diperiksa. Karena pemeriksaan dan penulisan ledger berada dalam satu transaksi,
dua command bersamaan tidak dapat menghabiskan saldo yang sama.

## RLS dan permission

Seluruh tabel Funds mengaktifkan RLS dan memiliki policy SELECT, INSERT, UPDATE,
DELETE eksplisit.

- `*.read` hanya membaca data dari membership aktif pada organisasi yang sama;
- `*.manage`, `*.post`, `*.activate`, dan `*.reverse` membatasi command sesuai
  resource/action;
- DELETE selalu `false`;
- ledger, reversal, dan reconciliation tidak dapat diubah setelah insert;
- trigger database juga melindungi status receipt, allocation, dan disbursement;
- foreign key `(id, organization_id)` mencegah relasi lintas tenant;
- browser tidak memperoleh connection string atau role database istimewa.

UI memakai permission hanya untuk pengalaman pengguna. API memvalidasi ulang
permission dan PostgreSQL RLS tetap menjadi batas keamanan terakhir.

## Menjalankan validasi

```powershell
npm run db:check
npm run neon:migrate
npm run neon:seed
npm run neon:test:isolation
npm run neon:test:fund-concurrency
npm run neon:types
npm run quality
npm run build
```

Migration dan test harus dijalankan pada branch Neon development, bukan branch
production.

## Batas fase

- belum ada cash distribution plan, assignment, evidence, atau verification;
- belum ada bank feed/import mutasi otomatis;
- belum ada multi-currency conversion;
- reversal memakai alasan wajib tetapi belum memerlukan approval workflow
  terpisah;
- `MoneyDisplay` adalah presentasi; keputusan nominal tetap selalu di server dan
  PostgreSQL.
