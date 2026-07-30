# Definition of Done

## Database
- [ ] Schema dan migration tersedia.
- [ ] Constraint dan index tepat.
- [ ] Tenant ownership eksplisit.
- [ ] Delete behavior eksplisit.
- [ ] Migration diuji pada Neon branch.
- [ ] Rollback notes tersedia.

## Backend
- [ ] Authentication, membership, permission, tenant scope diperiksa.
- [ ] Zod validation tersedia.
- [ ] Business rule server-side.
- [ ] Transaction digunakan bila perlu.
- [ ] Audit tersedia.
- [ ] DTO tidak membocorkan field privat.

## Frontend
- [ ] Refine data provider digunakan.
- [ ] Permission-aware UI.
- [ ] Loading, empty, error, denied state.
- [ ] Mobile dan accessibility dasar diperiksa.
- [ ] Tidak ada secret database di bundle.

## File
- [ ] Private by default.
- [ ] Signed URL.
- [ ] MIME/size/ownership validation.
- [ ] Evidence version dipertahankan.
- [ ] Consent publikasi diperiksa.

## Test
- [ ] Unit, integration, tenant, permission, transition lulus.
- [ ] Concurrency test bila relevan.
- [ ] Regression test bug.
- [ ] Build, typecheck, lint lulus.

## Docs
- [ ] Docs, development log, known issues, env docs diperbarui.
