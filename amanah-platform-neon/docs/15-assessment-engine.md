# Assessment Engine

## Scope

Vertical slice fase 9 mencakup authoring template, versi immutable setelah
published, bagian dan pertanyaan, jawaban kasus, scoring otomatis, submit,
review independen, outcome kelayakan, timeline, dan audit.

Binary evidence belum diunggah pada fase ini. Schema metadata evidence sudah
tersedia, tetapi endpoint upload/download sengaja tidak dibuka sebelum Evidence
Service menyediakan private object storage, signed URL, MIME/size validation,
checksum, dan ownership validation.

## Alur

```text
Template draft
→ Version draft
→ Published
→ Case assessment draft
→ Answers saved
→ Submitted
→ Independent review
→ Approved / Revision requested
→ Case eligible / Not eligible
```

Versi published tidak diedit. Perubahan instrumen dibuat sebagai versi baru.
Asesmen menyimpan `template_version_id`, sehingga pertanyaan dan aturan scoring
yang digunakan tetap dapat diaudit.

## Tables

- `assessment_templates`
- `assessment_template_versions`
- `assessment_sections`
- `assessment_questions`
- `case_assessments`
- `assessment_answers`
- `assessment_evidence`
- `assessment_reviews`
- `assessment_events`

Semua tabel menggunakan UUID, `organization_id`, `timestamptz`, index tenant,
RLS eksplisit untuk SELECT/INSERT/UPDATE/DELETE, dan runtime role
`app_runtime`. Reviews, events, evidence, dan asesmen approved tidak mendukung
hard delete.

Relasi utama memakai composite foreign key `(id, organization_id)`. Parent dari
organisasi lain tidak dapat direferensikan walaupun UUID diketahui.

## Scoring

Scoring dilakukan server-side dari versi template:

- `exact`: pemetaan nilai jawaban ke skor;
- `range`: rentang angka ke skor;
- skor jawaban dibatasi `max_score`;
- total dan persentase dihitung ulang ketika submit;
- pertanyaan wajib harus lengkap;
- `eligible` bila total mencapai `passing_score`;
- `not_eligible` bila di bawah ambang.

Template published wajib mempunyai skor maksimum lebih dari nol. Browser tidak
menentukan outcome resmi.

## Commands and API

```text
GET  /api/v1/assessment-templates
POST /api/v1/assessment-templates
GET  /api/v1/assessment-templates/:id
POST /api/v1/assessment-templates/:id/versions
POST /api/v1/assessment-templates/:id/versions/:versionId/publish

GET  /api/v1/assessments
POST /api/v1/assessments
GET  /api/v1/assessments/:id
POST /api/v1/assessments/:id/answers
POST /api/v1/assessments/:id/submit
POST /api/v1/assessments/:id/review
```

Semua command memakai transaction, row lock untuk record workflow, request
context server-side, permission check, transaction-local RLS, timeline, dan
audit.

## Business Rules

- hanya versi `published` dari template aktif yang dapat dipakai;
- satu case dan template version hanya menghasilkan satu asesmen;
- hanya asesor pembuat yang dapat mengubah jawaban dan submit;
- jawaban divalidasi terhadap tipe dan opsi pertanyaan;
- outcome dihitung ulang di server saat submit;
- reviewer wajib mempunyai membership aktif;
- reviewer tidak boleh sama dengan asesor;
- hanya asesmen `submitted` yang dapat direview;
- approval mengubah status case menjadi `eligible` atau `not_eligible`;
- revision request membuka koreksi melalui workflow, bukan silent edit;
- record transaksi dan timeline tidak dapat di-hard-delete.

## Permissions

- `assessment_templates.read`
- `assessment_templates.manage`
- `assessment_templates.publish`
- `assessments.read`
- `assessments.manage`
- `assessments.submit`
- `assessments.review`

UI memakai permission untuk UX. API memeriksa ulang dan RLS menjadi defense in
depth.

## Migrations

- `drizzle/0003_famous_xorn.sql`: schema, RLS, permission, trigger, grant.
- `drizzle/0004_eminent_valkyrie.sql`: case policy untuk workflow asesmen.
- `drizzle/0005_aspiring_thanos.sql`: composite tenant foreign keys.
- target database saat ini: branch Neon `production`.

Untuk environment shared, rollback dilakukan dengan menonaktifkan route dan
permission lalu migration korektif. Jangan drop tabel asesmen yang sudah
berisi keputusan resmi.

## Tests

- unit test validasi jawaban, scoring, transisi, dan self-review;
- API protection/error envelope;
- UI permission untuk action review;
- tenant A tidak dapat membaca asesmen tenant B;
- membership tanpa `assessments.read` tidak melihat asesmen;
- hard delete ditolak;
- composite foreign key mencegah relasi lintas tenant;
- typecheck, lint, test, build, Drizzle check, dan audit dependency.

## Dependencies

Assessment Engine bergantung pada Cases, CRM Contacts, Profiles, Memberships,
Permissions, dan Audit. Custom role yang menggunakan daftar/detail asesmen
perlu akses baca pada resource relasi tersebut.
