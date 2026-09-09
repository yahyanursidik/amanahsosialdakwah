# Public Program Landing Pages

Setiap Program aktif otomatis mempunyai landing page di `/p/{program_id}`.
Tidak ada draft, slug, maupun tombol publish yang perlu diatur operator. Halaman
tetap tidak tersedia untuk Program draft, paused, completed, atau diarsipkan.
Tidak ada login, organisasi aktif, atau identifier tenant dari browser yang
dipercaya pada endpoint publik.

## Data yang boleh muncul

- nama, kode, ringkasan, tujuan, periode, dan bentuk dukungan Program;
- anggaran/rencana dana, valuasi barang, dan logistik;
- jumlah area, kapasitas serta kuota yang terpakai dalam bentuk agregat;
- jumlah kasus eligible serta jumlah/nominal distribusi selesai dalam bentuk
  agregat.

Identitas penerima, alamat, pengajuan, asesmen, approval, audit trail, saldo
ledger, metadata file privat, serta bukti privat tidak pernah menjadi bagian
query publik.

## Keamanan

Endpoint publik memilih kolom aman secara eksplisit dari Program dan membuat
agregat server-side. Identitas penerima, alamat, nomor pengajuan, asesmen,
approval, PIC mitra, audit trail, saldo ledger, metadata file privat, serta
bukti privat tidak pernah menjadi bagian query publik. Tabel
`program_publications` lama tidak lagi digunakan untuk menentukan halaman
publik; riwayatnya dipertahankan sebagai data internal yang sudah ada.
