-- Data contoh fase penghimpunan, wakaf terpadu, mitra/pengaju, dan registri
-- penerima manfaat. Idempoten (ID tetap) dan hanya menambah data pada
-- organisasi IHSANUL-ADAB. Membutuhkan migration 0033 dan 0034, serta seed
-- zz-demo-data.sql (program, gudang, produk, packing, dana demo).

create or replace function pg_temp.demo_stock_in(
  p_org uuid, p_donation uuid, p_item uuid, p_movement uuid, p_product uuid,
  p_warehouse uuid, p_batch text, p_expires date, p_quantity numeric,
  p_unit text, p_unit_value numeric, p_condition text, p_at timestamptz,
  p_actor uuid, p_note text
) returns void language plpgsql as $$
declare
  v_batch uuid;
  v_balance uuid;
begin
  if p_batch is not null then
    insert into public.inventory_batches (organization_id, product_id, batch_number, expires_at, status, created_by)
    values (p_org, p_product, p_batch, p_expires, 'active', p_actor)
    on conflict (organization_id, product_id, batch_number) do update set updated_at = now()
    returning id into v_batch;
  end if;

  insert into public.inventory_movements (
    id, organization_id, product_id, warehouse_id, batch_id, movement_type, direction,
    quantity, unit, source_type, source_id, occurred_at, notes, request_id, created_by
  ) values (
    p_movement, p_org, p_product, p_warehouse, v_batch, 'receipt_in', 'in',
    p_quantity, p_unit, 'in_kind_donation', p_donation, p_at, p_note, gen_random_uuid(), p_actor
  );

  select id into v_balance from public.inventory_balances
  where organization_id = p_org and product_id = p_product and warehouse_id = p_warehouse
    and batch_id is not distinct from v_batch
  for update;
  if v_balance is null then
    insert into public.inventory_balances (organization_id, product_id, warehouse_id, batch_id, quantity_on_hand, quantity_reserved)
    values (p_org, p_product, p_warehouse, v_batch, p_quantity, 0);
  else
    update public.inventory_balances
    set quantity_on_hand = quantity_on_hand + p_quantity, updated_at = now()
    where id = v_balance;
  end if;

  insert into public.in_kind_donation_items (
    id, organization_id, donation_id, product_id, quantity, unit, unit_value,
    item_condition, batch_number, expires_at, movement_id, created_by
  ) values (
    p_item, p_org, p_donation, p_product, p_quantity, p_unit, p_unit_value,
    p_condition, p_batch, p_expires, p_movement, p_actor
  );
end $$;

do $$
declare
  v_org uuid;
  v_actor uuid;
  v_owner uuid;
  v_field uuid;
  v_inserted uuid;

  -- data demo lama
  v_program_pangan uuid := '20000000-0000-4000-8000-000000000001';
  v_program_kafalah uuid := '20000000-0000-4000-8000-000000000002';
  v_restriction_general uuid := '70000000-0000-4000-8000-000000000001';
  v_restriction_pangan uuid := '70000000-0000-4000-8000-000000000002';
  v_product_rice uuid := '80000000-0000-4000-8000-000000000001';
  v_product_oil uuid := '80000000-0000-4000-8000-000000000002';
  v_product_quran uuid := '80000000-0000-4000-8000-000000000003';
  v_warehouse_main uuid := '80000000-0000-4000-8000-000000000101';
  v_warehouse_field uuid := '80000000-0000-4000-8000-000000000102';
  v_packing uuid := '90000000-0000-4000-8000-000000000201';

  -- produk baru
  v_product_clothes uuid := 'c0000000-0000-4000-8000-000000000901';
  v_product_stationery uuid := 'c0000000-0000-4000-8000-000000000902';
  v_product_milk uuid := 'c0000000-0000-4000-8000-000000000903';

  -- pemberi, mitra, pengaju
  c_hendra uuid := 'c1000000-0000-4000-8000-000000000001';
  c_berkah uuid := 'c1000000-0000-4000-8000-000000000002';
  c_rahmawati uuid := 'c1000000-0000-4000-8000-000000000003';
  c_sulaiman uuid := 'c1000000-0000-4000-8000-000000000004';
  c_masjid uuid := 'c1000000-0000-4000-8000-000000000005';
  c_pesantren uuid := 'c1000000-0000-4000-8000-000000000006';
  c_komunitas uuid := 'c1000000-0000-4000-8000-000000000007';
  c_nazhir uuid := 'c1000000-0000-4000-8000-000000000008';
  -- penerima manfaat
  b_siti uuid := 'c1000000-0000-4000-8000-000000000011';
  b_fauzan uuid := 'c1000000-0000-4000-8000-000000000012';
  b_karta uuid := 'c1000000-0000-4000-8000-000000000013';
  b_ujang uuid := 'c1000000-0000-4000-8000-000000000014';
  b_mahmud uuid := 'c1000000-0000-4000-8000-000000000015';
  b_aisyah uuid := 'c1000000-0000-4000-8000-000000000016';
  b_tahfidz uuid := 'c1000000-0000-4000-8000-000000000017';
  b_warsih uuid := 'c1000000-0000-4000-8000-000000000018';

  a_siti uuid := 'c2000000-0000-4000-8000-000000000001';
  a_pesantren uuid := 'c2000000-0000-4000-8000-000000000002';
  a_karta uuid := 'c2000000-0000-4000-8000-000000000003';
  a_ujang uuid := 'c2000000-0000-4000-8000-000000000004';
  a_fauzan uuid := 'c2000000-0000-4000-8000-000000000005';
  case_karta uuid := 'c3000000-0000-4000-8000-000000000001';

  area_cibiru uuid := 'c4000000-0000-4000-8000-000000000001';
  area_garut uuid := 'c4000000-0000-4000-8000-000000000002';
  pa_masjid uuid := 'c4000000-0000-4000-8000-000000000011';
  pa_komunitas uuid := 'c4000000-0000-4000-8000-000000000012';

  w_masjid uuid := 'c5000000-0000-4000-8000-000000000001';
  w_uang uuid := 'c5000000-0000-4000-8000-000000000002';
  w_kebun uuid := 'c5000000-0000-4000-8000-000000000003';
  w_tanah uuid := 'c5000000-0000-4000-8000-000000000004';
  inc_uang uuid := 'c9000000-0000-4000-8000-000000000001';
  inc_kebun uuid := 'c9000000-0000-4000-8000-000000000002';
  util_uang uuid := 'c8000000-0000-4000-8000-000000000001';
  util_kebun uuid := 'c8000000-0000-4000-8000-000000000002';

  d_berkah uuid := 'cd000000-0000-4000-8000-000000000001';
  d_hendra uuid := 'cd000000-0000-4000-8000-000000000002';
  d_anon uuid := 'cd000000-0000-4000-8000-000000000003';
  d_rahmawati uuid := 'cd000000-0000-4000-8000-000000000004';

  r_hendra uuid := 'ce000000-0000-4000-8000-000000000001';
  r_berkah uuid := 'ce000000-0000-4000-8000-000000000002';
begin
  select id into v_org from public.organizations where code = 'IHSANUL-ADAB';
  if v_org is null then
    raise exception 'Organisasi IHSANUL-ADAB belum ada. Jalankan seed zz-demo-data.sql terlebih dahulu.';
  end if;
  if not exists (select 1 from public.programs where id = v_program_pangan and organization_id = v_org) then
    raise exception 'Data demo dasar (program/gudang) belum ada. Jalankan zz-demo-data.sql terlebih dahulu.';
  end if;

  select coalesce(
    (select id from public.profiles where email = 'admin@ihsanuladab.or.id' limit 1),
    '10000000-0000-4000-8000-000000000012'::uuid
  ) into v_actor;
  select coalesce(
    (select id from public.profiles where auth_user_id = 'demo-owner-auth'),
    (select id from public.profiles where email = 'owner@ihsanuladab.or.id' limit 1)
  ) into v_owner;
  select coalesce(
    (select id from public.profiles where auth_user_id = 'demo-field-auth'),
    v_actor
  ) into v_field;

  -- ------------------------------------------------------------------
  -- Produk tambahan untuk donasi barang
  -- ------------------------------------------------------------------
  insert into public.inventory_products (id, organization_id, sku, name, category, base_unit, track_batch, track_expiry, status, created_by)
  values
    (v_product_clothes, v_org, 'DEMO-PAKAIAN-LAYAK', 'Pakaian Layak Pakai', 'sandang', 'pcs', false, false, 'active', v_actor),
    (v_product_stationery, v_org, 'DEMO-ALAT-TULIS', 'Paket Alat Tulis Sekolah', 'pendidikan', 'paket', false, false, 'active', v_actor),
    (v_product_milk, v_org, 'DEMO-SUSU-BALITA', 'Susu Balita 400 gr', 'gizi', 'kaleng', false, false, 'active', v_actor)
  on conflict (organization_id, sku) do nothing;

  -- ------------------------------------------------------------------
  -- Kontak: pemberi, mitra, pengaju, nazhir, penerima
  -- ------------------------------------------------------------------
  insert into public.crm_contacts (
    id, organization_id, contact_type, display_name, legal_name, normalized_name,
    primary_email, normalized_email, primary_phone, normalized_phone, whatsapp_phone,
    gender, birth_date, address_line, village, district, city, province, postal_code,
    status, notes, created_by
  ) values
    (c_hendra, v_org, 'person', 'Bpk. Hendra Wijaya', 'Hendra Wijaya', 'bpk. hendra wijaya', 'hendra.wijaya@example.org', 'hendra.wijaya@example.org', '0811-2233-4401', '081122334401', '0811-2233-4401', 'male', '1975-03-14', 'Jl. Dago Asri No. 21', 'Dago', 'Coblong', 'Bandung', 'Jawa Barat', '40135', 'active', 'Donatur rutin & wakif wakaf uang.', v_actor),
    (c_berkah, v_org, 'institution', 'PT Berkah Pangan Nusantara', 'PT Berkah Pangan Nusantara Tbk', 'pt berkah pangan nusantara', 'csr@berkahpangan.example', 'csr@berkahpangan.example', '022-420-1100', '0224201100', '0812-9000-1100', null, null, 'Jl. Soekarno Hatta No. 501', 'Batununggal', 'Bandung Kidul', 'Bandung', 'Jawa Barat', '40266', 'active', 'Mitra CSR pangan: donasi dana & barang.', v_actor),
    (c_rahmawati, v_org, 'person', 'Ibu Rahmawati', 'Rahmawati', 'ibu rahmawati', 'rahmawati@example.org', 'rahmawati@example.org', '0813-4455-6602', '081344556602', '0813-4455-6602', 'female', '1968-11-02', 'Komplek Setraduta Blok F2', 'Ciwaruga', 'Parongpong', 'Bandung Barat', 'Jawa Barat', '40559', 'active', 'Wakif wakaf uang dan wakaf mushaf.', v_actor),
    (c_sulaiman, v_org, 'person', 'Keluarga Besar H. Sulaiman', 'Ahli waris H. Sulaiman', 'keluarga besar h. sulaiman', null, null, '0812-7788-9903', '081277889903', '0812-7788-9903', 'unknown', null, 'Jl. Raya Cibiru No. 45', 'Cibiru Hilir', 'Cileunyi', 'Bandung', 'Jawa Barat', '40626', 'active', 'Wakif tanah dan wakaf melalui uang atas nama almarhum.', v_actor),
    (c_masjid, v_org, 'institution', 'DKM Masjid Al-Ikhlas Cibiru', 'Dewan Kemakmuran Masjid Al-Ikhlas', 'dkm masjid al-ikhlas cibiru', 'dkm.alikhlas@example.org', 'dkm.alikhlas@example.org', '022-780-5500', '0227805500', '0812-2211-5500', null, null, 'Jl. Manisi No. 12', 'Cipadung', 'Cibiru', 'Bandung', 'Jawa Barat', '40614', 'active', 'Mitra penyalur wilayah Cibiru & pengusul proyek wakaf masjid.', v_actor),
    (c_pesantren, v_org, 'institution', 'Yayasan Pesantren Nurul Huda', 'Yayasan Pondok Pesantren Nurul Huda', 'yayasan pesantren nurul huda', 'admin@nurulhuda.example', 'admin@nurulhuda.example', '0262-555-0101', '02625550101', '0812-3344-0101', null, null, 'Kp. Cibatu RT 02/04', 'Cibatu', 'Cibatu', 'Garut', 'Jawa Barat', '44185', 'active', 'Lembaga pengaju: kebutuhan santri & sumur wakaf.', v_actor),
    (c_komunitas, v_org, 'institution', 'Komunitas Relawan Peduli Garut', 'Komunitas Relawan Peduli Garut', 'komunitas relawan peduli garut', 'peduligarut@example.org', 'peduligarut@example.org', '0812-6655-0202', '081266550202', '0812-6655-0202', null, null, 'Jl. Ciledug No. 88', 'Kota Kulon', 'Garut Kota', 'Garut', 'Jawa Barat', '44112', 'active', 'Mitra penyalur wilayah Garut, mengajukan atas nama korban bencana.', v_actor),
    (c_nazhir, v_org, 'person', 'Ust. Hasan Basri', 'Hasan Basri', 'ust. hasan basri', 'hasan.basri@example.org', 'hasan.basri@example.org', '0813-1122-3304', '081311223304', '0813-1122-3304', 'male', '1979-07-19', 'Jl. Cijambe No. 7', 'Pasirjati', 'Ujungberung', 'Bandung', 'Jawa Barat', '40616', 'active', 'Nazhir perorangan bersertifikat.', v_actor),
    (b_siti, v_org, 'person', 'Ibu Siti Aminah', 'Siti Aminah', 'ibu siti aminah', null, null, '0857-2001-1101', '085720011101', '0857-2001-1101', 'female', '1982-04-10', 'Gg. Saluyu RT 04/07 No. 3', 'Cipadung Kulon', 'Panyileukan', 'Bandung', 'Jawa Barat', '40614', 'active', 'Janda dengan 3 anak, bekerja sebagai buruh cuci.', v_field),
    (b_fauzan, v_org, 'person', 'Ahmad Fauzan', 'Ahmad Fauzan', 'ahmad fauzan', null, null, '0857-2001-1102', '085720011102', null, 'male', '2012-08-17', 'Gg. Saluyu RT 04/07 No. 3', 'Cipadung Kulon', 'Panyileukan', 'Bandung', 'Jawa Barat', '40614', 'active', 'Anak yatim kelas 7, putra Ibu Siti Aminah.', v_field),
    (b_karta, v_org, 'person', 'Bapak Karta Wijaya', 'Karta Wijaya', 'bapak karta wijaya', null, null, '0858-3002-2201', '085830022201', null, 'male', '1951-01-05', 'Kp. Cisurupan RT 01/02', 'Cipadung Wetan', 'Panyileukan', 'Bandung', 'Jawa Barat', '40614', 'active', 'Lansia dengan disabilitas fisik, tinggal sendiri.', v_field),
    (b_ujang, v_org, 'person', 'Keluarga Ujang Suryana', 'Ujang Suryana', 'keluarga ujang suryana', null, null, '0852-4003-3301', '085240033301', '0852-4003-3301', 'male', '1985-06-22', 'Hunian sementara Posko Tarogong', 'Tarogong', 'Tarogong Kidul', 'Garut', 'Jawa Barat', '44151', 'active', 'Korban banjir bandang, rumah rusak berat.', v_field),
    (b_mahmud, v_org, 'person', 'Ustadz Mahmud', 'Mahmud', 'ustadz mahmud', null, null, '0853-5004-4401', '085350044401', '0853-5004-4401', 'male', '1970-12-01', 'Kp. Sukamanah RT 03/01', 'Sukamanah', 'Malangbong', 'Garut', 'Jawa Barat', '44188', 'active', 'Guru ngaji kampung, mengajar 40 santri tanpa honor tetap.', v_field),
    (b_aisyah, v_org, 'person', 'Nur Aisyah Putri', 'Nur Aisyah Putri', 'nur aisyah putri', 'aisyah.putri@example.org', 'aisyah.putri@example.org', '0856-6005-5501', '085660055501', '0856-6005-5501', 'female', '2005-02-28', 'Asrama Putri Darul Ilmi', 'Cibiru Wetan', 'Cileunyi', 'Bandung', 'Jawa Barat', '40625', 'active', 'Mahasiswi yatim piatu, penerima beasiswa wakaf.', v_field),
    (b_tahfidz, v_org, 'institution', 'Pondok Tahfidz Al-Fath', 'Yayasan Tahfidz Al-Fath', 'pondok tahfidz al-fath', 'alfath@example.org', 'alfath@example.org', '0812-8006-6601', '081280066601', '0812-8006-6601', null, null, 'Kp. Pasir Kaliki RT 05/03', 'Cibeunying', 'Cimenyan', 'Bandung', 'Jawa Barat', '40191', 'active', 'Pondok tahfidz 35 santri dhuafa.', v_field),
    (b_warsih, v_org, 'person', 'Ibu Warsih', 'Warsih', 'ibu warsih', null, null, '0859-7007-7701', '085970077701', null, 'female', '1958-09-09', 'Kp. Babakan Sari RT 02/05', 'Cibiru Wetan', 'Cileunyi', 'Bandung', 'Jawa Barat', '40625', 'active', 'Pasien gagal ginjal, cuci darah rutin.', v_field)
  on conflict (id) do nothing;

  insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, started_at, created_by)
  values
    (v_org, c_hendra, 'donor', 'active', now() - interval '400 days', v_actor),
    (v_org, c_berkah, 'donor', 'active', now() - interval '200 days', v_actor),
    (v_org, c_rahmawati, 'donor', 'active', now() - interval '300 days', v_actor),
    (v_org, c_sulaiman, 'donor', 'active', now() - interval '150 days', v_actor),
    (v_org, c_masjid, 'distribution_partner', 'active', now() - interval '180 days', v_actor),
    (v_org, c_masjid, 'applicant', 'active', now() - interval '180 days', v_actor),
    (v_org, c_pesantren, 'applicant', 'active', now() - interval '60 days', v_actor),
    (v_org, c_komunitas, 'distribution_partner', 'active', now() - interval '90 days', v_actor),
    (v_org, c_komunitas, 'applicant', 'active', now() - interval '90 days', v_actor),
    (v_org, c_nazhir, 'volunteer', 'active', now() - interval '365 days', v_actor),
    (v_org, b_siti, 'beneficiary', 'active', now() - interval '40 days', v_field),
    (v_org, b_siti, 'applicant', 'active', now() - interval '40 days', v_field),
    (v_org, b_fauzan, 'beneficiary', 'active', now() - interval '40 days', v_field),
    (v_org, b_karta, 'beneficiary', 'active', now() - interval '30 days', v_field),
    (v_org, b_ujang, 'beneficiary', 'active', now() - interval '20 days', v_field),
    (v_org, b_mahmud, 'beneficiary', 'active', now() - interval '100 days', v_field),
    (v_org, b_aisyah, 'beneficiary', 'active', now() - interval '120 days', v_field),
    (v_org, b_tahfidz, 'beneficiary', 'active', now() - interval '80 days', v_field),
    (v_org, b_warsih, 'beneficiary', 'active', now() - interval '15 days', v_field)
  on conflict (organization_id, contact_id, role_type) do nothing;

  insert into public.crm_institution_profiles (organization_id, contact_id, institution_type, institution_code, registration_reference, contact_person_name, contact_person_phone, status, created_by)
  values
    (v_org, c_berkah, 'company', 'CSR-BERKAH', 'NIB-DEMO-2201', 'Ibu Laras (CSR)', '0812-9000-1100', 'active', v_actor),
    (v_org, c_masjid, 'mosque', 'MSJ-ALIKHLAS', 'DKM-DEMO-0102', 'H. Dadang (Ketua DKM)', '0812-2211-5500', 'active', v_actor),
    (v_org, c_pesantren, 'foundation', 'PP-NURULHUDA', 'AHU-DEMO-0033', 'KH. Abdul Rozak', '0812-3344-0101', 'active', v_actor),
    (v_org, c_komunitas, 'community', 'KOM-PEDULIGRT', 'SK-DEMO-0901', 'Rizal (Koordinator)', '0812-6655-0202', 'active', v_actor),
    (v_org, b_tahfidz, 'school', 'TAHFIDZ-ALFATH', 'AHU-DEMO-0077', 'Ust. Fikri', '0812-8006-6601', 'active', v_actor)
  on conflict (contact_id, organization_id) do nothing;

  -- Profil lengkap penerima manfaat
  insert into public.crm_beneficiary_profiles (
    organization_id, contact_id, beneficiary_type, vulnerability_level, household_size,
    income_range, assessment_status, status, eligibility_notes, birth_place,
    marital_status, education_level, occupation, monthly_income, dependents_count,
    housing_status, disability_status, health_notes, asnaf_category,
    beneficiary_categories, guardian_name, guardian_relation, guardian_phone,
    emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number,
    bank_account_holder, referral_partner_contact_id, registration_source, created_by, updated_by
  ) values
    (v_org, b_siti, 'family', 'high', 4, 'low', 'eligible', 'active', 'Suami wafat 2023; penghasilan tidak tetap dari buruh cuci. Layak paket pangan bulanan.', 'Bandung', 'widowed', 'sd', 'Buruh cuci', 900000, 3, 'rent', 'none', null, 'miskin', array['janda','dhuafa'], null, null, null, 'Ibu Enok (tetangga)', '0857-2001-9901', 'BSI', '7123400011', 'Siti Aminah', c_masjid, 'partner', v_field, v_field),
    (v_org, b_fauzan, 'individual', 'high', 4, 'none', 'eligible', 'active', 'Yatim, berprestasi (peringkat 3 kelas). Diusulkan beasiswa wakaf pendidikan.', 'Bandung', 'single', 'sd', 'Pelajar SMP', null, 0, 'rent', 'none', null, 'fakir', array['yatim','pelajar'], 'Ibu Siti Aminah', 'Ibu kandung', '0857-2001-1101', 'Ibu Siti Aminah', '0857-2001-1101', null, null, null, c_masjid, 'admin', v_field, v_field),
    (v_org, b_karta, 'individual', 'critical', 1, 'none', 'eligible', 'active', 'Lansia sebatang kara, kaki kanan diamputasi. Diajukan DKM Al-Ikhlas.', 'Garut', 'widowed', 'none', 'Tidak bekerja', 0, 0, 'family', 'physical', 'Diabetes, perlu kontrol bulanan.', 'fakir', array['lansia','disabilitas'], 'Dede Rohman', 'Keponakan', '0858-3002-9902', 'Dede Rohman', '0858-3002-9902', null, null, null, c_masjid, 'partner', v_field, v_field),
    (v_org, b_ujang, 'family', 'high', 5, 'low', 'in_review', 'active', 'Rumah rusak berat akibat banjir bandang; sementara di hunian posko.', 'Garut', 'married', 'smp', 'Petani penggarap', 1200000, 3, 'none', 'none', null, 'miskin', array['korban_bencana','dhuafa'], null, null, null, 'Rizal (Komunitas Peduli Garut)', '0812-6655-0202', null, null, null, c_komunitas, 'partner', v_field, v_field),
    (v_org, b_mahmud, 'individual', 'medium', 6, 'low', 'eligible', 'active', 'Guru ngaji 40 santri; menerima manfaat hasil kebun wakaf setiap panen.', 'Garut', 'married', 'sma', 'Guru ngaji', 700000, 4, 'own', 'none', null, 'fisabilillah', array['guru_ngaji','dai'], null, null, null, 'Hj. Imas (istri)', '0853-5004-9903', 'BRI', '0012011122334', 'Mahmud', null, 'admin', v_field, v_field),
    (v_org, b_aisyah, 'individual', 'high', 1, 'none', 'eligible', 'active', 'Yatim piatu, IPK 3,71 semester 3. Beasiswa dari wakaf uang pendidikan.', 'Tasikmalaya', 'single', 'sma', 'Mahasiswa', null, 0, 'official', 'none', null, 'fakir', array['yatim_piatu','mahasiswa'], 'Ust. Hasan Basri', 'Pengasuh asrama', '0813-1122-3304', 'Ust. Hasan Basri', '0813-1122-3304', 'BSI', '7123400099', 'Nur Aisyah Putri', null, 'program', v_field, v_field),
    (v_org, b_tahfidz, 'institution', 'medium', 35, 'low', 'eligible', 'active', 'Pondok tahfidz 35 santri dhuafa; butuh mushaf dan bahan pangan.', null, null, null, null, 2500000, 35, 'free_use', null, null, 'fisabilillah', array['santri'], null, null, null, 'Ust. Fikri', '0812-8006-6601', 'Bank Syariah Indonesia', '7200011177', 'Yayasan Tahfidz Al-Fath', null, 'admin', v_field, v_field),
    (v_org, b_warsih, 'individual', 'high', 2, 'low', 'in_review', 'active', 'Cuci darah 2x seminggu; perlu bantuan transport dan gizi.', 'Bandung', 'widowed', 'sd', 'Tidak bekerja', 300000, 1, 'family', 'none', 'Gagal ginjal kronis stadium 5.', 'miskin', array['pasien','lansia'], 'Neneng', 'Anak', '0859-7007-9904', 'Neneng', '0859-7007-9904', null, null, null, null, 'admin', v_field, v_field)
  on conflict (contact_id, organization_id) do update set
    vulnerability_level = excluded.vulnerability_level,
    birth_place = excluded.birth_place,
    marital_status = excluded.marital_status,
    education_level = excluded.education_level,
    occupation = excluded.occupation,
    monthly_income = excluded.monthly_income,
    dependents_count = excluded.dependents_count,
    housing_status = excluded.housing_status,
    disability_status = excluded.disability_status,
    health_notes = excluded.health_notes,
    asnaf_category = excluded.asnaf_category,
    beneficiary_categories = excluded.beneficiary_categories,
    guardian_name = excluded.guardian_name,
    guardian_relation = excluded.guardian_relation,
    guardian_phone = excluded.guardian_phone,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    bank_name = excluded.bank_name,
    bank_account_number = excluded.bank_account_number,
    bank_account_holder = excluded.bank_account_holder,
    referral_partner_contact_id = excluded.referral_partner_contact_id,
    updated_at = now();

  -- Lengkapi dua penerima demo lama agar ikut tampil lengkap.
  update public.crm_beneficiary_profiles set
    birth_place = coalesce(birth_place, 'Bandung'),
    education_level = coalesce(education_level, 'sd'),
    occupation = coalesce(occupation, 'Pelajar'),
    housing_status = coalesce(housing_status, 'rent'),
    marital_status = coalesce(marital_status, 'single'),
    asnaf_category = coalesce(asnaf_category, 'fakir'),
    beneficiary_categories = case when beneficiary_categories = '{}' then array['yatim','pelajar'] else beneficiary_categories end,
    updated_at = now()
  where organization_id = v_org and contact_id = '30000000-0000-4000-8000-000000000001';
  update public.crm_beneficiary_profiles set
    birth_place = coalesce(birth_place, 'Bandung'),
    education_level = coalesce(education_level, 'smp'),
    occupation = coalesce(occupation, 'Pelajar'),
    housing_status = coalesce(housing_status, 'family'),
    marital_status = coalesce(marital_status, 'single'),
    asnaf_category = coalesce(asnaf_category, 'miskin'),
    beneficiary_categories = case when beneficiary_categories = '{}' then array['dhuafa','pelajar'] else beneficiary_categories end,
    updated_at = now()
  where organization_id = v_org and contact_id = '30000000-0000-4000-8000-000000000002';

  -- Identitas: hanya 4 digit terakhir + hash (format sama dengan server).
  insert into public.crm_sensitive_identities (organization_id, contact_id, identity_type, identity_ciphertext_ref, identity_last4, identity_hash, verification_status, verified_at, verified_by, created_by)
  select v_org, data.contact_id, data.identity_type, 'not-retained:hash-only', right(data.number, 4),
         'sha256:' || encode(sha256(convert_to(v_org::text || ':' || data.identity_type || ':' || data.number, 'UTF8')), 'hex'),
         data.status, case when data.status = 'verified' then now() - interval '10 days' end,
         case when data.status = 'verified' then v_owner end, v_field
  from (values
    (b_siti, 'nik', '3273014410820007', 'verified'),
    (b_siti, 'family_card', '3273010101200041', 'verified'),
    (b_fauzan, 'nik', '3273011708120003', 'verified'),
    (b_karta, 'nik', '3205010501510002', 'verified'),
    (b_ujang, 'nik', '3205152206850004', 'unverified'),
    (b_mahmud, 'nik', '3205180112700001', 'verified'),
    (b_aisyah, 'nik', '3278016802050006', 'verified'),
    (b_warsih, 'nik', '3204104909580002', 'unverified')
  ) as data(contact_id, identity_type, number, status)
  where not exists (
    select 1 from public.crm_sensitive_identities existing
    where existing.organization_id = v_org and existing.contact_id = data.contact_id
      and existing.identity_type = data.identity_type
  );

  -- ------------------------------------------------------------------
  -- Penerimaan dana dari donatur baru (dengan ledger)
  -- ------------------------------------------------------------------
  insert into public.fund_receipts (id, organization_id, reference_number, restriction_id, donor_contact_id, amount, currency, received_at, payment_method, external_reference, status, created_by)
  values (r_hendra, v_org, 'DEMO-RCP-2026-0101', v_restriction_general, c_hendra, 5000000, 'IDR', now() - interval '25 days', 'bank_transfer', 'BSI-DEMO-0101', 'posted', v_actor)
  on conflict (organization_id, reference_number) do nothing
  returning id into v_inserted;
  if v_inserted is not null then
    insert into public.fund_ledger_entries (organization_id, entry_number, entry_type, restriction_id, source_type, source_id, currency, available_delta, allocated_delta, disbursed_delta, occurred_at, actor_profile_id, request_id)
    values (v_org, 'DEMO-GIV-LEDGER-0101', 'receipt_posted', v_restriction_general, 'receipt', r_hendra, 'IDR', 5000000, 0, 0, now() - interval '25 days', v_actor, gen_random_uuid());
  end if;
  v_inserted := null;
  insert into public.fund_receipts (id, organization_id, reference_number, restriction_id, donor_contact_id, amount, currency, received_at, payment_method, external_reference, status, created_by)
  values (r_berkah, v_org, 'DEMO-RCP-2026-0102', v_restriction_pangan, c_berkah, 15000000, 'IDR', now() - interval '12 days', 'bank_transfer', 'CSR-BERKAH-0102', 'posted', v_actor)
  on conflict (organization_id, reference_number) do nothing
  returning id into v_inserted;
  if v_inserted is not null then
    insert into public.fund_ledger_entries (organization_id, entry_number, entry_type, restriction_id, source_type, source_id, currency, available_delta, allocated_delta, disbursed_delta, occurred_at, actor_profile_id, request_id)
    values (v_org, 'DEMO-GIV-LEDGER-0102', 'receipt_posted', v_restriction_pangan, 'receipt', r_berkah, 'IDR', 15000000, 0, 0, now() - interval '12 days', v_actor, gen_random_uuid());
  end if;

  -- ------------------------------------------------------------------
  -- Pengajuan bantuan: individu, lembaga, mitra atas nama penerima
  -- ------------------------------------------------------------------
  insert into public.aid_applications (id, organization_id, reference_number, program_id, applicant_contact_id, channel, requested_support, urgency, status, submitted_at, screening_completed_at, notes, created_by, updated_by, submitter_type, submitting_partner_contact_id, beneficiary_count, requested_amount)
  values
    (a_siti, v_org, 'DEMO-APP-2026-0101', v_program_pangan, b_siti, 'walk_in', 'Paket sembako bulanan untuk keluarga 4 orang selama 3 bulan.', 'normal', 'submitted', now() - interval '6 days', null, 'Datang langsung ke kantor dengan surat keterangan RT.', v_field, v_field, 'individual', null, 4, 1500000),
    (a_pesantren, v_org, 'DEMO-APP-2026-0102', v_program_pangan, c_pesantren, 'online', 'Bantuan beras dan lauk untuk 120 santri selama Ramadhan.', 'urgent', 'in_screening', now() - interval '9 days', null, 'Proposal lembaga dilampirkan melalui email.', v_actor, v_actor, 'institution', null, 120, 25000000),
    (a_karta, v_org, 'DEMO-APP-2026-0103', v_program_pangan, b_karta, 'partner', 'Paket pangan dan kursi roda untuk lansia disabilitas.', 'emergency', 'converted', now() - interval '20 days', now() - interval '17 days', 'Diajukan DKM Al-Ikhlas; verifikasi lapangan sudah dilakukan.', v_field, v_actor, 'partner_on_behalf', c_masjid, 1, 2500000),
    (a_ujang, v_org, 'DEMO-APP-2026-0104', v_program_pangan, b_ujang, 'partner', 'Paket pangan darurat dan perlengkapan sekolah untuk 3 anak.', 'emergency', 'accepted', now() - interval '8 days', now() - interval '5 days', 'Diajukan Komunitas Peduli Garut untuk korban banjir.', v_field, v_actor, 'partner_on_behalf', c_komunitas, 5, 3000000),
    (a_fauzan, v_org, 'DEMO-APP-2026-0105', v_program_kafalah, b_fauzan, 'field', 'Kafalah biaya sekolah dan buku untuk anak yatim kelas 7.', 'normal', 'draft', null, null, 'Draft dari kunjungan rumah; menunggu kelengkapan rapor.', v_field, v_field, 'individual', null, 1, 600000)
  on conflict (organization_id, reference_number) do nothing;

  insert into public.beneficiary_cases (id, organization_id, reference_number, application_id, program_id, beneficiary_contact_id, status, assigned_to, summary, opened_at, created_by, updated_by)
  values (case_karta, v_org, 'DEMO-CASE-2026-0101', a_karta, v_program_pangan, b_karta, 'eligible', v_field, 'Lansia disabilitas, layak paket pangan bulanan via mitra DKM Al-Ikhlas.', now() - interval '16 days', v_actor, v_actor)
  on conflict (organization_id, reference_number) do nothing;

  -- Area penyaluran & penugasan mitra pada Program pangan
  insert into public.program_delivery_areas (id, organization_id, program_id, code, name, address_line, village, district, city, province, postal_code, quota_capacity, status, notes, created_by)
  values
    (area_cibiru, v_org, v_program_pangan, 'CIBIRU', 'Wilayah Cibiru & Panyileukan', 'Sekretariat DKM Al-Ikhlas', 'Cipadung', 'Cibiru', 'Bandung', 'Jawa Barat', '40614', 60, 'active', 'Titik distribusi di halaman masjid.', v_actor),
    (area_garut, v_org, v_program_pangan, 'GARUT-BANJIR', 'Posko Banjir Tarogong Garut', 'Posko Tarogong', 'Tarogong', 'Tarogong Kidul', 'Garut', 'Jawa Barat', '44151', 40, 'active', 'Prioritas korban banjir bandang.', v_actor)
  on conflict (program_id, code) do nothing;

  insert into public.program_partner_assignments (id, organization_id, program_id, delivery_area_id, partner_contact_id, assignment_role, pic_name, pic_phone, readiness_status, status, notes, created_by)
  values
    (pa_masjid, v_org, v_program_pangan, area_cibiru, c_masjid, 'distributor', 'H. Dadang', '0812-2211-5500', 'accepted', 'active', 'Menyalurkan paket dan memverifikasi penerima wilayah Cibiru.', v_actor),
    (pa_komunitas, v_org, v_program_pangan, area_garut, c_komunitas, 'distributor', 'Rizal', '0812-6655-0202', 'ready', 'active', 'Menyalurkan paket darurat di posko banjir.', v_actor)
  on conflict (id) do nothing;

  insert into public.program_application_allocations (organization_id, program_id, application_id, delivery_area_id, partner_assignment_id, status, notes, idempotency_key, request_hash, created_by)
  values
    (v_org, v_program_pangan, a_karta, area_cibiru, pa_masjid, 'allocated', 'Kuota Cibiru — paket bulanan.', 'demo-alloc-karta-0103', 'demo-seed', v_actor),
    (v_org, v_program_pangan, a_ujang, area_garut, pa_komunitas, 'reserved', 'Menunggu jadwal distribusi posko.', 'demo-alloc-ujang-0104', 'demo-seed', v_actor)
  on conflict (organization_id, idempotency_key) do nothing;

  insert into public.program_beneficiary_fulfillments (organization_id, program_id, application_id, case_id, beneficiary_contact_id, packing_id, package_count, partner_contact_id, partner_pic_name, partner_readiness_status, status, notes, idempotency_key, request_hash, created_by)
  values (v_org, v_program_pangan, a_karta, case_karta, b_karta, v_packing, 1, c_masjid, 'H. Dadang', 'accepted', 'active', 'Paket pangan bulan pertama diserahkan di rumah penerima.', 'demo-fulfill-karta-0103', 'demo-seed', v_actor)
  on conflict (organization_id, idempotency_key) do nothing;

  -- ------------------------------------------------------------------
  -- Wakaf: empat skema
  -- ------------------------------------------------------------------
  insert into public.waqf_assets (id, organization_id, reference_number, asset_type, name, description, donor_contact_id, acquisition_date, acquisition_value, currency, location_text, legal_status, operational_status, registration_notes, registered_by, registered_at, created_by, updated_by, waqf_purpose, waqf_duration, duration_end_date, collection_scheme, designation, pledge_date, fundraising_target)
  values
    (w_masjid, v_org, 'DEMO-WQF-2026-0001', 'building', 'Pembangunan Masjid & TPQ Al-Ikhlas Cibiru', 'Wakaf melalui uang untuk membangun masjid dua lantai beserta ruang TPQ bagi 150 santri.', null, null, null, 'IDR', 'Jl. Manisi No. 12, Cipadung, Cibiru, Bandung', 'incomplete', 'draft', null, null, null, v_actor, v_actor, 'khairi', 'permanent', null, 'cash_for_asset', 'Masjid dan TPQ', null, 750000000),
    (w_uang, v_org, 'DEMO-WQF-2026-0002', 'cash', 'Wakaf Uang Pendidikan Yatim', 'Wakaf uang diinvestasikan pada sukuk dan deposito syariah; imbal hasil untuk beasiswa yatim.', null, current_date - 300, 150000000, 'IDR', 'Rekening wakaf BSI a.n. Yayasan Ihsanul Adab', 'verified', 'active', 'Registrasi setelah bukti setor dan surat pernyataan diverifikasi.', v_owner, now() - interval '280 days', v_actor, v_owner, 'khairi', 'temporary', current_date + 1900, 'cash_waqf', 'Beasiswa anak yatim', current_date - 300, null),
    (w_kebun, v_org, 'DEMO-WQF-2026-0003', 'land', 'Kebun Kurma Wakaf Produktif Garut', 'Lahan 2 ha dikelola kelompok tani; hasil panen untuk guru ngaji dan pondok tahfidz.', c_sulaiman, current_date - 700, 950000000, 'IDR', 'Desa Sukamanah, Malangbong, Garut', 'verified', 'active', 'AIW dan sertifikat wakaf terverifikasi.', v_owner, now() - interval '650 days', v_actor, v_owner, 'khairi', 'permanent', null, 'productive', 'Pemberdayaan ekonomi & dakwah', current_date - 700, null),
    (w_tanah, v_org, 'DEMO-WQF-2026-0004', 'land', 'Tanah Wakaf Rumah Tahfidz Cileunyi', 'Tanah 400 m² dari keluarga H. Sulaiman untuk rumah tahfidz; menunggu verifikasi AIW.', c_sulaiman, current_date - 20, 350000000, 'IDR', 'Jl. Raya Cibiru No. 45, Cileunyi, Bandung', 'pending_review', 'draft', null, null, null, v_actor, v_actor, 'khairi', 'permanent', null, 'direct_asset', 'Rumah tahfidz', current_date - 20, null)
  on conflict (id) do nothing;

  insert into public.waqf_legal_documents (id, organization_id, asset_id, document_type, document_number, issuer, issued_at, verification_status, verification_notes, created_by, verified_by, verified_at)
  values
    ('c6000000-0000-4000-8000-000000000001', v_org, w_uang, 'surat_pernyataan', 'SPW-UANG-2025-017', 'Yayasan Ihsanul Adab', current_date - 300, 'verified', 'Surat pernyataan wakif lengkap dan ditandatangani saksi.', v_actor, v_owner, now() - interval '285 days'),
    ('c6000000-0000-4000-8000-000000000002', v_org, w_uang, 'bukti_transfer', 'BSI-TRF-2025-5521', 'Bank Syariah Indonesia', current_date - 300, 'verified', 'Bukti setor sesuai nominal pada rekening wakaf.', v_actor, v_owner, now() - interval '285 days'),
    ('c6000000-0000-4000-8000-000000000003', v_org, w_kebun, 'akta_ikrar_wakaf', 'AIW/KUA-MLB/2024/112', 'KUA Malangbong', current_date - 700, 'verified', 'AIW diterbitkan PPAIW KUA dan sesuai data lahan.', v_actor, v_owner, now() - interval '660 days'),
    ('c6000000-0000-4000-8000-000000000004', v_org, w_kebun, 'sertifikat_wakaf', 'SW-3205-2024-0098', 'BPN Kabupaten Garut', current_date - 600, 'verified', 'Sertifikat wakaf atas nama nazhir telah terbit.', v_actor, v_owner, now() - interval '590 days'),
    ('c6000000-0000-4000-8000-000000000005', v_org, w_tanah, 'akta_ikrar_wakaf', 'AIW/KUA-CLY/2026/041', 'KUA Cileunyi', current_date - 18, 'pending', null, v_actor, null, null)
  on conflict (id) do nothing;

  insert into public.waqf_nazhir_assignments (id, organization_id, asset_id, contact_id, assignment_scope, start_date, status, created_by)
  values
    ('c7000000-0000-4000-8000-000000000001', v_org, w_uang, c_nazhir, 'Mengelola investasi wakaf uang dan penyaluran beasiswa.', current_date - 280, 'active', v_actor),
    ('c7000000-0000-4000-8000-000000000002', v_org, w_kebun, c_nazhir, 'Mengawasi kelompok tani, panen, dan distribusi hasil kebun.', current_date - 650, 'active', v_actor)
  on conflict (id) do nothing;

  insert into public.waqf_valuations (id, organization_id, asset_id, valuation_date, amount, currency, method, appraiser, notes, created_by)
  values ('c7100000-0000-4000-8000-000000000001', v_org, w_kebun, current_date - 60, 1250000000, 'IDR', 'independent_appraiser', 'KJPP Demo Rekan', 'Kenaikan nilai karena pohon kurma mulai berbuah produktif.', v_actor)
  on conflict (id) do nothing;

  insert into public.waqf_utilizations (id, organization_id, asset_id, utilization_type, beneficiary_contact_id, program_id, start_date, end_date, expected_benefit, status, created_by)
  values
    (util_uang, v_org, w_uang, 'education', null, null, current_date - 270, null, 'Imbal hasil investasi dialokasikan untuk beasiswa yatim per semester.', 'active', v_actor),
    (util_kebun, v_org, w_kebun, 'economic', b_mahmud, null, current_date - 640, null, 'Kelompok tani menggarap kebun; hasil panen dibagi untuk guru ngaji dan pondok tahfidz.', 'active', v_actor)
  on conflict (id) do nothing;

  insert into public.waqf_income_records (id, organization_id, asset_id, utilization_id, income_reference, income_type, amount, currency, received_at, payer_contact_id, notes, status, created_by)
  values
    (inc_uang, v_org, w_uang, util_uang, 'DEMO-WQF-INC-0001', 'profit_share', 9000000, 'IDR', now() - interval '40 days', null, 'Imbal hasil sukuk ritel dan deposito syariah semester I.', 'received', v_actor),
    (inc_kebun, v_org, w_kebun, util_kebun, 'DEMO-WQF-INC-0002', 'harvest', 18500000, 'IDR', now() - interval '30 days', null, 'Hasil panen kurma musim pertama setelah biaya operasional.', 'received', v_actor)
  on conflict (organization_id, income_reference) do nothing;

  insert into public.waqf_benefit_distributions (id, organization_id, asset_id, income_record_id, beneficiary_contact_id, program_id, distribution_reference, amount, currency, distributed_at, benefit_type, notes, status, created_by)
  values
    ('ca000000-0000-4000-8000-000000000001', v_org, w_uang, inc_uang, b_fauzan, null, 'DEMO-WQF-BEN-0001', 2500000, 'IDR', now() - interval '35 days', 'scholarship', 'Beasiswa semester ganjil untuk biaya sekolah dan buku.', 'completed', v_actor),
    ('ca000000-0000-4000-8000-000000000002', v_org, w_uang, inc_uang, b_aisyah, null, 'DEMO-WQF-BEN-0002', 3000000, 'IDR', now() - interval '35 days', 'scholarship', 'Beasiswa UKT semester 3 untuk mahasiswi yatim piatu.', 'completed', v_actor),
    ('ca000000-0000-4000-8000-000000000003', v_org, w_kebun, inc_kebun, b_mahmud, null, 'DEMO-WQF-BEN-0003', 1500000, 'IDR', now() - interval '25 days', 'cash', 'Insentif guru ngaji dari hasil panen kebun wakaf.', 'completed', v_actor),
    ('ca000000-0000-4000-8000-000000000004', v_org, w_kebun, inc_kebun, b_tahfidz, null, 'DEMO-WQF-BEN-0004', 4000000, 'IDR', now() - interval '25 days', 'goods', 'Bahan pangan santri dari hasil panen kebun wakaf.', 'completed', v_actor)
  on conflict (organization_id, distribution_reference) do nothing;

  insert into public.waqf_contributions (id, organization_id, asset_id, reference_number, wakif_contact_id, wakif_name, on_behalf_of, contribution_form, amount, currency, payment_method, received_at, pledge_confirmed, certificate_number, notes, status, reversal_reason, reversed_by, reversed_at, created_by)
  values
    ('cb000000-0000-4000-8000-000000000001', v_org, w_masjid, 'DEMO-WQF-SET-0001', c_hendra, 'Bpk. Hendra Wijaya', null, 'cash', 10000000, 'IDR', 'bank_transfer', now() - interval '28 days', true, null, 'Setoran pertama pembangunan masjid.', 'received', null, null, null, v_actor),
    ('cb000000-0000-4000-8000-000000000002', v_org, w_masjid, 'DEMO-WQF-SET-0002', c_rahmawati, 'Ibu Rahmawati', null, 'cash', 5000000, 'IDR', 'qris', now() - interval '21 days', true, null, null, 'received', null, null, null, v_actor),
    ('cb000000-0000-4000-8000-000000000003', v_org, w_masjid, 'DEMO-WQF-SET-0003', c_sulaiman, 'Keluarga Besar H. Sulaiman', 'Alm. H. Sulaiman bin Abdullah', 'cash', 25000000, 'IDR', 'bank_transfer', now() - interval '15 days', true, null, 'Wakaf atas nama almarhum ayah.', 'received', null, null, null, v_actor),
    ('cb000000-0000-4000-8000-000000000004', v_org, w_masjid, 'DEMO-WQF-SET-0004', null, 'Hamba Allah', null, 'cash', 2000000, 'IDR', 'cash', now() - interval '10 days', false, null, 'Kotak wakaf Jumat.', 'received', null, null, null, v_field),
    ('cb000000-0000-4000-8000-000000000005', v_org, w_masjid, 'DEMO-WQF-SET-0005', c_berkah, 'PT Berkah Pangan Nusantara', null, 'cash', 50000000, 'IDR', 'bank_transfer', now() - interval '7 days', true, null, 'Program CSR wakaf perusahaan.', 'received', null, null, null, v_actor),
    ('cb000000-0000-4000-8000-000000000006', v_org, w_masjid, 'DEMO-WQF-SET-0006', c_hendra, 'Bpk. Hendra Wijaya', null, 'cash', 1000000, 'IDR', 'bank_transfer', now() - interval '27 days', false, null, 'Tercatat ganda.', 'reversed', 'Setoran tercatat dua kali dari mutasi yang sama.', v_owner, now() - interval '26 days', v_actor),
    ('cb000000-0000-4000-8000-000000000007', v_org, w_uang, 'DEMO-WQF-SET-0007', c_rahmawati, 'Ibu Rahmawati', null, 'cash', 50000000, 'IDR', 'bank_transfer', now() - interval '300 days', true, 'SWU-2025-0012', 'Wakaf uang berjangka 5 tahun.', 'received', null, null, null, v_actor),
    ('cb000000-0000-4000-8000-000000000008', v_org, w_uang, 'DEMO-WQF-SET-0008', c_hendra, 'Bpk. Hendra Wijaya', null, 'cash', 100000000, 'IDR', 'bank_transfer', now() - interval '295 days', true, 'SWU-2025-0013', null, 'received', null, null, null, v_actor),
    ('cb000000-0000-4000-8000-000000000009', v_org, w_tanah, 'DEMO-WQF-SET-0009', c_sulaiman, 'Keluarga Besar H. Sulaiman', 'Alm. H. Sulaiman bin Abdullah', 'land', 350000000, 'IDR', 'in_kind', now() - interval '20 days', true, 'AIW/KUA-CLY/2026/041', 'Serah terima tanah 400 m² disaksikan KUA.', 'received', null, null, null, v_actor)
  on conflict (id) do nothing;

  insert into public.waqf_proposals (id, organization_id, reference_number, proposal_type, proposer_type, proposer_contact_id, title, description, asset_id, proposed_asset_type, requested_amount, currency, location_text, beneficiary_estimate, status, submitted_at, review_notes, reviewed_by, reviewed_at, converted_asset_id, converted_at, created_by, updated_by)
  values
    ('cc000000-0000-4000-8000-000000000001', v_org, 'DEMO-WQF-PRP-0001', 'waqf_project', 'institution', c_pesantren, 'Sumur Bor Wakaf Pesantren Nurul Huda', 'Pesantren kesulitan air bersih saat kemarau; diusulkan sumur bor 80 m beserta tandon untuk 300 santri dan warga.', null, 'equipment', 35000000, 'IDR', 'Kp. Cibatu, Garut', 300, 'submitted', now() - interval '4 days', null, null, null, null, null, v_field, v_field),
    ('cc000000-0000-4000-8000-000000000002', v_org, 'DEMO-WQF-PRP-0002', 'benefit_request', 'institution', c_masjid, 'Beasiswa Santri TPQ dari Hasil Kebun Wakaf', 'DKM memohon sebagian hasil panen kebun wakaf untuk beasiswa 20 santri TPQ dhuafa selama satu tahun.', w_kebun, null, 12000000, 'IDR', 'TPQ Al-Ikhlas Cibiru', 20, 'under_review', now() - interval '9 days', null, null, null, null, null, v_field, v_owner),
    ('cc000000-0000-4000-8000-000000000003', v_org, 'DEMO-WQF-PRP-0003', 'asset_offer', 'individual', c_hendra, 'Wakaf Ruko untuk Usaha Produktif', 'Calon wakif menawarkan satu unit ruko dua lantai untuk disewakan; hasil sewa untuk operasional dakwah.', null, 'building', 900000000, 'IDR', 'Jl. Ujungberung Raya No. 210, Bandung', null, 'approved', now() - interval '14 days', 'Lokasi strategis dan dokumen SHM lengkap; lanjut proses AIW.', v_owner, now() - interval '6 days', null, null, v_field, v_owner),
    ('cc000000-0000-4000-8000-000000000004', v_org, 'DEMO-WQF-PRP-0004', 'waqf_project', 'institution', c_masjid, 'Pembangunan Masjid & TPQ Al-Ikhlas', 'Usulan DKM untuk membangun masjid dua lantai dan ruang TPQ melalui wakaf patungan.', null, 'building', 750000000, 'IDR', 'Jl. Manisi No. 12, Cibiru', 150, 'converted', now() - interval '45 days', 'Disetujui rapat pengurus; dibuat aset wakaf melalui uang.', v_owner, now() - interval '40 days', w_masjid, now() - interval '40 days', v_field, v_owner),
    ('cc000000-0000-4000-8000-000000000005', v_org, 'DEMO-WQF-PRP-0005', 'benefit_request', 'individual', b_warsih, 'Permohonan Renovasi Rumah dari Wakaf Uang', 'Pemohon meminta dana renovasi atap rumah dari hasil wakaf uang pendidikan.', w_uang, null, 8000000, 'IDR', 'Cibiru Wetan', 2, 'rejected', now() - interval '12 days', 'Tidak sesuai peruntukan wakaf uang pendidikan; dialihkan ke program sosial.', v_owner, now() - interval '8 days', null, null, v_field, v_owner)
  on conflict (organization_id, reference_number) do nothing;

  -- ------------------------------------------------------------------
  -- Donasi barang (stok bertambah melalui movement in_kind_donation)
  -- ------------------------------------------------------------------
  v_inserted := null;
  insert into public.in_kind_donations (id, organization_id, reference_number, donor_contact_id, donor_name, donor_type, giving_type, program_id, waqf_asset_id, warehouse_id, received_at, estimated_total_value, currency, notes, created_by)
  values (d_berkah, v_org, 'DEMO-DNB-2026-0001', c_berkah, 'PT Berkah Pangan Nusantara', 'institution', 'csr', v_program_pangan, null, v_warehouse_main, now() - interval '11 days', 5270000, 'IDR', 'Donasi CSR sembako, diantar truk perusahaan.', v_actor)
  on conflict (organization_id, reference_number) do nothing returning id into v_inserted;
  if v_inserted is not null then
    perform pg_temp.demo_stock_in(v_org, d_berkah, 'cd100000-0000-4000-8000-000000000001', 'cd200000-0000-4000-8000-000000000001', v_product_rice, v_warehouse_main, 'DEMO-RICE-CSR26', current_date + 330, 50, 'paket', 75000, 'new', now() - interval '11 days', v_actor, 'Donasi barang DEMO-DNB-2026-0001 dari PT Berkah Pangan Nusantara');
    perform pg_temp.demo_stock_in(v_org, d_berkah, 'cd100000-0000-4000-8000-000000000002', 'cd200000-0000-4000-8000-000000000002', v_product_oil, v_warehouse_main, 'DEMO-OIL-CSR26', current_date + 270, 40, 'botol', 38000, 'new', now() - interval '11 days', v_actor, 'Donasi barang DEMO-DNB-2026-0001 dari PT Berkah Pangan Nusantara');
  end if;

  v_inserted := null;
  insert into public.in_kind_donations (id, organization_id, reference_number, donor_contact_id, donor_name, donor_type, giving_type, program_id, waqf_asset_id, warehouse_id, received_at, estimated_total_value, currency, notes, created_by)
  values (d_hendra, v_org, 'DEMO-DNB-2026-0002', c_hendra, 'Bpk. Hendra Wijaya', 'individual', 'sedekah', null, null, v_warehouse_field, now() - interval '9 days', 3150000, 'IDR', 'Pakaian layak pakai sudah disortir dan alat tulis baru.', v_field)
  on conflict (organization_id, reference_number) do nothing returning id into v_inserted;
  if v_inserted is not null then
    perform pg_temp.demo_stock_in(v_org, d_hendra, 'cd100000-0000-4000-8000-000000000003', 'cd200000-0000-4000-8000-000000000003', v_product_clothes, v_warehouse_field, null, null, 80, 'pcs', 15000, 'good_used', now() - interval '9 days', v_field, 'Donasi barang DEMO-DNB-2026-0002 dari Bpk. Hendra Wijaya');
    perform pg_temp.demo_stock_in(v_org, d_hendra, 'cd100000-0000-4000-8000-000000000004', 'cd200000-0000-4000-8000-000000000004', v_product_stationery, v_warehouse_field, null, null, 30, 'paket', 65000, 'new', now() - interval '9 days', v_field, 'Donasi barang DEMO-DNB-2026-0002 dari Bpk. Hendra Wijaya');
  end if;

  v_inserted := null;
  insert into public.in_kind_donations (id, organization_id, reference_number, donor_contact_id, donor_name, donor_type, giving_type, program_id, waqf_asset_id, warehouse_id, received_at, estimated_total_value, currency, notes, created_by)
  values (d_anon, v_org, 'DEMO-DNB-2026-0003', null, 'Hamba Allah', 'anonymous', 'zakat', v_program_pangan, null, v_warehouse_main, now() - interval '5 days', 1500000, 'IDR', 'Zakat dalam bentuk beras diantar langsung.', v_field)
  on conflict (organization_id, reference_number) do nothing returning id into v_inserted;
  if v_inserted is not null then
    perform pg_temp.demo_stock_in(v_org, d_anon, 'cd100000-0000-4000-8000-000000000005', 'cd200000-0000-4000-8000-000000000005', v_product_rice, v_warehouse_main, 'DEMO-RICE-ZKT26', current_date + 300, 20, 'paket', 75000, 'new', now() - interval '5 days', v_field, 'Donasi barang DEMO-DNB-2026-0003 dari Hamba Allah');
  end if;

  v_inserted := null;
  insert into public.in_kind_donations (id, organization_id, reference_number, donor_contact_id, donor_name, donor_type, giving_type, program_id, waqf_asset_id, warehouse_id, received_at, estimated_total_value, currency, notes, created_by)
  values (d_rahmawati, v_org, 'DEMO-DNB-2026-0004', c_rahmawati, 'Ibu Rahmawati', 'individual', 'waqf', null, w_tanah, v_warehouse_field, now() - interval '3 days', 8500000, 'IDR', 'Wakaf 100 mushaf untuk rumah tahfidz Cileunyi.', v_field)
  on conflict (organization_id, reference_number) do nothing returning id into v_inserted;
  if v_inserted is not null then
    perform pg_temp.demo_stock_in(v_org, d_rahmawati, 'cd100000-0000-4000-8000-000000000006', 'cd200000-0000-4000-8000-000000000006', v_product_quran, v_warehouse_field, null, null, 100, 'eksemplar', 85000, 'new', now() - interval '3 days', v_field, 'Donasi barang DEMO-DNB-2026-0004 dari Ibu Rahmawati');
  end if;

  raise notice 'Data contoh penghimpunan, wakaf, mitra, dan penerima manfaat siap untuk organisasi %', v_org;
end $$;
