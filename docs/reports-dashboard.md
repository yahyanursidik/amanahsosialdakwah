# Reports and Dashboard

## Scope fase 20

Fase ini menyediakan laporan organisasi agregat sebelum memperluas visualisasi
dashboard. Endpoint utama adalah `GET /api/v1/reports/overview` dengan rentang
terkontrol `30d`, `90d`, atau `365d`.

Laporan meliputi:

- program aktif, kasus, dan distribusi per program;
- penerimaan dan penyaluran dana per mata uang;
- posisi inventory dan batch yang mendekati kedaluwarsa;
- approval, distribusi, logistik, kafalah, evidence, dan legalitas wakaf yang
  membutuhkan tindak lanjut;
- portofolio, pendapatan, dan distribusi manfaat wakaf.

## Security

- request memakai session dan active organization yang divalidasi server;
- endpoint memerlukan `reports.read`;
- setiap bagian juga memerlukan permission baca modul sumber;
- query tetap membawa `organization_id` dan berjalan sebagai `app_runtime`
  dengan transaction-local RLS context;
- agregat tidak memuat identitas penerima, nomor identitas, alamat, telepon,
  nama file, atau dokumen restricted;
- nilai uang selalu dikelompokkan per currency dan tidak dijumlahkan lintas
  mata uang.

Owner, admin, dan auditor memperoleh `reports.read`. Field officer tidak
memperolehnya secara default. Custom role dapat diberi permission ini bersama
permission baca modul yang memang boleh dilaporkan.

## Actionability

Antrean tindakan menaut langsung ke modul sumber. Indikator awal:

- approval in-progress lebih dari tiga hari;
- distribusi aktif tanpa pembaruan lebih dari dua hari;
- batch dengan stok yang kedaluwarsa dalam 30 hari;
- shipment aktif lebih dari tiga hari;
- jadwal kafalah melewati jatuh tempo;
- evidence pending lebih dari sehari atau quarantined;
- legalitas aset wakaf incomplete, pending review, atau disputed.

## Known limitations

- laporan belum menyediakan export terkontrol dan scheduled report;
- SLA masih berupa threshold sistem, belum dapat dikonfigurasi per organisasi;
- belum ada chart historis/materialized aggregate untuk volume data besar;
- nilai perolehan wakaf belum sama dengan valuasi terakhir;
- binary evidence tetap menunggu konfigurasi S3 production.

## Rollback notes

Migration `0023_reports_dashboard.sql` hanya menambah permission, assignment
role, dan indeks. Rollback dilakukan dengan menghapus assignment
`reports.read`, permission tersebut, lalu indeks `idx_*_reporting`. Tidak ada
data transaksi yang berubah.
