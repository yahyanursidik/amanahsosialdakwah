# Mitra Penyaluran dan Pengaju

## Tujuan

Modul CRM ini mengelola lembaga, komunitas, dan individu yang berperan sebagai
mitra penyaluran dan/atau pengaju bantuan. Pihak yang sama tetap memakai satu
`crm_contacts` record agar riwayat komunikasi, consent, dan potensi duplikasi
tidak terpecah.

## Model Data

Peran disimpan secara aditif di `crm_contact_roles`:

- `distribution_partner`: pihak yang membantu penyaluran;
- `applicant`: pihak yang mengajukan bantuan untuk dirinya sebagai subjek kasus;
- peran lama seperti `beneficiary`, `donor`, dan `kafil` tetap dapat melekat
  pada contact yang sama.

Jenis pihak diturunkan dari data yang sudah tersedia:

- `crm_contacts.contact_type = person` → individu;
- contact institusi dengan `crm_institution_profiles.institution_type = community`
  → komunitas;
- contact institusi lainnya → lembaga.

Profil institusi tidak diisi otomatis. Petugas melengkapinya setelah contact
institusi dibuat, termasuk PIC dan referensi registrasi bila relevan.

## Pengajuan Bantuan

Intake pengajuan menerima contact aktif dengan role `applicant` atau
`beneficiary`. Pemeriksaan tersebut terjadi di server dalam tenant transaction,
bukan hanya pada daftar pilihan di browser.

Pada fase ini, pengaju adalah subjek pengajuan yang akan menjadi beneficiary
pada case hasil konversi. Pengajuan **atas nama penerima lain** belum didukung;
fitur itu memerlukan relasi representasi, consent, dan otorisasi tersendiri agar
tidak mengaburkan pihak pengaju dengan penerima manfaat.

## Akses dan Isolasi Tenant

- Daftar memakai `crm_contact_roles.read`.
- Penambahan dan perubahan peran memakai `crm_contact_roles.manage`.
- Detail contact tetap memakai `crm_contacts.read`.
- Semua record dibatasi `organization_id`; RLS yang sudah berlaku pada CRM
  tetap menjadi pengamanan utama.
- Migration `0025_partner_applicant_roles.sql` menambah role type dan indeks
  `(organization_id, role_type, status)` untuk daftar scoped tenant.

## Verifikasi

- unit test klasifikasi individu/komunitas/lembaga dan label role;
- SQL test tenant `db/tests/partner_applicant_isolation.sql`;
- validasi server aplikasi untuk role `applicant` atau `beneficiary` aktif.
