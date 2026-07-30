# Brand dan App Shell

## Tujuan

Penyegaran ini menerapkan identitas visual Amanah Platform pada area autentikasi dan
ruang kerja tanpa mengubah aturan bisnis, model tenant, atau pengamanan backend.

## Identitas visual

- Warna utama mengikuti `BRANDING-GUIDELINE.md`: Amanah Teal, Deep Forest, Mint,
  Sand, dan warna semantik yang aksesibel.
- Plus Jakarta Sans digunakan untuk heading dan Inter untuk teks antarmuka.
- Logo tersedia dalam varian horizontal dan simbol, masing-masing untuk latar
  terang dan gelap.
- Favicon menggunakan simbol Amanah dalam format SVG agar tetap tajam pada
  berbagai ukuran.
- Aset berada di `public/brand` dan komponen logo reusable berada di
  `src/components/brand`.

## Login

- Panel narasi memakai ilustrasi alur amanah berbasis SVG yang dibuat khusus.
- Animasi hanya dipakai untuk orientasi dan umpan balik, serta dinonaktifkan saat
  pengguna memilih `prefers-reduced-motion`.
- Tombol lihat/sembunyikan kata sandi memiliki label aksesibel.
- Footer menyertakan atribusi pengembang sesuai permintaan.

## Ruang kerja

Sidebar dikelompokkan berdasarkan jenis pekerjaan:

1. Ringkasan.
2. Program dan layanan.
3. Operasional.
4. Relasi.
5. Tata kelola.

Setiap menu dan tindakan tetap diperiksa berdasarkan permission melalui
`CanAccess`; tidak ada role owner atau admin yang di-hardcode di komponen.
Keamanan utama tetap berada pada session server, membership aktif, permission
resolver server, dan RLS database.

Pada layar kecil, sidebar berubah menjadi drawer dengan scrim, kontrol buka/tutup,
serta organization switcher ringkas di header.

## Perbaikan flicker dan authorization

- `OrganizationProvider` tidak lagi mengulang pemuatan context pada setiap
  perpindahan route.
- Keputusan akses UI memakai endpoint `/api/access/can`, yang memvalidasi session,
  organisasi aktif, membership, resource, dan action di server.
- Keputusan akses memiliki cache React Query singkat untuk mencegah menu berkedip
  saat render ulang. Pergantian organisasi tetap menghasilkan query key baru.
- Parser API lokal menangani request body berbentuk `Buffer`, sehingga pemeriksaan
  permission di lingkungan Vite lokal sama dengan runtime deployment.

## Footer

Footer aplikasi dan login menampilkan:

> Disusun dan dikembangkan oleh Yahya Nursidik

Nama pengembang ditautkan ke `https://yahyanursidik.my.id/`.
