# Production Hardening

Fase 22 menambahkan kontrol operasional tanpa mengubah schema database dan
tanpa mengaktifkan object storage yang masih ditunda.

## Runtime checks

- `GET /api/v1/health` membuktikan function dapat dijalankan tanpa menyentuh
  data tenant.
- `GET /api/v1/ready` menjalankan `select 1` read-only dan mengembalikan 503
  bila Neon belum siap.
- Setiap API response memiliki UUID `x-request-id`, `cache-control: no-store`,
  dan log JSON berisi method, path, status, serta durasi. Log tidak menyimpan
  body, email, cookie, token, query string, atau data tenant.
- Request ID dari upstream hanya diterima jika berbentuk UUID.

## Deployment gate

Jalankan sebelum deployment:

```powershell
npm.cmd run quality
npm.cmd run build
npm.cmd run db:check
npm.cmd run neon:verify:migrations
```

Setelah deployment dan environment Vercel aktif:

```powershell
$env:PRODUCTION_APP_URL="https://amanahsosial-dakwahterintegrasi.vercel.app"
npm.cmd run smoke:production
Remove-Item Env:PRODUCTION_APP_URL
```

Smoke test memeriksa function, koneksi database, SPA login shell, dan header
keamanan tanpa menggunakan kredensial pengguna.

## Backup dan migration production

Karena hanya branch `production` yang dipakai, sebelum migration berisiko:

1. pastikan restore window/PITR aktif di Neon Console sesuai paket;
2. catat waktu deployment dan versi commit;
3. jalankan `npm run neon:verify:migrations` sebelum dan sesudah migration;
4. jalankan tenant isolation dan smoke report;
5. jika perlu recovery, buat branch dari titik waktu sebelum migration untuk
   inspeksi dahulu; jangan menjalankan reset production.

Perubahan schema tetap hanya melalui migration yang tersimpan di repository.

## Rate limiting

Rate limiting global harus dikonfigurasi di Vercel Firewall untuk `/api/*`,
terutama `/api/auth/*`. Limiter in-memory tidak dipakai karena instance
serverless tidak berbagi state. Postgres juga tidak dijadikan counter setiap
request agar serangan tidak diteruskan menjadi beban Neon. Nilai awal yang
disarankan untuk diuji: batas lebih ketat pada login/recovery, dan batas
berbasis IP pada API umum dengan pengecualian traffic internal yang sah.

## Frontend loading

Halaman dimuat dengan `React.lazy` per route. Shell autentikasi dan workspace
tidak lagi menarik seluruh modul bisnis pada initial load. Fallback route
menggunakan `AppBoot` agar transisi chunk tetap konsisten dan aksesibel.
