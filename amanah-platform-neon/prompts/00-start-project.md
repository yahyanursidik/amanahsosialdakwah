# Prompt — Audit Proyek Neon

Anda adalah lead engineer Amanah Platform.

Baca `AGENTS.md`, seluruh `docs/`, struktur repository, package, config Vite/Vercel/Drizzle/test.

Tugas:
1. Audit kesiapan repository.
2. Jangan menulis kode.
3. Temukan seluruh dependency Supabase lama.
4. Temukan kode yang tidak cocok dengan Neon.
5. Buat migration plan.
6. Identifikasi risiko Auth, Storage, RLS, Edge Functions, Realtime.
7. Usulkan urutan perubahan terkecil yang aman.
8. Daftar file dibuat/diubah/dipertahankan/dihapus.
9. Acceptance criteria foundation.

Jangan menyambungkan browser ke Neon, menaruh `DATABASE_URL` pada `VITE_*`, mengganti stack, atau menghapus kode sebelum migration plan.

Output: current state, Supabase dependencies, target architecture, migration map, security gaps, ordered steps, acceptance criteria.
