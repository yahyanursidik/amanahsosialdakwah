# Inventory dan Gudang

## Tujuan

Fase ini membangun fondasi barang konsumtif dan inventory sebagai ledger stok.
Saldo resmi berasal dari `inventory_movements`; `inventory_balances` hanya cache
terkontrol yang diperbarui dalam transaksi server.

## Cakupan

- Master produk inventory dengan SKU, satuan dasar, batch tracking, dan expiry
  tracking.
- Master gudang pusat, lapangan, mitra, dan virtual.
- Batch barang untuk produk yang membutuhkan nomor batch atau expiry.
- Movement stok append-only untuk penerimaan barang dan adjustment.
- Balance per produk, gudang, dan batch dengan larangan stok negatif.
- Adjustment request dengan status draft, submitted, approved, posted,
  rejected, dan cancelled.
- API `/api/v1/inventory/*` dengan session, membership, permission, dan tenant
  scope server-side.

## Keamanan

- Browser tidak pernah mengirim credential database.
- `organization_id` di-resolve dari session dan organisasi aktif di server.
- Semua tabel exposed memakai RLS dengan policy eksplisit.
- Movement stok tidak bisa di-update atau di-delete.
- Adjustment final tidak bisa diubah diam-diam.
- Approval adjustment memakai maker-checker: pembuat tidak boleh menyetujui
  sendiri.
- Composite foreign key mencegah relasi produk, gudang, batch, dan balance lintas
  organisasi.

## Batasan

- Transfer antar-gudang, reservasi stok, packing paket, dan FEFO otomatis belum
  diaktifkan.
- Posting goods receipt ke inventory tersedia di API, tetapi UI mapping item
  receipt ke produk inventory masih perlu dibuat lebih ergonomis.
- Evidence file untuk barang rusak/hilang tetap menunggu Evidence Service.
