# Authentication dan Active Organization Context

Implementasi runtime memakai Refine `authProvider`, Neon Auth, endpoint
server-side `/api/*`, dan PostgreSQL RLS pada Neon.

## Alur sesi

1. Refine memanggil `authProvider.check`.
2. Client memanggil `/api/me`.
3. API memvalidasi cookie session ke Neon Auth melalui `NEON_AUTH_BASE_URL`.
4. API membuat atau memperbarui `profiles` berdasarkan Neon Auth user.
5. API mengambil membership aktif dan organisasi aktif lewat Postgres.
6. Jika user pertama login pada database kosong, API melakukan bootstrap:
   organisasi awal `AmanahOS`, membership owner, role owner, dan kategori
   program awal.
7. Protected route baru dirender setelah konteks organisasi tervalidasi.

Tidak ada access token atau connection string database yang disimpan di browser.

## Active organization

`localStorage` hanya menyimpan ID preferensi terakhir. Nilai tersebut:

- tidak pernah langsung dipercaya sebagai authorization context;
- selalu dikirim ulang ke API dan divalidasi terhadap membership aktif;
- diabaikan jika server tidak mengembalikannya sebagai organisasi aktif;
- divalidasi ulang ketika user mengganti organisasi;
- divalidasi ulang saat window kembali aktif;
- dihapus saat logout.

Setiap query bisnis tetap berjalan pada endpoint server-side. Endpoint mengatur:

```sql
set_config('app.current_profile_id', ...);
set_config('app.current_organization_id', ...);
set local role app_runtime;
```

Dengan begitu RLS Postgres tetap menjadi pengamanan utama. Route guard dan
access-control UI hanya meningkatkan UX.

## Password

- Login memakai Neon Auth endpoint `/sign-in/email`.
- Logout memakai `/sign-out`.
- Forgot password memakai `/forget-password` dengan callback tetap
  `/update-password`.
- Respons forgot password tidak mengungkap apakah email terdaftar.
- Recovery memakai `/reset-password` dengan token Neon Auth.
- User login dapat mengganti password melalui `/change-password`.

Domain aplikasi harus terdaftar pada trusted domain Neon Auth agar callback
password dan OAuth tidak ditolak.

## Konfigurasi

Frontend tidak membaca secret database. Env server-side yang diperlukan:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` untuk migration
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_JWKS_URL`

Tarik env dengan:

```powershell
npx.cmd -y neon env pull
```
