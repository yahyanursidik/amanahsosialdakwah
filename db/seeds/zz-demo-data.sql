do $$
declare
  v_org uuid;
  v_partner_org uuid := '10000000-0000-4000-8000-000000000002';
  v_actor uuid;
  v_owner uuid;
  v_field uuid;
  v_auditor uuid;
  v_membership uuid;

  v_unit_program uuid := '10000000-0000-4000-8000-000000000101';
  v_unit_field uuid := '10000000-0000-4000-8000-000000000102';

  v_cat_pangan uuid;
  v_cat_pendidikan uuid;
  v_program_pangan uuid := '20000000-0000-4000-8000-000000000001';
  v_program_kafalah uuid := '20000000-0000-4000-8000-000000000002';
  v_program_wakaf uuid := '20000000-0000-4000-8000-000000000003';

  v_contact_beneficiary uuid := '30000000-0000-4000-8000-000000000001';
  v_contact_beneficiary_2 uuid := '30000000-0000-4000-8000-000000000002';
  v_contact_donor uuid := '30000000-0000-4000-8000-000000000003';
  v_contact_kafil uuid := '30000000-0000-4000-8000-000000000004';
  v_contact_vendor uuid := '30000000-0000-4000-8000-000000000005';
  v_contact_institution uuid := '30000000-0000-4000-8000-000000000006';
  v_contact_duplicate uuid := '30000000-0000-4000-8000-000000000007';
  v_tag_urgent uuid := '30000000-0000-4000-8000-000000000101';
  v_tag_orphan uuid := '30000000-0000-4000-8000-000000000102';

  v_application uuid := '40000000-0000-4000-8000-000000000001';
  v_case uuid := '40000000-0000-4000-8000-000000000002';

  v_template uuid := '50000000-0000-4000-8000-000000000001';
  v_template_version uuid := '50000000-0000-4000-8000-000000000002';
  v_section uuid := '50000000-0000-4000-8000-000000000003';
  v_question_income uuid := '50000000-0000-4000-8000-000000000004';
  v_question_house uuid := '50000000-0000-4000-8000-000000000005';
  v_assessment uuid := '50000000-0000-4000-8000-000000000006';

  v_workflow uuid := '60000000-0000-4000-8000-000000000001';
  v_workflow_version uuid := '60000000-0000-4000-8000-000000000002';
  v_workflow_step uuid := '60000000-0000-4000-8000-000000000003';
  v_approval_request uuid := '60000000-0000-4000-8000-000000000004';
  v_approval_step uuid := '60000000-0000-4000-8000-000000000005';

  v_restriction_general uuid := '70000000-0000-4000-8000-000000000001';
  v_restriction_pangan uuid := '70000000-0000-4000-8000-000000000002';
  v_commitment uuid := '70000000-0000-4000-8000-000000000003';
  v_receipt uuid := '70000000-0000-4000-8000-000000000004';
  v_allocation uuid := '70000000-0000-4000-8000-000000000005';
  v_disbursement uuid := '70000000-0000-4000-8000-000000000006';

  v_product_rice uuid := '80000000-0000-4000-8000-000000000001';
  v_product_oil uuid := '80000000-0000-4000-8000-000000000002';
  v_product_quran uuid := '80000000-0000-4000-8000-000000000003';
  v_warehouse_main uuid := '80000000-0000-4000-8000-000000000101';
  v_warehouse_field uuid := '80000000-0000-4000-8000-000000000102';
  v_batch_rice uuid := '80000000-0000-4000-8000-000000000201';
  v_batch_oil uuid := '80000000-0000-4000-8000-000000000202';
  v_adjustment uuid := '80000000-0000-4000-8000-000000000301';

  v_procurement uuid := '90000000-0000-4000-8000-000000000001';
  v_po uuid := '90000000-0000-4000-8000-000000000002';
  v_template_package uuid := '90000000-0000-4000-8000-000000000101';
  v_template_item_rice uuid := '90000000-0000-4000-8000-000000000102';
  v_template_item_oil uuid := '90000000-0000-4000-8000-000000000103';
  v_packing uuid := '90000000-0000-4000-8000-000000000201';
  v_distribution_plan uuid := '90000000-0000-4000-8000-000000000301';
  v_courier uuid := '90000000-0000-4000-8000-000000000401';
  v_shipment uuid := '90000000-0000-4000-8000-000000000402';

  v_evidence uuid := 'a0000000-0000-4000-8000-000000000001';

  v_kafalah_need uuid := 'b0000000-0000-4000-8000-000000000001';
  v_kafalah_match uuid := 'b0000000-0000-4000-8000-000000000002';
  v_kafalah_contract uuid := 'b0000000-0000-4000-8000-000000000003';
  v_kafalah_schedule_1 uuid := 'b0000000-0000-4000-8000-000000000004';
  v_kafalah_schedule_2 uuid := 'b0000000-0000-4000-8000-000000000005';
  v_kafalah_payment uuid := 'b0000000-0000-4000-8000-000000000006';
begin
  insert into public.organizations (code, name, legal_name, type, status)
  values ('IHSANUL-ADAB', 'Ihsanul Adab', 'Yayasan Ihsanul Adab', 'manager', 'active')
  on conflict (code) do update
  set name = excluded.name,
      legal_name = excluded.legal_name,
      status = 'active',
      updated_at = now();

  select id
    into v_org
  from public.organizations
  where code = 'IHSANUL-ADAB'
     or lower(name) = 'ihsanul adab'
  order by case when code = 'IHSANUL-ADAB' then 0 else 1 end
  limit 1;

  insert into public.profiles (id, auth_user_id, display_name, email, status)
  values
    ('10000000-0000-4000-8000-000000000011', 'demo-owner-auth', 'Owner Demo', 'owner.demo@ihsanuladab.or.id', 'active'),
    ('10000000-0000-4000-8000-000000000012', 'demo-admin-auth', 'Admin Demo', 'admin.demo@ihsanuladab.or.id', 'active'),
    ('10000000-0000-4000-8000-000000000013', 'demo-field-auth', 'Petugas Lapangan Demo', 'field.demo@ihsanuladab.or.id', 'active'),
    ('10000000-0000-4000-8000-000000000014', 'demo-auditor-auth', 'Auditor Demo', 'auditor.demo@ihsanuladab.or.id', 'active')
  on conflict (auth_user_id) do update
  set display_name = excluded.display_name,
      email = excluded.email,
      status = 'active',
      updated_at = now();

  select coalesce(
    (select id from public.profiles where email = 'admin@ihsanuladab.or.id' limit 1),
    '10000000-0000-4000-8000-000000000012'::uuid
  ) into v_actor;
  select id into v_owner from public.profiles where auth_user_id = 'demo-owner-auth';
  select id into v_field from public.profiles where auth_user_id = 'demo-field-auth';
  select id into v_auditor from public.profiles where auth_user_id = 'demo-auditor-auth';

  insert into public.organization_units (id, organization_id, code, name, status, created_by)
  values
    (v_unit_program, v_org, 'PROGRAM', 'Divisi Program dan Layanan', 'active', v_actor),
    (v_unit_field, v_org, 'LAPANGAN', 'Tim Operasional Lapangan', 'active', v_actor)
  on conflict (code, organization_id) do update
  set name = excluded.name,
      status = excluded.status,
      updated_at = now();

  insert into public.organizations (id, code, name, legal_name, type, status, created_by)
  values (v_partner_org, 'MITRA-SEJAHTERA', 'Mitra Sejahtera Distribusi', 'Koperasi Mitra Sejahtera Distribusi', 'distribution_partner', 'active', v_actor)
  on conflict (code) do update
  set name = excluded.name,
      legal_name = excluded.legal_name,
      status = excluded.status,
      updated_at = now();

  insert into public.organization_relationships (source_organization_id, target_organization_id, relationship_type, status, created_by)
  values (v_org, v_partner_org, 'distribution_partner', 'active', v_actor)
  on conflict (relationship_type, source_organization_id, target_organization_id) do update
  set status = excluded.status,
      updated_at = now();

  insert into public.memberships (organization_id, profile_id, organization_unit_id, status, created_by)
  values
    (v_org, v_owner, v_unit_program, 'active', v_actor),
    (v_org, v_actor, v_unit_program, 'active', v_actor),
    (v_org, v_field, v_unit_field, 'active', v_actor),
    (v_org, v_auditor, v_unit_program, 'active', v_actor)
  on conflict (organization_id, profile_id) do update
  set organization_unit_id = excluded.organization_unit_id,
      status = 'active',
      updated_at = now();

  insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
  select v_org, membership.id, role.id, v_actor
  from public.memberships membership
  join public.profiles profile on profile.id = membership.profile_id
  join public.roles role on role.organization_id is null
    and role.key = case
      when profile.auth_user_id = 'demo-owner-auth' then 'organization_owner'
      when profile.auth_user_id = 'demo-field-auth' then 'field_officer'
      when profile.auth_user_id = 'demo-auditor-auth' then 'auditor'
      else 'organization_admin'
    end
  where membership.organization_id = v_org
    and profile.auth_user_id in ('demo-owner-auth', 'demo-admin-auth', 'demo-field-auth', 'demo-auditor-auth')
  on conflict (membership_id, role_id) do nothing;

  select id into v_membership
  from public.memberships
  where organization_id = v_org and profile_id = v_field
  limit 1;

  insert into public.program_categories (code, name, description, organization_id, status, created_by)
  values
    ('PANGAN-DEMO', 'Bantuan Pangan Demo', 'Kategori demo untuk paket sembako dan kebutuhan konsumtif.', v_org, 'active', v_actor),
    ('KAFALAH-DEMO', 'Kafalah Pendidikan Demo', 'Kategori demo untuk kafalah anak yatim dan dhuafa.', v_org, 'active', v_actor),
    ('WAKAF-DEMO', 'Wakaf Produktif Demo', 'Kategori demo untuk pengadaan aset wakaf produktif.', v_org, 'active', v_actor)
  on conflict (code, organization_id) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      updated_at = now();

  select id into v_cat_pangan from public.program_categories where organization_id = v_org and code = 'PANGAN-DEMO';
  select id into v_cat_pendidikan from public.program_categories where organization_id = v_org and code = 'KAFALAH-DEMO';

  insert into public.programs (
    id, organization_id, code, name, category_id, description, objective,
    target_beneficiary_type, target_beneficiary_count, budget_amount,
    allocated_amount, disbursed_amount, fund_type, status, starts_at, ends_at,
    owner_id, created_by
  )
  values
    (v_program_pangan, v_org, 'DEMO-PANGAN-2026', 'Paket Pangan Keluarga Rentan', v_cat_pangan, 'Distribusi paket pangan bulanan untuk keluarga rentan sekitar majelis dan mitra masjid.', 'Menjaga ketahanan pangan keluarga prioritas selama masa pemulihan ekonomi.', 'family', 150, 150000000, 45000000, 22500000, 'sedekah', 'active', now() - interval '45 days', now() + interval '120 days', v_actor, v_actor),
    (v_program_kafalah, v_org, 'DEMO-KAFALAH-2026', 'Kafalah Anak Yatim dan Dhuafa', v_cat_pendidikan, 'Dukungan biaya hidup dan pendidikan untuk anak yatim dan dhuafa berbasis monitoring berkala.', 'Memastikan penerima tetap sekolah dan kebutuhan pokoknya terpenuhi.', 'individual', 40, 240000000, 72000000, 12000000, 'education', 'active', now() - interval '30 days', now() + interval '330 days', v_actor, v_actor),
    (v_program_wakaf, v_org, 'DEMO-WAKAF-2026', 'Wakaf Perlengkapan Dakwah Produktif', v_cat_pangan, 'Pengadaan perlengkapan operasional dakwah dan aset produktif untuk layanan masyarakat.', 'Meningkatkan kapasitas layanan sosial-dakwah melalui aset yang dapat dipertanggungjawabkan.', 'community', 5, 95000000, 0, 0, 'waqf', 'draft', now(), now() + interval '240 days', v_actor, v_actor)
  on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      objective = excluded.objective,
      budget_amount = excluded.budget_amount,
      allocated_amount = excluded.allocated_amount,
      disbursed_amount = excluded.disbursed_amount,
      status = excluded.status,
      updated_at = now();

  insert into public.crm_contacts (
    id, organization_id, contact_type, display_name, legal_name, normalized_name,
    primary_email, normalized_email, primary_phone, normalized_phone,
    whatsapp_phone, gender, birth_date, address_line, village, district, city,
    province, postal_code, status, notes, created_by
  )
  values
    (v_contact_beneficiary, v_org, 'person', 'Siti Rahmah', 'Siti Rahmah binti Hasan', 'siti rahmah', null, null, '0812-1100-2201', '081211002201', '0812-1100-2201', 'female', '2014-05-12', 'Jl. Melati III No. 14', 'Cibiru', 'Cibiru', 'Bandung', 'Jawa Barat', '40614', 'active', 'Penerima prioritas demo, ibu sebagai wali aktif dalam komunikasi.', v_actor),
    (v_contact_beneficiary_2, v_org, 'person', 'Ahmad Fauzi', 'Ahmad Fauzi', 'ahmad fauzi', null, null, '0813-2200-3302', '081322003302', '0813-2200-3302', 'male', '2011-09-21', 'Kp. Babakan RT 03 RW 05', 'Cileunyi', 'Cileunyi', 'Bandung', 'Jawa Barat', '40622', 'active', 'Keluarga dengan kebutuhan pangan rutin dan dukungan pendidikan.', v_actor),
    (v_contact_donor, v_org, 'person', 'H. Abdullah Karim', 'Abdullah Karim', 'h abdullah karim', 'abdullah.karim@example.org', 'abdullah.karim@example.org', '0812-3300-4403', '081233004403', '0812-3300-4403', 'male', null, 'Jl. Sukajadi No. 88', 'Sukajadi', 'Sukajadi', 'Bandung', 'Jawa Barat', '40162', 'active', 'Donatur rutin dana pangan dan operasional sosial.', v_actor),
    (v_contact_kafil, v_org, 'person', 'Dr. Nur Aisyah', 'Nur Aisyah', 'dr nur aisyah', 'nur.aisyah@example.org', 'nur.aisyah@example.org', '0812-4400-5504', '081244005504', '0812-4400-5504', 'female', null, 'Komplek Daarul Ilmi Blok C7', 'Antapani', 'Antapani', 'Bandung', 'Jawa Barat', '40291', 'active', 'Kafil demo untuk kontrak kafalah pendidikan.', v_actor),
    (v_contact_vendor, v_org, 'institution', 'CV Barokah Logistik', 'CV Barokah Logistik Nusantara', 'cv barokah logistik', 'order@barokah-logistik.example', 'order@barokah-logistik.example', '022-750-8899', '0227508899', '0812-5500-6605', null, null, 'Jl. Soekarno Hatta No. 177', 'Cisaranten', 'Arcamanik', 'Bandung', 'Jawa Barat', '40293', 'active', 'Vendor sembako dan jasa pengiriman lokal.', v_actor),
    (v_contact_institution, v_org, 'institution', 'Masjid Al Amanah Cibiru', 'DKM Masjid Al Amanah Cibiru', 'masjid al amanah cibiru', 'dkm.alamanah@example.org', 'dkm.alamanah@example.org', '022-780-1212', '0227801212', '0812-6600-7706', null, null, 'Jl. Pesantren No. 9', 'Cibiru', 'Cibiru', 'Bandung', 'Jawa Barat', '40614', 'active', 'Mitra distribusi lapangan dan titik asesmen.', v_actor),
    (v_contact_duplicate, v_org, 'person', 'Siti R.', 'Siti Rahmah', 'siti rahmah', null, null, '0812-1100-2201', '081211002201', '0812-1100-2201', 'female', '2014-05-12', 'Jl. Melati 3 No.14', 'Cibiru', 'Cibiru', 'Bandung', 'Jawa Barat', '40614', 'active', 'Kontak demo kandidat duplikasi, jangan digabung otomatis.', v_actor)
  on conflict (id) do update
  set display_name = excluded.display_name,
      primary_phone = excluded.primary_phone,
      notes = excluded.notes,
      updated_at = now();

  insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, started_at, created_by)
  values
    (v_org, v_contact_beneficiary, 'beneficiary', 'active', now() - interval '90 days', v_actor),
    (v_org, v_contact_beneficiary_2, 'beneficiary', 'active', now() - interval '45 days', v_actor),
    (v_org, v_contact_donor, 'donor', 'active', now() - interval '180 days', v_actor),
    (v_org, v_contact_kafil, 'kafil', 'active', now() - interval '60 days', v_actor),
    (v_org, v_contact_vendor, 'donor', 'active', now() - interval '30 days', v_actor),
    (v_org, v_contact_institution, 'volunteer', 'active', now() - interval '120 days', v_actor)
  on conflict (contact_id, organization_id, role_type) do update
  set status = excluded.status,
      updated_at = now();

  insert into public.crm_beneficiary_profiles (organization_id, contact_id, beneficiary_type, vulnerability_level, household_size, income_range, assessment_status, status, eligibility_notes, created_by)
  values
    (v_org, v_contact_beneficiary, 'individual', 'high', 4, 'low', 'eligible', 'active', 'Anak yatim usia sekolah, membutuhkan dukungan biaya pendidikan dan pangan.', v_actor),
    (v_org, v_contact_beneficiary_2, 'family', 'medium', 5, 'low', 'in_review', 'active', 'Keluarga rentan, penghasilan tidak tetap dan membutuhkan paket pangan berkala.', v_actor)
  on conflict (contact_id, organization_id) do update
  set vulnerability_level = excluded.vulnerability_level,
      assessment_status = excluded.assessment_status,
      eligibility_notes = excluded.eligibility_notes,
      updated_at = now();

  insert into public.crm_institution_profiles (organization_id, contact_id, institution_type, institution_code, registration_reference, contact_person_name, contact_person_phone, status, created_by)
  values
    (v_org, v_contact_vendor, 'company', 'VND-BAROKAH', 'NIB-DEMO-001', 'Ibu Rina', '0812-5500-6605', 'active', v_actor),
    (v_org, v_contact_institution, 'mosque', 'MSJ-AMANAH', 'DKM-DEMO-001', 'Ust. Salman', '0812-6600-7706', 'active', v_actor)
  on conflict (contact_id, organization_id) do update
  set contact_person_name = excluded.contact_person_name,
      status = excluded.status,
      updated_at = now();

  insert into public.crm_sensitive_identities (organization_id, contact_id, identity_type, identity_ciphertext_ref, identity_last4, identity_hash, verification_status, verified_at, verified_by, created_by)
  values
    (v_org, v_contact_beneficiary, 'nik', 'demo-vault://crm/siti-rahmah/nik', '2201', 'demo-hash-siti-rahmah', 'verified', now() - interval '20 days', v_actor, v_actor),
    (v_org, v_contact_beneficiary_2, 'nik', 'demo-vault://crm/ahmad-fauzi/nik', '3302', 'demo-hash-ahmad-fauzi', 'unverified', null, null, v_actor)
  on conflict (id) do nothing;

  insert into public.crm_tags (id, organization_id, key, label, description, color, status, created_by)
  values
    (v_tag_urgent, v_org, 'urgent-follow-up', 'Perlu tindak lanjut', 'Kontak dengan kebutuhan atau komunikasi prioritas.', '#D97706', 'active', v_actor),
    (v_tag_orphan, v_org, 'anak-yatim', 'Anak yatim', 'Penerima dalam kategori anak yatim/dhuafa.', '#0F766E', 'active', v_actor)
  on conflict (key, organization_id) do update
  set label = excluded.label,
      description = excluded.description,
      color = excluded.color,
      status = excluded.status,
      updated_at = now();

  insert into public.crm_contact_tags (organization_id, contact_id, tag_id, created_by)
  values
    (v_org, v_contact_beneficiary, v_tag_urgent, v_actor),
    (v_org, v_contact_beneficiary, v_tag_orphan, v_actor),
    (v_org, v_contact_beneficiary_2, v_tag_urgent, v_actor)
  on conflict (contact_id, organization_id, tag_id) do nothing;

  insert into public.crm_interactions (id, organization_id, contact_id, interaction_type, direction, occurred_at, summary, follow_up_note, follow_up_at, created_by)
  values
    ('30000000-0000-4000-8000-000000000201', v_org, v_contact_beneficiary, 'visit', 'outbound', now() - interval '9 days', 'Kunjungan rumah untuk verifikasi kebutuhan sekolah dan pangan.', 'Jadwalkan monitoring bulan depan bersama wali.', now() + interval '21 days', v_field),
    ('30000000-0000-4000-8000-000000000202', v_org, v_contact_kafil, 'whatsapp', 'inbound', now() - interval '3 days', 'Kafil mengonfirmasi komitmen dukungan dua bulan pertama.', 'Kirim laporan realisasi setelah distribusi pertama.', now() + interval '7 days', v_actor)
  on conflict (id) do update
  set summary = excluded.summary,
      follow_up_note = excluded.follow_up_note,
      updated_at = now();

  insert into public.crm_consents (id, organization_id, contact_id, consent_type, channel, status, consented_at, expires_at, notes, created_by)
  values
    ('30000000-0000-4000-8000-000000000301', v_org, v_contact_beneficiary, 'data_processing', 'paper', 'granted', now() - interval '20 days', now() + interval '345 days', 'Persetujuan wali untuk asesmen dan dokumentasi internal.', v_actor),
    ('30000000-0000-4000-8000-000000000302', v_org, v_contact_kafil, 'communication', 'whatsapp', 'granted', now() - interval '30 days', null, 'Persetujuan komunikasi progres kafalah melalui WhatsApp.', v_actor)
  on conflict (id) do update
  set status = excluded.status,
      notes = excluded.notes,
      updated_at = now();

  insert into public.crm_duplicate_candidates (id, organization_id, primary_contact_id, duplicate_contact_id, match_score, match_reasons, status, created_by)
  values ('30000000-0000-4000-8000-000000000401', v_org, v_contact_beneficiary, v_contact_duplicate, 0.92, 'Nama, tanggal lahir, dan nomor telepon mirip. Perlu review manual.', 'open', v_actor)
  on conflict (duplicate_contact_id, organization_id, primary_contact_id) do update
  set match_score = excluded.match_score,
      match_reasons = excluded.match_reasons,
      status = excluded.status,
      updated_at = now();

  insert into public.crm_merge_requests (id, organization_id, source_contact_id, target_contact_id, status, reason, requested_by, requested_at, created_by)
  values ('30000000-0000-4000-8000-000000000402', v_org, v_contact_duplicate, v_contact_beneficiary, 'requested', 'Demo workflow merge: kandidat perlu ditinjau karena nomor telepon dan identitas wali serupa.', v_actor, now() - interval '1 day', v_actor)
  on conflict (id) do update
  set status = excluded.status,
      reason = excluded.reason,
      updated_at = now();

  insert into public.aid_applications (id, organization_id, reference_number, program_id, applicant_contact_id, channel, requested_support, urgency, status, submitted_at, screening_completed_at, notes, created_by, updated_by)
  values (v_application, v_org, 'DEMO-APP-2026-0001', v_program_pangan, v_contact_beneficiary_2, 'field', 'Paket pangan keluarga dan biaya transport sekolah selama tiga bulan.', 'urgent', 'converted', now() - interval '12 days', now() - interval '10 days', 'Data demo: pengajuan sudah lolos screening dan dikonversi menjadi kasus.', v_field, v_actor)
  on conflict (organization_id, reference_number) do update
  set requested_support = excluded.requested_support,
      urgency = excluded.urgency,
      status = excluded.status,
      updated_at = now();

  insert into public.beneficiary_cases (id, organization_id, reference_number, application_id, program_id, beneficiary_contact_id, status, assigned_to, summary, opened_at, created_by, updated_by)
  values (v_case, v_org, 'DEMO-CASE-2026-0001', v_application, v_program_pangan, v_contact_beneficiary_2, 'eligible', v_field, 'Kasus demo keluarga rentan dengan rencana bantuan pangan dan monitoring bulanan.', now() - interval '9 days', v_actor, v_actor)
  on conflict (organization_id, reference_number) do update
  set status = excluded.status,
      assigned_to = excluded.assigned_to,
      summary = excluded.summary,
      updated_at = now();

  insert into public.assessment_templates (id, organization_id, code, name, description, status, created_by)
  values (v_template, v_org, 'DEMO-KELAYAKAN', 'Asesmen Kelayakan Bantuan Demo', 'Template demo untuk menilai kebutuhan dasar, kondisi ekonomi, dan risiko sosial.', 'active', v_actor)
  on conflict (organization_id, code) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      updated_at = now();

  insert into public.assessment_template_versions (id, organization_id, template_id, version_number, status, passing_score, max_score, published_at, published_by, created_by)
  values (v_template_version, v_org, v_template, 1, 'published', 65, 100, now() - interval '15 days', v_actor, v_actor)
  on conflict (template_id, version_number) do update
  set status = excluded.status,
      passing_score = excluded.passing_score,
      max_score = excluded.max_score,
      updated_at = now();

  insert into public.assessment_sections (id, organization_id, template_version_id, title, description, position, created_by)
  values (v_section, v_org, v_template_version, 'Kondisi keluarga', 'Pertanyaan inti untuk kebutuhan pangan dan ekonomi keluarga.', 1, v_actor)
  on conflict (template_version_id, position) do update
  set title = excluded.title,
      description = excluded.description,
      updated_at = now();

  insert into public.assessment_questions (id, organization_id, section_id, code, prompt, question_type, required, evidence_required, options, scoring_rules, max_score, position, created_by)
  values
    (v_question_income, v_org, v_section, 'INCOME', 'Bagaimana kondisi penghasilan keluarga?', 'single_select', true, false, '[{"label":"Tidak ada","value":"none"},{"label":"Rendah","value":"low"},{"label":"Menengah","value":"middle"}]'::jsonb, '{"none":50,"low":35,"middle":10}'::jsonb, 50, 1, v_actor),
    (v_question_house, v_org, v_section, 'HOUSEHOLD', 'Jumlah tanggungan keluarga', 'number', true, false, '[]'::jsonb, '{"min":1,"max":10}'::jsonb, 50, 2, v_actor)
  on conflict (section_id, code) do update
  set prompt = excluded.prompt,
      scoring_rules = excluded.scoring_rules,
      max_score = excluded.max_score,
      updated_at = now();

  insert into public.case_assessments (id, organization_id, reference_number, case_id, template_version_id, status, assessor_profile_id, reviewer_profile_id, total_score, max_score, score_percentage, outcome, submitted_at, reviewed_at, created_by, updated_by)
  values (v_assessment, v_org, 'DEMO-ASSESS-2026-0001', v_case, v_template_version, 'approved', v_field, v_actor, 82, 100, 82, 'eligible', now() - interval '7 days', now() - interval '6 days', v_field, v_actor)
  on conflict (organization_id, reference_number) do update
  set status = excluded.status,
      total_score = excluded.total_score,
      score_percentage = excluded.score_percentage,
      outcome = excluded.outcome,
      updated_at = now();

  insert into public.assessment_answers (id, organization_id, assessment_id, question_id, value, calculated_score, created_by)
  values
    ('50000000-0000-4000-8000-000000000101', v_org, v_assessment, v_question_income, '"low"'::jsonb, 35, v_field),
    ('50000000-0000-4000-8000-000000000102', v_org, v_assessment, v_question_house, '5'::jsonb, 47, v_field)
  on conflict (assessment_id, question_id) do update
  set value = excluded.value,
      calculated_score = excluded.calculated_score,
      updated_at = now();

  insert into public.approval_workflows (id, organization_id, code, name, description, resource_type, status, created_by)
  values (v_workflow, v_org, 'DEMO-BANTUAN', 'Approval Bantuan Demo', 'Workflow demo satu langkah untuk persetujuan bantuan dan pengadaan.', 'fund_allocation', 'active', v_actor)
  on conflict (organization_id, code) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      updated_at = now();

  insert into public.approval_workflow_versions (id, organization_id, workflow_id, version_number, status, published_at, published_by, created_by)
  values (v_workflow_version, v_org, v_workflow, 1, 'draft', null, null, v_actor)
  on conflict (workflow_id, version_number) do update
  set status = excluded.status,
      published_at = excluded.published_at,
      updated_at = now();

  insert into public.approval_workflow_steps (id, organization_id, workflow_version_id, position, name, required_permission, minimum_approvals, created_by)
  values (v_workflow_step, v_org, v_workflow_version, 1, 'Persetujuan admin organisasi', 'approval_requests.act', 1, v_actor)
  on conflict (workflow_version_id, position) do nothing;

  insert into public.approval_requests (id, organization_id, reference_number, workflow_version_id, subject_type, subject_id, subject_snapshot, title, status, current_step_position, cycle_number, requested_by, submitted_at, created_at, updated_by)
  values (v_approval_request, v_org, 'DEMO-APR-2026-0001', v_workflow_version, 'fund_allocation', v_allocation, jsonb_build_object('allocation','DEMO-ALC-2026-0001','amount',45000000), 'Persetujuan alokasi paket pangan demo', 'in_progress', 1, 1, v_field, now() - interval '2 days', now() - interval '2 days', v_actor)
  on conflict (organization_id, reference_number) do update
  set status = excluded.status,
      current_step_position = excluded.current_step_position,
      subject_snapshot = excluded.subject_snapshot,
      updated_at = now();

  insert into public.approval_request_steps (id, organization_id, approval_request_id, workflow_step_id, position, name, required_permission, minimum_approvals, approval_count, status)
  values (v_approval_step, v_org, v_approval_request, v_workflow_step, 1, 'Persetujuan admin organisasi', 'approval_requests.act', 1, 0, 'in_progress')
  on conflict (approval_request_id, position) do update
  set status = excluded.status,
      updated_at = now();

  insert into public.fund_restrictions (id, organization_id, code, name, restriction_type, program_id, currency, status, created_by)
  values
    (v_restriction_general, v_org, 'DEMO-UMUM', 'Dana Amanah Umum Demo', 'unrestricted', null, 'IDR', 'active', v_actor),
    (v_restriction_pangan, v_org, 'DEMO-PANGAN', 'Dana Terikat Program Pangan Demo', 'program', v_program_pangan, 'IDR', 'active', v_actor)
  on conflict (organization_id, code) do update
  set name = excluded.name,
      status = excluded.status,
      updated_at = now();

  insert into public.fund_commitments (id, organization_id, reference_number, donor_contact_id, restriction_id, amount, currency, committed_at, expected_at, status, notes, created_by)
  values (v_commitment, v_org, 'DEMO-CMT-2026-0001', v_contact_donor, v_restriction_pangan, 75000000, 'IDR', now() - interval '25 days', now() + interval '35 days', 'partially_received', 'Komitmen donatur untuk paket pangan tiga bulan.', v_actor)
  on conflict (organization_id, reference_number) do update
  set amount = excluded.amount,
      status = excluded.status,
      updated_at = now();

  insert into public.fund_receipts (id, organization_id, reference_number, commitment_id, restriction_id, donor_contact_id, amount, currency, received_at, payment_method, external_reference, status, created_by)
  values (v_receipt, v_org, 'DEMO-RCP-2026-0001', v_commitment, v_restriction_pangan, v_contact_donor, 45000000, 'IDR', now() - interval '18 days', 'bank_transfer', 'BNI-DEMO-2026-0001', 'posted', v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.fund_allocations (id, organization_id, reference_number, restriction_id, program_id, amount, currency, purpose, status, activated_at, activated_by, created_by)
  values (v_allocation, v_org, 'DEMO-ALC-2026-0001', v_restriction_pangan, v_program_pangan, 45000000, 'IDR', 'Alokasi demo untuk paket pangan keluarga rentan gelombang pertama.', 'approved', now() - interval '14 days', v_actor, v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.fund_disbursements (id, organization_id, reference_number, allocation_id, amount, currency, recipient_type, recipient_reference, payment_method, external_reference, disbursed_at, status, created_by)
  values (v_disbursement, v_org, 'DEMO-DSB-2026-0001', v_allocation, 22500000, 'IDR', 'case', v_case::text, 'bank_transfer', 'DISB-DEMO-0001', now() - interval '8 days', 'posted', v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.fund_ledger_entries (id, organization_id, entry_number, entry_type, restriction_id, program_id, allocation_id, source_type, source_id, currency, available_delta, allocated_delta, disbursed_delta, occurred_at, actor_profile_id, request_id)
  values
    ('70000000-0000-4000-8000-000000000101', v_org, 'DEMO-LEDGER-0001', 'receipt_posted', v_restriction_pangan, null, null, 'receipt', v_receipt, 'IDR', 45000000, 0, 0, now() - interval '18 days', v_actor, '70000000-0000-4000-8000-000000000111'),
    ('70000000-0000-4000-8000-000000000102', v_org, 'DEMO-LEDGER-0002', 'allocation_approved', v_restriction_pangan, v_program_pangan, v_allocation, 'allocation', v_allocation, 'IDR', -45000000, 45000000, 0, now() - interval '14 days', v_actor, '70000000-0000-4000-8000-000000000112'),
    ('70000000-0000-4000-8000-000000000103', v_org, 'DEMO-LEDGER-0003', 'disbursement_posted', v_restriction_pangan, v_program_pangan, v_allocation, 'disbursement', v_disbursement, 'IDR', 0, -22500000, 22500000, now() - interval '8 days', v_actor, '70000000-0000-4000-8000-000000000113')
  on conflict do nothing;

  insert into public.fund_reconciliations (id, organization_id, reference_number, restriction_id, currency, period_ended_at, system_balance, statement_balance, difference_amount, status, notes, reconciled_by)
  values ('70000000-0000-4000-8000-000000000201', v_org, 'DEMO-REC-2026-0001', v_restriction_pangan, 'IDR', now() - interval '1 day', 22500000, 22500000, 0, 'matched', 'Rekonsiliasi demo cocok dengan rekening koran internal.', v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.inventory_products (id, organization_id, sku, name, category, base_unit, track_batch, track_expiry, status, created_by)
  values
    (v_product_rice, v_org, 'DEMO-BERAS-5KG', 'Beras Premium 5 Kg', 'pangan', 'paket', true, true, 'active', v_actor),
    (v_product_oil, v_org, 'DEMO-MINYAK-2L', 'Minyak Goreng 2 Liter', 'pangan', 'botol', true, true, 'active', v_actor),
    (v_product_quran, v_org, 'DEMO-QURAN-WAKAF', 'Mushaf Wakaf Standar', 'wakaf', 'eksemplar', false, false, 'active', v_actor)
  on conflict (organization_id, sku) do update
  set name = excluded.name,
      category = excluded.category,
      status = excluded.status,
      updated_at = now();

  insert into public.inventory_warehouses (id, organization_id, code, name, type, address_notes, status, created_by)
  values
    (v_warehouse_main, v_org, 'DEMO-GDG-PUSAT', 'Gudang Pusat Ihsanul Adab', 'central', 'Area penyimpanan utama paket pangan dan perlengkapan dakwah.', 'active', v_actor),
    (v_warehouse_field, v_org, 'DEMO-POS-CIBIRU', 'Pos Distribusi Cibiru', 'field', 'Pos lapangan dekat Masjid Al Amanah Cibiru.', 'active', v_actor)
  on conflict (organization_id, code) do update
  set name = excluded.name,
      address_notes = excluded.address_notes,
      status = excluded.status,
      updated_at = now();

  insert into public.inventory_batches (id, organization_id, product_id, batch_number, manufactured_at, expires_at, status, created_by)
  values
    (v_batch_rice, v_org, v_product_rice, 'DEMO-RICE-AUG26', current_date - 20, current_date + 300, 'active', v_actor),
    (v_batch_oil, v_org, v_product_oil, 'DEMO-OIL-AUG26', current_date - 15, current_date + 240, 'active', v_actor)
  on conflict (organization_id, product_id, batch_number) do update
  set expires_at = excluded.expires_at,
      status = excluded.status,
      updated_at = now();

  insert into public.inventory_balances (organization_id, product_id, warehouse_id, batch_id, quantity_on_hand, quantity_reserved)
  values
    (v_org, v_product_rice, v_warehouse_main, v_batch_rice, 240, 60),
    (v_org, v_product_oil, v_warehouse_main, v_batch_oil, 180, 45),
    (v_org, v_product_quran, v_warehouse_field, null, 75, 0)
  on conflict (organization_id, product_id, warehouse_id, batch_id) do update
  set quantity_on_hand = excluded.quantity_on_hand,
      quantity_reserved = excluded.quantity_reserved,
      updated_at = now();

  insert into public.inventory_adjustment_requests (id, organization_id, reference_number, product_id, warehouse_id, batch_number, expires_at, adjustment_type, expected_delta, unit, notes, decision_notes, status, approved_by, approved_at, posted_by, posted_at, created_by, updated_by)
  values (v_adjustment, v_org, 'DEMO-ADJ-2026-0001', v_product_rice, v_warehouse_main, 'DEMO-RICE-AUG26', current_date + 300, 'stocktake_gain', 12, 'paket', 'Penyesuaian demo dari hasil stock opname awal bulan di gudang pusat.', 'Disetujui untuk menyamakan catatan dengan stok fisik.', 'posted', v_actor, now() - interval '5 days', v_actor, now() - interval '5 days', v_field, v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.inventory_movements (id, organization_id, product_id, warehouse_id, batch_id, movement_type, direction, quantity, unit, source_type, source_id, occurred_at, notes, request_id, created_by)
  values
    ('80000000-0000-4000-8000-000000000401', v_org, v_product_rice, v_warehouse_main, v_batch_rice, 'receipt_in', 'in', 240, 'paket', 'goods_receipt', v_po, now() - interval '12 days', 'Stok awal demo dari pembelian paket pangan.', '80000000-0000-4000-8000-000000000411', v_actor),
    ('80000000-0000-4000-8000-000000000402', v_org, v_product_oil, v_warehouse_main, v_batch_oil, 'receipt_in', 'in', 180, 'botol', 'goods_receipt', v_po, now() - interval '12 days', 'Stok awal demo minyak goreng.', '80000000-0000-4000-8000-000000000412', v_actor)
  on conflict (id) do nothing;

  insert into public.procurement_requests (id, organization_id, reference_number, program_id, vendor_contact_id, title, purpose, items, currency, quote_amount, quote_currency, expected_at, status, created_by, updated_by)
  values (v_procurement, v_org, 'DEMO-PR-2026-0001', v_program_pangan, v_contact_vendor, 'Pengadaan paket pangan gelombang pertama', 'Memenuhi kebutuhan stok sembako untuk distribusi bulan berjalan.', '[{"sku":"DEMO-BERAS-5KG","name":"Beras 5 Kg","quantity":240,"unit":"paket"},{"sku":"DEMO-MINYAK-2L","name":"Minyak 2 Liter","quantity":180,"unit":"botol"}]'::jsonb, 'IDR', 28500000, 'IDR', now() + interval '10 days', 'ordered', v_actor, v_actor)
  on conflict (organization_id, reference_number) do update
  set title = excluded.title,
      status = excluded.status,
      updated_at = now();

  insert into public.purchase_orders (id, organization_id, procurement_request_id, reference_number, vendor_contact_id, amount, currency, expected_delivery_at, payment_terms, issued_at, issued_by, status, created_by, updated_by)
  values (v_po, v_org, v_procurement, 'DEMO-PO-2026-0001', v_contact_vendor, 28500000, 'IDR', now() + interval '5 days', 'Termin 7 hari setelah barang diterima lengkap.', now() - interval '11 days', v_actor, 'issued', v_actor, v_actor)
  on conflict (organization_id, reference_number) do update
  set amount = excluded.amount,
      status = excluded.status,
      updated_at = now();

  insert into public.procurement_events (id, organization_id, entity_type, entity_id, event_type, from_status, to_status, actor_profile_id, notes, request_id)
  values ('90000000-0000-4000-8000-000000000011', v_org, 'procurement_request', v_procurement, 'submitted', 'draft', 'ordered', v_actor, 'Event demo pengadaan telah diproses menjadi purchase order.', '90000000-0000-4000-8000-000000000012')
  on conflict do nothing;

  insert into public.aid_package_templates (id, organization_id, code, name, description, status, published_by, published_at, created_by)
  values (v_template_package, v_org, 'DEMO-PAKET-PANGAN', 'Paket Pangan Standar Demo', 'Paket sembako standar untuk keluarga rentan.', 'draft', null, null, v_actor)
  on conflict (organization_id, code) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      updated_at = now();

  insert into public.aid_package_template_items (id, organization_id, template_id, product_id, quantity, unit, allow_substitution, substitution_notes, sort_order, created_by)
  values
    (v_template_item_rice, v_org, v_template_package, v_product_rice, 1, 'paket', false, null, 1, v_actor),
    (v_template_item_oil, v_org, v_template_package, v_product_oil, 2, 'botol', false, null, 2, v_actor)
  on conflict (template_id, product_id) do nothing;

  insert into public.aid_package_packings (id, organization_id, reference_number, template_id, warehouse_id, package_count, recipient_label, notes, status, packed_by, packed_at, created_by, updated_by)
  values (v_packing, v_org, 'DEMO-PACK-2026-0001', v_template_package, v_warehouse_main, 45, 'Gelombang Cibiru - 45 keluarga', 'Packing demo untuk distribusi pangan minggu ini.', 'packed', v_field, now() - interval '4 days', v_field, v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.distribution_plans (id, organization_id, reference_number, disbursement_id, allocation_id, program_id, case_id, beneficiary_contact_id, amount, currency, distribution_method, purpose, planned_at, requires_confirmation, status, cycle_number, completed_at, created_by, updated_by)
  values (v_distribution_plan, v_org, 'DEMO-DIST-2026-0001', v_disbursement, v_allocation, v_program_pangan, v_case, v_contact_beneficiary_2, 7500000, 'IDR', 'bank_transfer', 'Distribusi demo bantuan pangan dan biaya transport sekolah untuk keluarga Ahmad Fauzi.', now() + interval '2 days', true, 'ready', 1, null, v_actor, v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.distribution_assignments (id, organization_id, distribution_plan_id, membership_id, assignee_profile_id, sequence_number, status, assigned_by, notes)
  values ('90000000-0000-4000-8000-000000000302', v_org, v_distribution_plan, v_membership, v_field, 1, 'active', v_actor, 'Penugasan demo untuk validasi alamat dan distribusi.')
  on conflict (distribution_plan_id, sequence_number) do nothing;

  insert into public.distribution_events (id, organization_id, distribution_plan_id, cycle_number, event_type, from_status, to_status, actor_profile_id, notes, request_id)
  values ('90000000-0000-4000-8000-000000000303', v_org, v_distribution_plan, 1, 'ready', 'draft', 'ready', v_actor, 'Rencana distribusi demo siap ditugaskan.', '90000000-0000-4000-8000-000000000304')
  on conflict do nothing;

  insert into public.distribution_evidence (id, organization_id, distribution_plan_id, cycle_number, sequence_number, evidence_kind, description, captured_at, classification, storage_status, file_metadata, created_by)
  values ('90000000-0000-4000-8000-000000000305', v_org, v_distribution_plan, 1, 1, 'field_note', 'Catatan lapangan demo untuk titik distribusi Cibiru.', now() - interval '1 day', 'private', 'not_applicable', '{"note":"Penerima dapat ditemui setelah Ashar."}'::jsonb, v_field)
  on conflict (distribution_plan_id, cycle_number, sequence_number) do nothing;

  insert into public.logistics_couriers (id, organization_id, code, name, courier_type, contact_name, contact_phone, service_notes, status, created_by)
  values (v_courier, v_org, 'DEMO-KURIR-INTERNAL', 'Tim Kurir Internal Cibiru', 'internal', 'Petugas Lapangan Demo', '0812-7000-8800', 'Kurir internal untuk paket pangan dan evidence lapangan.', 'active', v_actor)
  on conflict (organization_id, code) do update
  set name = excluded.name,
      status = excluded.status,
      updated_at = now();

  insert into public.logistics_shipments (id, organization_id, reference_number, packing_id, courier_id, tracking_number, service_level, destination_name, destination_phone, destination_address, planned_dispatch_at, dispatched_at, status, notes, created_by, updated_by)
  values (v_shipment, v_org, 'DEMO-SHIP-2026-0001', v_packing, v_courier, 'DEMO-TRK-0001', 'same_day_field', 'Masjid Al Amanah Cibiru', '0812-6600-7706', 'Jl. Pesantren No. 9, Cibiru, Bandung', now() + interval '1 day', null, 'draft', 'Shipment demo dari packing paket pangan ke titik distribusi.', v_actor, v_actor)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.logistics_tracking_events (id, organization_id, shipment_id, event_type, event_at, location, notes, external_event_id, created_by)
  values ('90000000-0000-4000-8000-000000000403', v_org, v_shipment, 'note', now() - interval '2 hours', 'Gudang Pusat', 'Paket sudah dipisahkan dan menunggu jadwal kirim.', 'DEMO-TRACK-NOTE-001', v_actor)
  on conflict do nothing;

  insert into public.evidence_files (id, organization_id, logical_file_id, version, entity_type, entity_id, classification, purpose, original_file_name, safe_file_name, object_key, storage_bucket, mime_type, size_bytes, checksum_sha256, status, confirmed_by, confirmed_at, created_by)
  values (v_evidence, v_org, 'a0000000-0000-4000-8000-000000000099', 1, 'case', v_case, 'restricted', 'Dokumen demo verifikasi kasus dan asesmen lapangan.', 'demo-verifikasi-kasus.pdf', 'demo-verifikasi-kasus.pdf', 'demo/evidence/case/demo-verifikasi-kasus.pdf', 'amanah-evidence-demo', 'application/pdf', 245760, repeat('a', 64), 'available', v_actor, now() - interval '6 days', v_actor)
  on conflict (object_key) do update
  set purpose = excluded.purpose,
      status = excluded.status,
      confirmed_by = excluded.confirmed_by,
      confirmed_at = excluded.confirmed_at,
      updated_at = now();

  insert into public.evidence_access_events (id, organization_id, evidence_file_id, action, actor_profile_id, request_id, metadata)
  values ('a0000000-0000-4000-8000-000000000002', v_org, v_evidence, 'upload_confirmed', v_actor, 'a0000000-0000-4000-8000-000000000003', '{"source":"demo-seed"}'::jsonb)
  on conflict (id) do nothing;

  insert into public.kafalah_needs (id, organization_id, reference_number, beneficiary_contact_id, case_id, need_type, title, description, approved_amount, matched_amount, currency, period_months, status, approved_by, approved_at, created_by, updated_by)
  values (v_kafalah_need, v_org, 'DEMO-KNF-2026-0001', v_contact_beneficiary, v_case, 'education', 'Kafalah pendidikan Siti Rahmah', 'Dukungan biaya pendidikan, perlengkapan sekolah, dan kebutuhan harian selama enam bulan.', 9000000, 3000000, 'IDR', 6, 'matched', v_actor, now() - interval '10 days', v_field, v_actor)
  on conflict (organization_id, reference_number) do update
  set matched_amount = excluded.matched_amount,
      status = excluded.status,
      updated_at = now();

  insert into public.kafalah_matches (id, organization_id, reference_number, need_id, sponsor_contact_id, matched_amount, start_date, end_date, status, activated_by, activated_at, created_by)
  values (v_kafalah_match, v_org, 'DEMO-KMT-2026-0001', v_kafalah_need, v_contact_kafil, 3000000, current_date - 10, current_date + 50, 'active', v_actor, now() - interval '8 days', v_actor)
  on conflict (organization_id, reference_number) do update
  set matched_amount = excluded.matched_amount,
      status = excluded.status,
      updated_at = now();

  insert into public.kafalah_contracts (id, organization_id, reference_number, match_id, frequency, periodic_amount, start_date, end_date, terms, status, activated_by, activated_at, created_by)
  values (v_kafalah_contract, v_org, 'DEMO-KFC-2026-0001', v_kafalah_match, 'monthly', 1500000, current_date - 10, current_date + 50, 'Kontrak demo kafalah pendidikan dengan pelaporan bulanan dan distribusi melalui wali penerima.', 'active', v_actor, now() - interval '8 days', v_actor)
  on conflict (organization_id, reference_number) do update
  set status = excluded.status,
      updated_at = now();

  insert into public.kafalah_schedules (id, organization_id, contract_id, installment_number, due_date, amount, paid_amount, distributed_amount, status)
  values
    (v_kafalah_schedule_1, v_org, v_kafalah_contract, 1, current_date - 5, 1500000, 1500000, 1500000, 'distributed'),
    (v_kafalah_schedule_2, v_org, v_kafalah_contract, 2, current_date + 25, 1500000, 0, 0, 'scheduled')
  on conflict (contract_id, installment_number) do update
  set paid_amount = excluded.paid_amount,
      distributed_amount = excluded.distributed_amount,
      status = excluded.status,
      updated_at = now();

  insert into public.kafalah_payments (id, organization_id, schedule_id, payment_reference, amount, paid_at, channel, status, created_by)
  values (v_kafalah_payment, v_org, v_kafalah_schedule_1, 'DEMO-KPAY-2026-0001', 1500000, now() - interval '4 days', 'bank_transfer', 'received', v_actor)
  on conflict (organization_id, payment_reference) do nothing;

  insert into public.kafalah_distributions (id, organization_id, schedule_id, payment_id, amount, distributed_at, method, confirmation_notes, status, created_by)
  values ('b0000000-0000-4000-8000-000000000007', v_org, v_kafalah_schedule_1, v_kafalah_payment, 1500000, now() - interval '3 days', 'bank_transfer', 'Distribusi demo diterima wali penerima dan dicatat untuk monitoring.', 'completed', v_field)
  on conflict (id) do nothing;

  insert into public.kafalah_monitoring_reports (id, organization_id, contract_id, period_start, period_end, outcome, summary, status, submitted_by, submitted_at, verified_by, verified_at, verification_notes)
  values ('b0000000-0000-4000-8000-000000000008', v_org, v_kafalah_contract, current_date - 30, current_date, 'improved', 'Penerima tetap aktif sekolah dan kebutuhan buku bulan ini sudah terpenuhi melalui kafalah.', 'verified', v_field, now() - interval '2 days', v_actor, now() - interval '1 day', 'Monitoring demo sudah sesuai bukti distribusi.')
  on conflict (id) do update
  set summary = excluded.summary,
      status = excluded.status;

  insert into public.kafalah_renewals (id, organization_id, contract_id, requested_start_date, requested_end_date, periodic_amount, reason, status, requested_by, requested_at)
  values ('b0000000-0000-4000-8000-000000000009', v_org, v_kafalah_contract, current_date + 51, current_date + 140, 1500000, 'Renewal demo diajukan karena kebutuhan pendidikan masih berjalan dan monitoring menunjukkan dampak positif.', 'requested', v_field, now() - interval '1 day')
  on conflict (id) do update
  set status = excluded.status,
      reason = excluded.reason;

  insert into public.kafalah_events (id, organization_id, entity_type, entity_id, event_type, event_data, created_by)
  values ('b0000000-0000-4000-8000-000000000010', v_org, 'contract', v_kafalah_contract, 'demo_seeded', '{"source":"demo-data.sql"}'::jsonb, v_actor)
  on conflict (id) do nothing;
end $$;
