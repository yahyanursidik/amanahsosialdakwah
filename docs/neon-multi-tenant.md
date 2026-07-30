# Fondasi Multi-Tenant Neon

Fondasi multi-tenant dipindah ke PostgreSQL di Neon. Model keamanan utama
adalah Row Level Security (RLS) di database, bukan penyembunyian tombol di UI.

## Entitas inti

Migration membuat tabel fondasi, program, CRM, applications, dan cases:

- `organizations`
- `organization_units`
- `profiles`
- `memberships`
- `roles`
- `permissions`
- `role_permissions`
- `membership_roles`
- `organization_relationships`
- `program_categories`
- `programs`
- `program_revisions`
- `crm_contacts`
- `crm_contact_roles`
- `crm_sensitive_identities`
- `crm_beneficiary_profiles`
- `crm_institution_profiles`
- `crm_tags`
- `crm_contact_tags`
- `crm_interactions`
- `crm_consents`
- `crm_duplicate_candidates`
- `crm_merge_requests`
- `aid_applications`
- `application_screenings`
- `beneficiary_cases`
- `application_case_events`
- `audit_events`

Semua primary key memakai UUID. Tabel domain memakai `created_at`,
`updated_at`, dan `created_by` bila relevan.

## Konteks request

Policy membaca konteks request dari PostgreSQL settings:

- `app.current_profile_id`
- `app.current_organization_id`

Server/API harus men-set konteks ini pada awal request setelah token Neon Auth
divalidasi dan membership aktif dicek. Jangan mempercayai organization aktif
hanya dari localStorage.

## Helper private

Schema `private` berisi helper:

- `private.current_profile_id()`
- `private.current_organization_id()`
- `private.has_active_membership(organization_id)`
- `private.has_permission(organization_id, permission_key)`
- `private.can_manage_membership(organization_id)`

Helper permission dipakai oleh policy RLS agar komponen UI cukup memeriksa
permission, bukan role hardcoded seperti `admin` atau `staff`.

## Role database runtime

Migration membuat role `app_runtime`. SQL isolation test menjalankan query
dengan:

```sql
set local role app_runtime;
```

Ini penting karena koneksi owner database dapat melewati RLS. Server-side API
menurunkan privilege sebelum query domain.

## Policy utama

- `organizations`: hanya membership aktif yang dapat membaca tenant. Update dan
  delete memerlukan permission organisasi.
- `profiles`: user dapat membaca/memperbarui dirinya sendiri dan membaca profil
  yang berada dalam organisasi yang sama.
- `organization_units`: dibatasi oleh membership aktif dan permission unit.
- `memberships`: dibaca oleh anggota organisasi; mutasi butuh
  `memberships.manage` atau `memberships.delete`.
- `roles` dan `role_permissions`: system role global dapat dibaca user
  terautentikasi; mutasi role tenant butuh `roles.manage`.
- `permissions`: bersifat katalog sistem, read-only dari aplikasi.
- `membership_roles`: mutasi butuh `memberships.manage`.
- `organization_relationships`: dapat dibaca oleh anggota organisasi sumber atau
  target; mutasi butuh permission pada organisasi sumber.
- `aid_applications`: read/manage/submit/screen/convert memakai permission
  terpisah; hard delete selalu ditolak.
- `application_screenings`: hasil screening append-only dan hanya dapat dibuat
  dengan `applications.screen`.
- `beneficiary_cases`: dibaca dengan `cases.read`, dibuat hanya oleh command
  konversi, dan ditugaskan dengan `cases.assign`.
- `application_case_events` dan `audit_events`: append-only; update dan delete
  selalu ditolak.

## Runtime aplikasi

React/Refine memakai custom data provider. Modul lama masih memanggil
`/api/data`, sedangkan Applications & Cases memakai REST API Hono pada
`/api/v1`.
`authProvider` memakai Neon Auth proxy pada `/api/auth/*`.
`OrganizationProvider` memanggil `/api/me`, dan `accessControlProvider`
memeriksa permission melalui `/api/access/can`.
