# Paket Bantuan

## Tujuan

Phase 15 membangun komposisi dan packing paket barang di atas ledger inventory.
Stok hanya berubah melalui movement append-only dan seluruh command berjalan
dalam transaksi tenant-scoped.

## Cakupan

- Template paket dan komponen per satu paket.
- Publish template; template aktif tidak diedit diam-diam.
- Rencana packing berdasarkan template aktif, gudang, dan jumlah paket.
- Pemilihan batch otomatis dengan FEFO dan row lock.
- Substitusi hanya jika komponen mengizinkan, satuan dasar sama, dan alasan
  minimal sepuluh karakter.
- Detail batch aktual untuk setiap komponen packing.
- Unpack melalui movement reversal, bukan menghapus movement packing.
- Idempotency key untuk packing dan unpack.

## Model keamanan

- Organisasi selalu berasal dari session dan membership server-side.
- API dan RLS sama-sama memeriksa permission.
- Composite foreign key mencegah template, produk, gudang, dan batch lintas
  organisasi.
- Packing item dan unpack item append-only.
- Detail final tidak mendukung hard delete.
- Field officer dapat membaca template, membuat rencana, dan packing; unpack
  hanya owner/admin.
- Auditor mendapat akses baca tanpa akses mutation.

## Alur status

```text
Template: draft -> active -> archived
Packing:  draft -> packed -> reversed
          draft -> cancelled
```

## Batasan

- Packing belum membuat shipment; itu masuk Phase 16 Logistics.
- Packing belum terikat ke distribution barang atau penerima individual.
- Reservasi stok terpisah dan stock transfer antar-gudang belum tersedia.
- Evidence foto packing menunggu Phase 17 Evidence Service.
