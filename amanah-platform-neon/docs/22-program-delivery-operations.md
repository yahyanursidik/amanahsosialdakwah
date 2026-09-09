# Area, Mitra, dan Kuota Program

Setiap Program dapat memiliki satu atau lebih area penyaluran. Area menyimpan
wilayah kerja, kapasitas penerima, dan status kesiapan tanpa mengubah data
distribusi resmi.

## Batas proses

```text
Pengajuan → kasus eligible → waitlist/reservasi/alokasi kuota → distribusi → bukti
```

- `waitlisted` tidak mengonsumsi kuota dan dapat dipakai saat asesmen belum
  selesai atau area masih penuh.
- `reserved` dan `allocated` hanya dapat dibuat jika kasus pengajuan berstatus
  `eligible` dan area memiliki sisa kuota.
- Reservasi/alokasi bukan bukti penyaluran dan bukan transaksi dana. Pelaksanaan
  tetap memakai Distribution Engine serta fulfilment gudang bila bentuk
  dukungannya barang.
- Setiap pengajuan hanya boleh mempunyai satu alokasi per Program. Perubahan
  berikutnya harus menggunakan command transisi yang tercatat, bukan edit
  langsung.

## Mitra

Mitra program dapat berasal dari contact master aktif dengan role
`distribution_partner`, atau dari relasi lembaga aktif
`organization_relationships.distribution_partner`. Untuk sumber kedua, sistem
menampilkan lembaga tersebut langsung di pilihan mitra dan—saat Program
disimpan—membuat satu contact master institusi yang ditautkan ke ID lembaga.
Pemetaan itu bersifat transaksional, tercatat di audit, dan dipakai kembali pada
penugasan berikutnya. Penugasan dapat bersifat lintas area atau spesifik area,
memiliki peran, PIC, dan status kesiapan. Sistem hanya mengizinkan mitra yang
berstatus aktif dan `ready`/`accepted` ketika dicantumkan pada alokasi.

## Perencanaan saat membuat Program

Halaman **Program Baru** dapat menyimpan draft Program beserta beberapa area
dan penugasan mitra dalam satu command transaksional. Area ditulis sebagai
nama area, kota/kabupaten, provinsi, alamat jelas, rincian administratif, dan
kuota. Kota/kabupaten disarankan dari referensi kota/kabupaten Indonesia,
alamat CRM, serta area Program yang sudah ada pada organisasi aktif; ketika
nama kota cocok, provinsi diisi otomatis. Pengguna tetap dapat mengetik daerah
baru. Referensi nasional dicache di API dan memiliki fallback lokal, sehingga
form tetap dapat dipakai jika referensi publik sedang tidak tersedia. Data
referensi bersumber dari Open Admin Data, berlisensi CC BY 4.0.

Pilihan mitra memuat contact aktif berperan `distribution_partner` dan lembaga
yang memiliki relasi penyalur aktif dengan organisasi. Penugasan dapat diarahkan
ke satu area atau seluruh area Program. Penugasan awal ini kemudian menjadi
pilihan pada proses alokasi pengajuan yang terkait dengan Program; tidak berarti
pengajuan telah disetujui atau distribusi telah terjadi.

Server selalu mengambil organisasi dari request context, memeriksa permission
`programs.manage`, dan memeriksa `crm_contacts.read` bila ada penugasan mitra.
Program, area, penugasan mitra, revisi Program, dan audit event dibuat atau
dibatalkan bersama-sama.

## Keamanan dan integritas

- Semua tabel tenant-owned ber-`organization_id`, RLS aktif, serta policy
  SELECT/INSERT/UPDATE/DELETE eksplisit.
- Browser tidak mengirimkan organization scope yang dipercaya; server mengambil
  organisasi aktif dari request context.
- Alokasi memakai `Idempotency-Key` dan mengunci row area sebelum menghitung
  penggunaan kuota, sehingga kapasitas tidak dapat terlampaui oleh permintaan
  paralel.
- Pembuatan area, penugasan mitra, dan alokasi mencatat audit event.
- Hard delete diblokir untuk menjaga jejak keputusan operasional.

## Migration

`drizzle/0030_program_delivery_operations.sql` menambahkan:

- `program_delivery_areas`;
- `program_partner_assignments`;
- `program_application_allocations`.

Migration bersifat additif dan tidak mengubah transaksi atau data program yang
sudah ada.
