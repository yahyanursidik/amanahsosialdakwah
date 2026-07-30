# Approval Engine

## Scope fase 10

Approval Engine menyediakan workflow generik untuk subjek `assessment` dan
`case`. Integrasi ke transaksi dana, pengadaan, inventaris, dan distribusi
ditambahkan oleh vertical slice masing-masing tanpa mengubah histori approval.

## Model

- `approval_workflows`: identitas workflow per tenant.
- `approval_workflow_versions`: versi draft, published, atau retired.
- `approval_workflow_steps`: urutan, permission approver, dan kuorum.
- `approval_requests`: snapshot subjek dan posisi proses saat ini.
- `approval_request_steps`: snapshot langkah untuk satu request.
- `approval_actions`: event append-only untuk seluruh keputusan.

Versi published dan langkahnya immutable. Request final (`approved`,
`rejected`, `cancelled`) juga immutable. Revisi menaikkan `cycle_number`,
mereset progress langkah, dan mempertahankan action dari siklus sebelumnya.

## Command API

```text
GET  /api/v1/approval-workflows
POST /api/v1/approval-workflows
GET  /api/v1/approval-workflows/:id
POST /api/v1/approval-workflows/:id/versions
POST /api/v1/approval-workflows/:id/versions/:versionId/publish

GET  /api/v1/approval-requests
POST /api/v1/approval-requests
GET  /api/v1/approval-requests/:id
POST /api/v1/approval-requests/:id/submit
POST /api/v1/approval-requests/:id/decision
POST /api/v1/approval-requests/:id/cancel
```

Tidak ada generic status update atau hard delete.

## Authorization

- semua request memerlukan session, membership aktif, dan organisasi aktif;
- workflow memeriksa `approval_workflows.*`;
- request memeriksa `approval_requests.*`;
- langkah tidak menyebut role, hanya `required_permission`;
- keputusan memeriksa `approval_requests.act` dan permission langkah aktif;
- pembuat request tidak dapat memberi keputusan pada request sendiri;
- RLS membatasi SELECT/INSERT/UPDATE/DELETE secara eksplisit;
- composite foreign key mencegah relasi workflow/request lintas tenant.

UI permission hanya membantu UX. Service Hono dan RLS tetap menjadi batas
keamanan.

## Transaction dan concurrency

Submit, decision, dan cancel mengunci row request dengan `FOR UPDATE`. Satu
approver hanya dapat memberi satu vote `approved` per langkah dan siklus.
Kuorum dan perpindahan langkah dihitung di server dalam transaksi yang sama
dengan action dan audit event.

## Migration dan rollback

- `drizzle/0006_wealthy_madame_web.sql`: tabel, constraint, RLS, trigger,
  permission, immutable guard, dan role mapping.
- `drizzle/0007_dusty_sauron.sql`: hardening policy berbasis actor, status,
  dan permission langkah.

Rollback tidak dilakukan dengan menghapus tabel pada environment berisi
transaksi. Jika terjadi masalah, nonaktifkan route/UI, buat forward migration,
dan pertahankan request/action untuk kebutuhan audit.

## Batasan saat ini

- subjek baru dibatasi pada asesmen dan kasus;
- integrasi status domain downstream dimiliki modul yang membuat transaksi;
- akun role yang diprovision adalah akun development, bukan akun produksi;
- rate limiting dan observability command diselesaikan pada fase hardening.
