# Authentication

## Pilihan Default

Gunakan Better Auth dengan Neon Postgres pada backend Hono/Vercel.

Alternatif: Neon Auth setelah integrasi branch, provider, user sync, OAuth, session model, dan kesiapan produksi divalidasi.

Jangan memasang Better Auth dan Neon Auth bersamaan.

## Login Awal

- email/password atau magic link sesuai pilihan auth;
- Google OAuth;
- recovery;
- email verification;
- MFA opsional/wajib untuk privileged roles.

## Identity vs Membership

```text
auth_user → profile → membership → membership_role → role_permission
```

Auth menjawab identitas. Membership menjawab organisasi dan kewenangan.

## Session

- secure HTTP-only cookie;
- `Secure` production;
- `SameSite` sesuai desain;
- rotate session setelah privilege change;
- jangan simpan privileged token di localStorage;
- API memvalidasi session setiap request.

## Invite

```text
Admin membuat invite → recipient login → token diverifikasi → membership dibuat → invite ditandai used → audit
```

Token single-use, expiry, scoped organization/role, dan tidak boleh memberi privilege di atas inviter.
