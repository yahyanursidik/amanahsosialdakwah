# Evidence Service

## Tujuan

Phase 17 menyediakan penyimpanan bukti privat dengan metadata di Neon dan
binary pada object storage S3-compatible. Browser tidak pernah menerima access
key storage; browser hanya menerima signed URL berumur pendek.

## Provider storage

Project Neon production berada di `aws-ap-southeast-1`. Neon Object Storage
beta saat ini hanya tersedia di `us-east-2`, sehingga implementasi memakai
adapter S3-compatible provider-agnostic. Adapter dapat digunakan dengan AWS S3,
Cloudflare R2, Contabo Object Storage, atau provider kompatibel lain.

Variabel server-only:

```env
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false
```

## Upload

```text
upload intent
-> validasi membership, permission, entity, MIME, ukuran
-> metadata pending_upload
-> signed PUT URL 10 menit
-> browser upload langsung ke bucket privat
-> confirm + HEAD object
-> available atau quarantined
```

MIME yang diperbolehkan: PDF, JPEG, PNG, WebP, dan MP4. Ukuran maksimum 25 MB.

## Download

Download memerlukan `evidence_files.download`. Bukti `restricted` juga
memerlukan `evidence_files.restricted_read`. Signed GET URL berlaku lima menit
dan setiap penerbitan URL dicatat pada `evidence_access_events`.

## Versioning dan deletion

- Versi baru merujuk `previous_version_id` dan memakai `logical_file_id` yang
  sama.
- Versi lama menjadi `superseded` hanya setelah object versi baru diverifikasi.
- Tidak ada overwrite atau hard delete.
- Delete terkontrol hanya mengubah status menjadi `deleted` dan menyimpan
  actor, waktu, serta alasan.
- Penghapusan fisik object menunggu retention policy yang disetujui.

## Publikasi

Publikasi adalah command terpisah dan memerlukan consent reference serta
catatan redaksi/anonymization. Bucket tetap privat; publication record bukan
public object URL.

## Object key

```text
organizations/{org}/{classification}/{entityType}/{entityId}/{logicalId}/{version}/file-{fileId}.{ext}
```

Nama penerima, nomor identitas, dan nama asli file tidak masuk object key.

## Status operasional

Schema, API, UI, permission, dan RLS telah aktif di production. Upload/download
binary baru siap setelah enam variabel `S3_*` dikonfigurasi pada server lokal
dan Vercel production serta CORS bucket mengizinkan origin aplikasi untuk PUT.
