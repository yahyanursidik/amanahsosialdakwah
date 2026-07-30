insert into public.permissions (key, resource, action, description)
values
  ('organizations.read', 'organizations', 'read', 'Melihat organisasi dalam cakupan membership aktif'),
  ('organizations.manage', 'organizations', 'manage', 'Mengelola data organisasi'),
  ('organizations.delete', 'organizations', 'delete', 'Menghapus organisasi melalui workflow terkontrol'),
  ('organization_units.read', 'organization_units', 'read', 'Melihat unit organisasi'),
  ('organization_units.manage', 'organization_units', 'manage', 'Mengelola unit organisasi'),
  ('organization_units.delete', 'organization_units', 'delete', 'Menghapus unit organisasi'),
  ('memberships.read', 'memberships', 'read', 'Melihat membership organisasi'),
  ('memberships.manage', 'memberships', 'manage', 'Mengelola membership dan role user'),
  ('memberships.delete', 'memberships', 'delete', 'Menghapus membership'),
  ('roles.read', 'roles', 'read', 'Melihat role'),
  ('roles.manage', 'roles', 'manage', 'Mengelola role dan permission'),
  ('roles.delete', 'roles', 'delete', 'Menghapus role non-sistem'),
  ('organization_relationships.read', 'organization_relationships', 'read', 'Melihat relasi antar-organisasi'),
  ('organization_relationships.manage', 'organization_relationships', 'manage', 'Mengelola relasi antar-organisasi'),
  ('organization_relationships.delete', 'organization_relationships', 'delete', 'Menghapus relasi antar-organisasi'),
  ('program_categories.read', 'program_categories', 'read', 'Melihat kategori program'),
  ('program_categories.manage', 'program_categories', 'manage', 'Mengelola kategori program'),
  ('program_categories.delete', 'program_categories', 'delete', 'Menghapus kategori program'),
  ('programs.read', 'programs', 'read', 'Melihat program'),
  ('programs.manage', 'programs', 'manage', 'Mengelola program'),
  ('programs.delete', 'programs', 'delete', 'Menghapus program'),
  ('program_revisions.read', 'program_revisions', 'read', 'Melihat riwayat perubahan program'),
  ('program_revisions.manage', 'program_revisions', 'manage', 'Mencatat riwayat perubahan program'),
  ('crm_contacts.read', 'crm_contacts', 'read', 'Melihat contact master'),
  ('crm_contacts.manage', 'crm_contacts', 'manage', 'Mengelola contact master'),
  ('crm_contacts.delete', 'crm_contacts', 'delete', 'Menghapus contact master melalui workflow'),
  ('crm_contact_roles.read', 'crm_contact_roles', 'read', 'Melihat peran kontak'),
  ('crm_contact_roles.manage', 'crm_contact_roles', 'manage', 'Mengelola peran kontak'),
  ('crm_sensitive_identities.read', 'crm_sensitive_identities', 'read', 'Melihat metadata identitas sensitif'),
  ('crm_sensitive_identities.manage', 'crm_sensitive_identities', 'manage', 'Mengelola identitas sensitif'),
  ('crm_beneficiary_profiles.read', 'crm_beneficiary_profiles', 'read', 'Melihat profil penerima manfaat'),
  ('crm_beneficiary_profiles.manage', 'crm_beneficiary_profiles', 'manage', 'Mengelola profil penerima manfaat'),
  ('crm_institution_profiles.read', 'crm_institution_profiles', 'read', 'Melihat profil institusi'),
  ('crm_institution_profiles.manage', 'crm_institution_profiles', 'manage', 'Mengelola profil institusi'),
  ('crm_tags.read', 'crm_tags', 'read', 'Melihat tag CRM'),
  ('crm_tags.manage', 'crm_tags', 'manage', 'Mengelola tag CRM'),
  ('crm_contact_tags.read', 'crm_contact_tags', 'read', 'Melihat tag kontak'),
  ('crm_contact_tags.manage', 'crm_contact_tags', 'manage', 'Mengelola tag kontak'),
  ('crm_interactions.read', 'crm_interactions', 'read', 'Melihat interaksi CRM'),
  ('crm_interactions.manage', 'crm_interactions', 'manage', 'Mengelola interaksi CRM'),
  ('crm_consents.read', 'crm_consents', 'read', 'Melihat consent CRM'),
  ('crm_consents.manage', 'crm_consents', 'manage', 'Mengelola consent CRM'),
  ('crm_duplicate_candidates.read', 'crm_duplicate_candidates', 'read', 'Melihat kandidat duplikasi'),
  ('crm_duplicate_candidates.manage', 'crm_duplicate_candidates', 'manage', 'Mengelola kandidat duplikasi'),
  ('crm_merge_requests.read', 'crm_merge_requests', 'read', 'Melihat permintaan merge kontak'),
  ('crm_merge_requests.manage', 'crm_merge_requests', 'manage', 'Mengelola permintaan merge kontak'),
  ('applications.read', 'applications', 'read', 'Melihat pengajuan bantuan'),
  ('applications.manage', 'applications', 'manage', 'Membuat dan memperbarui draft pengajuan'),
  ('applications.submit', 'applications', 'submit', 'Mengirim pengajuan untuk screening'),
  ('applications.screen', 'applications', 'screen', 'Melakukan screening pengajuan'),
  ('applications.convert', 'applications', 'convert', 'Mengonversi pengajuan diterima menjadi kasus'),
  ('cases.read', 'cases', 'read', 'Melihat kasus penerima manfaat'),
  ('cases.manage', 'cases', 'manage', 'Mengelola kasus penerima manfaat'),
  ('cases.assign', 'cases', 'assign', 'Menugaskan penanggung jawab kasus'),
  ('assessment_templates.read', 'assessment_templates', 'read', 'Melihat template dan versi asesmen'),
  ('assessment_templates.manage', 'assessment_templates', 'manage', 'Membuat template dan versi asesmen'),
  ('assessment_templates.publish', 'assessment_templates', 'publish', 'Mempublikasikan versi template asesmen'),
  ('assessments.read', 'assessments', 'read', 'Melihat asesmen kasus'),
  ('assessments.manage', 'assessments', 'manage', 'Membuat asesmen dan mengisi jawaban'),
  ('assessments.submit', 'assessments', 'submit', 'Mengirim asesmen untuk review'),
  ('assessments.review', 'assessments', 'review', 'Melakukan review independen asesmen'),
  ('approval_workflows.read', 'approval_workflows', 'read', 'Melihat workflow approval'),
  ('approval_workflows.manage', 'approval_workflows', 'manage', 'Membuat workflow dan versi approval'),
  ('approval_workflows.publish', 'approval_workflows', 'publish', 'Mempublikasikan versi workflow approval'),
  ('approval_requests.read', 'approval_requests', 'read', 'Melihat permintaan dan timeline approval'),
  ('approval_requests.create', 'approval_requests', 'create', 'Membuat draft permintaan approval'),
  ('approval_requests.submit', 'approval_requests', 'submit', 'Mengirim dan mengirim ulang permintaan approval'),
  ('approval_requests.act', 'approval_requests', 'act', 'Memberi keputusan pada langkah approval'),
  ('approval_requests.cancel', 'approval_requests', 'cancel', 'Membatalkan permintaan approval yang belum final'),
  ('fund_restrictions.read', 'fund_restrictions', 'read', 'Melihat klasifikasi pembatasan dana'),
  ('fund_restrictions.manage', 'fund_restrictions', 'manage', 'Mengelola klasifikasi pembatasan dana'),
  ('fund_commitments.read', 'fund_commitments', 'read', 'Melihat komitmen dana'),
  ('fund_commitments.manage', 'fund_commitments', 'manage', 'Mencatat komitmen dana'),
  ('fund_receipts.read', 'fund_receipts', 'read', 'Melihat penerimaan dana'),
  ('fund_receipts.post', 'fund_receipts', 'post', 'Membukukan penerimaan dana'),
  ('fund_receipts.reverse', 'fund_receipts', 'reverse', 'Membalik penerimaan dana secara tercatat'),
  ('fund_allocations.read', 'fund_allocations', 'read', 'Melihat alokasi dana'),
  ('fund_allocations.manage', 'fund_allocations', 'manage', 'Membuat draft alokasi dana'),
  ('fund_allocations.activate', 'fund_allocations', 'activate', 'Mengaktifkan alokasi yang telah disetujui'),
  ('fund_allocations.reverse', 'fund_allocations', 'reverse', 'Membalik alokasi dana secara tercatat'),
  ('fund_disbursements.read', 'fund_disbursements', 'read', 'Melihat penyaluran dana'),
  ('fund_disbursements.post', 'fund_disbursements', 'post', 'Membukukan penyaluran dana'),
  ('fund_disbursements.reverse', 'fund_disbursements', 'reverse', 'Membalik penyaluran dana secara tercatat'),
  ('fund_reconciliations.read', 'fund_reconciliations', 'read', 'Melihat rekonsiliasi dana'),
  ('fund_reconciliations.manage', 'fund_reconciliations', 'manage', 'Mencatat rekonsiliasi dana'),
  ('fund_ledger.read', 'fund_ledger', 'read', 'Melihat jurnal dana yang append-only'),
  ('distributions.read', 'distributions', 'read', 'Melihat rencana dan pelaksanaan distribusi'),
  ('distributions.manage', 'distributions', 'manage', 'Membuat rencana distribusi'),
  ('distributions.ready', 'distributions', 'ready', 'Menandai rencana distribusi siap ditugaskan'),
  ('distributions.assign', 'distributions', 'assign', 'Menugaskan petugas distribusi'),
  ('distributions.execute', 'distributions', 'execute', 'Melaksanakan distribusi yang ditugaskan'),
  ('distributions.confirm', 'distributions', 'confirm', 'Mencatat konfirmasi penerima manfaat'),
  ('distributions.verify', 'distributions', 'verify', 'Memverifikasi distribusi secara independen'),
  ('distributions.complete', 'distributions', 'complete', 'Menutup distribusi yang telah terverifikasi'),
  ('distributions.cancel', 'distributions', 'cancel', 'Membatalkan rencana distribusi secara tercatat'),
  ('distribution_evidence.read', 'distribution_evidence', 'read', 'Melihat metadata bukti distribusi privat'),
  ('distribution_evidence.manage', 'distribution_evidence', 'manage', 'Mencatat metadata bukti distribusi privat'),
  ('audit.read', 'audit', 'read', 'Melihat audit trail')
on conflict (key) do update
set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();

insert into public.roles (organization_id, key, name, description, is_system)
values
  (null, 'organization_owner', 'Pemilik Organisasi', 'Role sistem untuk pemilik organisasi/tenant.', true),
  (null, 'organization_admin', 'Admin Organisasi', 'Role sistem untuk administrasi organisasi.', true),
  (null, 'field_officer', 'Petugas Lapangan', 'Role awal untuk petugas operasional lapangan.', true),
  (null, 'auditor', 'Auditor', 'Role awal untuk pemeriksa dan pelaporan.', true)
on conflict (organization_id, key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'organizations.read',
  'organizations.manage',
  'organization_units.read',
  'organization_units.manage',
  'memberships.read',
  'memberships.manage',
  'roles.read',
  'roles.manage',
  'organization_relationships.read',
  'organization_relationships.manage',
  'program_categories.read',
  'program_categories.manage',
  'programs.read',
  'programs.manage',
  'program_revisions.read',
  'program_revisions.manage',
  'crm_contacts.read',
  'crm_contacts.manage',
  'crm_contact_roles.read',
  'crm_contact_roles.manage',
  'crm_sensitive_identities.read',
  'crm_sensitive_identities.manage',
  'crm_beneficiary_profiles.read',
  'crm_beneficiary_profiles.manage',
  'crm_institution_profiles.read',
  'crm_institution_profiles.manage',
  'crm_tags.read',
  'crm_tags.manage',
  'crm_contact_tags.read',
  'crm_contact_tags.manage',
  'crm_interactions.read',
  'crm_interactions.manage',
  'crm_consents.read',
  'crm_consents.manage',
  'crm_duplicate_candidates.read',
  'crm_duplicate_candidates.manage',
  'crm_merge_requests.read',
  'crm_merge_requests.manage',
  'applications.read',
  'applications.manage',
  'applications.submit',
  'applications.screen',
  'applications.convert',
  'cases.read',
  'cases.manage',
  'cases.assign',
  'assessment_templates.read',
  'assessment_templates.manage',
  'assessment_templates.publish',
  'assessments.read',
  'assessments.manage',
  'assessments.submit',
  'assessments.review',
  'approval_workflows.read',
  'approval_workflows.manage',
  'approval_workflows.publish',
  'approval_requests.read',
  'approval_requests.create',
  'approval_requests.submit',
  'approval_requests.act',
  'approval_requests.cancel',
  'fund_restrictions.read',
  'fund_restrictions.manage',
  'fund_commitments.read',
  'fund_commitments.manage',
  'fund_receipts.read',
  'fund_receipts.post',
  'fund_receipts.reverse',
  'fund_allocations.read',
  'fund_allocations.manage',
  'fund_allocations.activate',
  'fund_allocations.reverse',
  'fund_disbursements.read',
  'fund_disbursements.post',
  'fund_disbursements.reverse',
  'fund_reconciliations.read',
  'fund_reconciliations.manage',
  'fund_ledger.read',
  'distributions.read',
  'distributions.manage',
  'distributions.ready',
  'distributions.assign',
  'distributions.execute',
  'distributions.confirm',
  'distributions.verify',
  'distributions.complete',
  'distributions.cancel',
  'distribution_evidence.read',
  'distribution_evidence.manage',
  'audit.read'
)
where r.organization_id is null
  and r.key = 'organization_owner'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'organizations.read',
  'organization_units.read',
  'organization_units.manage',
  'memberships.read',
  'memberships.manage',
  'roles.read',
  'organization_relationships.read',
  'organization_relationships.manage',
  'program_categories.read',
  'program_categories.manage',
  'programs.read',
  'programs.manage',
  'program_revisions.read',
  'program_revisions.manage',
  'crm_contacts.read',
  'crm_contacts.manage',
  'crm_contact_roles.read',
  'crm_contact_roles.manage',
  'crm_beneficiary_profiles.read',
  'crm_beneficiary_profiles.manage',
  'crm_institution_profiles.read',
  'crm_institution_profiles.manage',
  'crm_tags.read',
  'crm_tags.manage',
  'crm_contact_tags.read',
  'crm_contact_tags.manage',
  'crm_interactions.read',
  'crm_interactions.manage',
  'crm_consents.read',
  'crm_consents.manage',
  'crm_duplicate_candidates.read',
  'crm_duplicate_candidates.manage',
  'crm_merge_requests.read',
  'crm_merge_requests.manage',
  'applications.read',
  'applications.manage',
  'applications.submit',
  'applications.screen',
  'applications.convert',
  'cases.read',
  'cases.manage',
  'cases.assign',
  'assessment_templates.read',
  'assessment_templates.manage',
  'assessment_templates.publish',
  'assessments.read',
  'assessments.manage',
  'assessments.submit',
  'assessments.review',
  'approval_workflows.read',
  'approval_workflows.manage',
  'approval_workflows.publish',
  'approval_requests.read',
  'approval_requests.create',
  'approval_requests.submit',
  'approval_requests.act',
  'approval_requests.cancel',
  'fund_restrictions.read',
  'fund_restrictions.manage',
  'fund_commitments.read',
  'fund_commitments.manage',
  'fund_receipts.read',
  'fund_receipts.post',
  'fund_receipts.reverse',
  'fund_allocations.read',
  'fund_allocations.manage',
  'fund_allocations.activate',
  'fund_allocations.reverse',
  'fund_disbursements.read',
  'fund_disbursements.post',
  'fund_disbursements.reverse',
  'fund_reconciliations.read',
  'fund_reconciliations.manage',
  'fund_ledger.read',
  'distributions.read',
  'distributions.manage',
  'distributions.ready',
  'distributions.assign',
  'distributions.execute',
  'distributions.confirm',
  'distributions.verify',
  'distributions.complete',
  'distributions.cancel',
  'distribution_evidence.read',
  'distribution_evidence.manage',
  'audit.read'
)
where r.organization_id is null
  and r.key = 'organization_admin'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'organizations.read',
  'organization_units.read',
  'memberships.read',
  'organization_relationships.read',
  'program_categories.read',
  'programs.read',
  'program_revisions.read',
  'crm_contacts.read',
  'crm_contact_roles.read',
  'crm_beneficiary_profiles.read',
  'crm_institution_profiles.read',
  'crm_tags.read',
  'crm_contact_tags.read',
  'crm_interactions.read',
  'crm_consents.read',
  'crm_duplicate_candidates.read',
  'crm_merge_requests.read',
  'applications.read',
  'cases.read',
  'assessment_templates.read',
  'assessments.read',
  'approval_workflows.read',
  'approval_requests.read',
  'fund_restrictions.read',
  'fund_commitments.read',
  'fund_receipts.read',
  'fund_allocations.read',
  'fund_disbursements.read',
  'fund_reconciliations.read',
  'fund_ledger.read',
  'distributions.read',
  'distribution_evidence.read',
  'audit.read'
)
where r.organization_id is null
  and r.key in ('field_officer', 'auditor')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'applications.manage',
  'applications.submit',
  'cases.manage',
  'cases.assign',
  'assessments.manage',
  'assessments.submit',
  'approval_requests.create',
  'approval_requests.submit',
  'approval_requests.cancel'
  ,'fund_restrictions.read'
  ,'fund_allocations.read'
  ,'fund_disbursements.read'
  ,'distributions.execute'
  ,'distributions.confirm'
  ,'distribution_evidence.manage'
)
where r.organization_id is null
  and r.key = 'field_officer'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'distributions.verify',
  'distributions.complete'
)
where r.organization_id is null
  and r.key = 'auditor'
on conflict (role_id, permission_id) do nothing;

insert into public.permissions (key, resource, action, description)
values
  ('procurement_requests.read', 'procurement_requests', 'read', 'Melihat permintaan pengadaan'),
  ('procurement_requests.manage', 'procurement_requests', 'manage', 'Membuat permintaan pengadaan draft'),
  ('procurement_requests.submit', 'procurement_requests', 'submit', 'Mengirim permintaan pengadaan untuk approval'),
  ('procurement_requests.approve', 'procurement_requests', 'approve', 'Menyetujui permintaan pengadaan'),
  ('procurement_requests.cancel', 'procurement_requests', 'cancel', 'Membatalkan permintaan pengadaan'),
  ('purchase_orders.read', 'purchase_orders', 'read', 'Melihat purchase order'),
  ('purchase_orders.manage', 'purchase_orders', 'manage', 'Membuat purchase order'),
  ('purchase_orders.issue', 'purchase_orders', 'issue', 'Menerbitkan purchase order'),
  ('purchase_orders.cancel', 'purchase_orders', 'cancel', 'Membatalkan purchase order'),
  ('goods_receipts.read', 'goods_receipts', 'read', 'Melihat penerimaan barang pengadaan'),
  ('goods_receipts.receive', 'goods_receipts', 'receive', 'Mencatat penerimaan barang pengadaan'),
  ('vendor_invoices.read', 'vendor_invoices', 'read', 'Melihat invoice vendor'),
  ('vendor_invoices.manage', 'vendor_invoices', 'manage', 'Mencatat invoice dan referensi pembayaran vendor')
on conflict (key) do update
set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.resource in (
  'procurement_requests',
  'purchase_orders',
  'goods_receipts',
  'vendor_invoices'
)
where r.organization_id is null
  and r.key in ('organization_owner', 'organization_admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'procurement_requests.read',
  'purchase_orders.read',
  'goods_receipts.read',
  'vendor_invoices.read'
)
where r.organization_id is null
  and r.key in ('field_officer', 'auditor')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select null, r.id, p.id
from public.roles r
join public.permissions p on p.key = 'goods_receipts.receive'
where r.organization_id is null
  and r.key = 'field_officer'
on conflict (role_id, permission_id) do nothing;
