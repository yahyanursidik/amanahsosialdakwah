# Workflow Neon/Postgres

Backend project ini sudah diarahkan ke Neon Serverless Postgres dan Neon Auth.
Frontend React/Vite tetap tidak boleh menerima `DATABASE_URL` karena connection
string Postgres adalah secret server-side.

## Mode database aktif

Workspace saat ini menggunakan branch Neon `production` sebagai sumber data
aktif untuk aplikasi lokal dan deployment production. File `.neon` dan `.env`
lokal harus menunjukkan `NEON_BRANCH=production`.

Perubahan schema tetap tidak diuji pertama kali pada production. Buat clone
sementara dari production, jalankan migration dan seluruh SQL isolation test di
clone tersebut, lalu terapkan migration immutable yang sama ke production.
Seed development dan reset database tidak boleh dijalankan pada production.

## Setup awal

Jalankan dari root project:

```powershell
npx.cmd neon@latest init --agent
npx.cmd -y neon env pull
npm.cmd install
```

File `.neon` berisi `orgId`, `projectId`, dan branch aktif. File ini tidak
berisi secret. File `.env` berisi `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`NEON_AUTH_BASE_URL`, dan `NEON_AUTH_JWKS_URL`; file tersebut diabaikan Git.

## Rehearsal sebelum migration production

Jangan menguji migration baru pertama kali di branch `production`.

```powershell
npx.cmd -y neon branches create --name dev-nama-fitur --project-id damp-dew-93728221
npx.cmd -y neon checkout dev-nama-fitur
```

`checkout` akan memperbarui `.neon` dan menarik `.env` untuk branch aktif.

## Migration dan seed

```powershell
npm.cmd run neon:migrate
npm.cmd run neon:seed
npm.cmd run neon:test:isolation
npm.cmd run neon:types
```

- Migration legacy berada di `db/migrations`.
- Baseline dan migration baru Drizzle berada di `drizzle`.
- `drizzle/0000_*` adalah baseline hasil introspeksi dan sengaja tidak
  diterapkan ulang. Migration runner mulai menerapkan migration Drizzle dari
  `0001_*`.
- Seed development berada di `db/seeds`.
- SQL test berada di `db/tests`.
- Types hasil introspeksi berada di `src/generated/neon/database.ts`.

## Provisioning akun role

Setelah migration dan seed selesai, buat satu akun Neon Auth untuk setiap role
sistem:

```powershell
npm.cmd run neon:provision:roles
```

Pada development script berjalan tanpa flag tambahan. Pada production, operator
wajib memberikan guard eksplisit berikut setelah memastikan organisasi tujuan:

```powershell
$env:NEON_ALLOW_PRODUCTION_ROLE_PROVISION="1"
npm.cmd run neon:provision:roles
Remove-Item Env:NEON_ALLOW_PRODUCTION_ROLE_PROVISION
```

Signup dilakukan melalui Neon Auth, kemudian profile, membership aktif, dan
role diikat ke organisasi dalam satu transaksi Postgres. Password acak hanya
ditampilkan sekali di terminal dan tidak ditulis ke `.env`, seed, atau source
control. Jika akun sudah ada, password tidak diubah.

Migration menggunakan `DATABASE_URL_UNPOOLED` bila tersedia, sesuai praktik
Neon untuk operasi schema. Aplikasi server/API runtime boleh memakai pooled
connection.

Perintah Drizzle:

```powershell
npm.cmd run db:generate
npm.cmd run db:check
npm.cmd run db:migrate
```

## Menjalankan aplikasi lokal

Vite development server memuat bridge API lokal untuk handler Vercel legacy
dan Hono `/api/v1`, sehingga frontend, login, membership, permission, dan
command bisnis tersedia pada satu origin:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Buka `http://127.0.0.1:5173`. Bridge hanya aktif pada mode `serve`; production
build tetap menggunakan serverless function Vercel. Variabel `DATABASE_URL` dan
Neon Auth tetap dibaca server-side dari `.env` dan tidak diekspos sebagai
variabel `VITE_*`.

## Reset database

Reset bersifat destruktif dan diblokir secara default.

```powershell
$env:NEON_ALLOW_RESET="1"
npm.cmd run neon:reset
npm.cmd run neon:migrate
npm.cmd run neon:seed
```

Branch `production` tetap diblokir kecuali `NEON_ALLOW_PRODUCTION_RESET=1`
diset secara eksplisit. Hindari ini kecuali dalam prosedur recovery yang sudah
disetujui.

## Catatan keamanan

- Jangan menambahkan prefix `VITE_` pada connection string database.
- RLS Postgres adalah pengaman utama; route guard UI hanya untuk UX.
- Query aplikasi harus dijalankan sebagai role runtime non-owner atau role yang
  dipaksa tunduk pada RLS.
- Role `app_runtime` hanya memperoleh `USAGE` schema `private` dan `EXECUTE`
  pada helper context/authorization yang dibutuhkan API; schema tetap tidak
  exposed ke browser.
- Script test memakai `SET ROLE app_runtime` untuk membuktikan isolasi tenant,
  bukan koneksi owner yang dapat melihat semua row.
