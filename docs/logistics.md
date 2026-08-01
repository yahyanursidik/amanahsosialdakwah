# Logistics

## Tujuan

Phase 16 mengelola perjalanan paket bantuan yang sudah berstatus `packed`,
mulai dari kurir, keberangkatan, tracking, penerimaan, return, hingga insiden.
Logistics tidak menjadi ledger stok kedua dan tidak mengubah movement inventory.

## Cakupan

- Master kurir internal, eksternal, dan mitra.
- Shipment dari satu packing paket yang sudah final.
- Dispatch idempotent dan penguncian konteks tujuan setelah berangkat.
- Tracking event append-only.
- Konfirmasi penerimaan final dan idempotent.
- Return request, perjalanan return, dan penerimaan kondisi barang.
- Insiden kerusakan, kehilangan, keterlambatan, serta keamanan.
- Maker-checker untuk penyelesaian insiden.
- Audit, RLS, permission, dan isolasi antar-organisasi.

## Alur status

```text
draft -> dispatched -> in_transit -> delivered
  |           |             |           |
  +-> cancelled             +-----------+-> return_requested
                                              |
                                              +-> returning -> returned
                                              +-------------> returned
```

## Model keamanan

- Organisasi dan membership di-resolve dari session server-side.
- Semua query dan foreign key mengikuti `organization_id`.
- Alamat dan telepon tujuan tidak dikirim pada endpoint daftar shipment;
  detail hanya tersedia bagi permission `logistics_shipments.read`.
- Tracking dan delivery append-only serta tidak memperoleh runtime grant DELETE.
- Command dispatch, tracking, delivery, dan return memakai
  `Idempotency-Key`.
- Penyelesai insiden wajib berbeda dari pelapor.
- Route guard dan tombol permission-aware hanya untuk UX; RLS tetap pengaman
  utama.

## Batasan

- Bukti foto, tanda tangan, dan dokumen pengiriman menunggu Phase 17 Evidence
  Service.
- Integrasi webhook kurir eksternal belum tersedia; model menyediakan
  `external_event_id` untuk idempotensi integrasi berikutnya.
- Barang return belum otomatis masuk stok. Operator harus melakukan pemeriksaan
  kondisi dan menjalankan unpack/reversal melalui Aid Packages bila layak.
- Tracking publik untuk penerima belum tersedia.
