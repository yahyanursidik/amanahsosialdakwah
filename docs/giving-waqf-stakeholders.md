# Penghimpunan, Wakaf Terpadu & Laporan Pemangku Kepentingan

Fase ini menutup celah alur bagi **pemberi amanah** (donatur dana, donatur
barang, wakif), **lembaga mitra penyalur**, **lembaga mitra pengaju**,
**individu pengaju**, serta **laporan umum**. Migration: `drizzle/0033_giving_waqf_stakeholder_flows.sql`.

## Ringkasan fitur

| Kebutuhan | Menu | Catatan |
| --- | --- | --- |
| Donasi barang (in-kind) | Penghimpunan → Donasi barang | Header + rincian + movement stok `receipt_in` (source `in_kind_donation`) dalam satu transaksi idempoten; tanda terima dapat dicetak. |
| Jenis wakaf | Wakaf → Aset wakaf | Skema: wakaf benda, wakaf uang (pokok dijaga), wakaf melalui uang (patungan dengan target), wakaf produktif. Peruntukan khairi/ahli/musytarak; muabbad/muaqqat. |
| Setoran wakif | Detail aset wakaf → Setoran wakif | Banyak wakif per aset, atas nama (mis. almarhum), no. AIW/Sertifikat Wakaf Uang, ikrar. Pembatalan wajib petugas berbeda + alasan. |
| Pengajuan program wakaf | Program & pengajuan → Pengajuan program wakaf | Jenis: proyek wakaf baru, penawaran aset, permohonan manfaat. Alur draft → diajukan → dinilai → disetujui/ditolak → diteruskan (membuat aset draft atau rencana pemanfaatan). |
| Pengaju lembaga / mitra atas nama penerima | Pengajuan bantuan | `submitter_type`: individu, lembaga, mitra atas nama penerima (+ `submitting_partner_contact_id`), jumlah penerima, perkiraan kebutuhan. |
| Laporan pemangku kepentingan | Laporan → Donatur, mitra & pengaju | Rekap per peran + laporan pribadi per kontak (dapat dicetak/PDF). |
| Panduan alur | Sidebar → Panduan alur | Langkah per peran dengan tautan langsung ke menu. |

## Invariant

- Donasi barang append-only; koreksi stok melalui adjustment inventory.
- Penerimaan barang membutuhkan `in_kind_donations.receive` **dan** `inventory_movements.post`.
- Setoran pada aset draft hanya untuk skema `cash_for_asset`; aset `retired` menolak setoran.
- Penilai pengajuan wakaf ≠ pencatat; pembatal setoran ≠ pencatat.
- Konversi pengajuan membutuhkan izin domain tujuan (`waqf_assets.manage` atau `waqf_utilizations.manage`).
- Laporan pemangku kepentingan hanya menampilkan bagian yang izinnya dimiliki pembaca.

## Permission baru

`waqf_contributions.record|reverse`, `waqf_proposals.manage|review`,
`in_kind_donations.read|receive`, `stakeholder_reports.read`.
Owner/admin memperoleh semua; field officer memperoleh pencatatan (tanpa
review/pembatalan); auditor memperoleh baca donasi barang dan laporan.

## API

- `GET|POST /api/v1/in-kind-donations`, `GET /api/v1/in-kind-donations/:id` (POST wajib `Idempotency-Key`)
- `POST /api/v1/waqf/assets/:id/contributions` (wajib `Idempotency-Key`), `POST /api/v1/waqf/contributions/:id/reverse`
- `GET|POST /api/v1/waqf/proposals`, `GET /api/v1/waqf/proposals/:id`,
  `POST /api/v1/waqf/proposals/:id/{submit|cancel|start-review|decision|convert}`
- `GET /api/v1/reports/stakeholders?role=donor|distribution_partner|applicant&range=30d|90d|365d`
- `GET /api/v1/reports/stakeholders/:contactId`

## Catatan migration 0032

Production pernah menerapkan sebagian `0032` tanpa tercatat di
`schema_migrations`; statement terakhir gagal karena `ON CONFLICT` memakai
kolom yang tidak memiliki unique constraint. File kini idempoten dan memakai
`ON CONFLICT (role_id, permission_id)`.

## Batas fase

- Belum ada portal login untuk donatur/mitra eksternal; laporan dibagikan oleh
  petugas (cetak/PDF).
- Donasi barang belum membuat entri ledger dana (nilai barang adalah estimasi).
- Setoran wakaf uang belum otomatis masuk ledger dana amanah.

## Registri penerima manfaat (migration 0034)

- Menu **Program & pengajuan → Penerima manfaat** (`/beneficiaries`): satu daftar
  semua penerima dari kasus program, penyaluran dana, paket bantuan, manfaat
  wakaf, dan kafalah; filter program, sumber, kategori, kerentanan, dan
  pencarian nama/telepon/4 digit NIK.
- **Tambah penerima** dalam satu langkah: kontak, peran penerima, profil lengkap
  (sosial-ekonomi, kategori & asnaf, wali, kontak darurat, rekening, lembaga
  pendamping), identitas, dan opsional pendaftaran ke program (draft pengajuan).
- NIK/KK hanya disimpan sebagai 4 digit terakhir + hash per organisasi
  (`not-retained:hash-only`) untuk mencegah data ganda; nomor rekening
  disamarkan bagi pengguna tanpa `crm_sensitive_identities.read`.
- API: `GET|POST /api/v1/beneficiaries`, `GET /api/v1/beneficiaries/summary`,
  `GET /api/v1/beneficiaries/:id`, `POST /api/v1/beneficiaries/:id/profile`.
- Deploy: terapkan migration 0034 **sebelum** kode, karena API data generik
  membaca kolom profil baru.

## Data contoh

`db/seeds/zzz-demo-giving-waqf-beneficiaries.sql` (idempoten, organisasi
IHSANUL-ADAB, awalan `DEMO-`) berisi donatur/wakif, mitra & pengaju, 8 penerima
berprofil lengkap, pengajuan individu/lembaga/mitra, area & penugasan mitra,
4 aset wakaf (uang, melalui uang, produktif, benda) dengan setoran/manfaat,
5 pengajuan wakaf berbagai status, dan 4 donasi barang. Jalankan satu file:

```powershell
node scripts/neon/seed-file.mjs db/seeds/zzz-demo-giving-waqf-beneficiaries.sql
```

Pada production perlu `NEON_ALLOW_PRODUCTION_SEED=1`.
