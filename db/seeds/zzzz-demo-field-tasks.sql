-- Data contoh to-do tugas lapangan berceklis. Idempoten (ID tetap) dan hanya
-- menambah data pada organisasi IHSANUL-ADAB. Membutuhkan migration 0035 dan
-- 0036, serta seed zz-demo-data.sql dan zzz-demo-giving-waqf-beneficiaries.sql.
--
-- Program "Paket Pangan Keluarga Rentan" dijadikan contoh program yang
-- menyalurkan dana dan barang sekaligus dalam satu kunjungan.

create or replace function pg_temp.demo_task_items(
  p_org uuid, p_task uuid, p_labels text[], p_kinds text[], p_required boolean[],
  p_done_count integer, p_actor uuid
) returns void language plpgsql as $$
begin
  for i in 1..cardinality(p_labels) loop
    insert into public.field_task_items (
      organization_id, task_id, sequence_number, item_kind, label, is_required,
      is_done, done_at, done_by
    ) values (
      p_org, p_task, i, p_kinds[i], p_labels[i], p_required[i],
      i <= p_done_count,
      case when i <= p_done_count then now() - interval '1 hour' + (i * interval '5 minutes') end,
      case when i <= p_done_count then p_actor end
    )
    on conflict (task_id, sequence_number) do nothing;
  end loop;
end $$;

do $$
declare
  v_org uuid;
  v_actor uuid;
  v_field uuid;

  v_program_pangan uuid := '20000000-0000-4000-8000-000000000001';
  v_program_kafalah uuid := '20000000-0000-4000-8000-000000000002';
  v_product_rice uuid := '80000000-0000-4000-8000-000000000001';
  v_product_oil uuid := '80000000-0000-4000-8000-000000000002';

  b_siti uuid := 'c1000000-0000-4000-8000-000000000011';
  b_fauzan uuid := 'c1000000-0000-4000-8000-000000000012';
  b_karta uuid := 'c1000000-0000-4000-8000-000000000013';
  b_ujang uuid := 'c1000000-0000-4000-8000-000000000014';
  b_warsih uuid := 'c1000000-0000-4000-8000-000000000018';

  t_siti uuid := 'c6000000-0000-4000-8000-000000000001';
  t_warsih uuid := 'c6000000-0000-4000-8000-000000000002';
  t_karta uuid := 'c6000000-0000-4000-8000-000000000003';
  t_fauzan uuid := 'c6000000-0000-4000-8000-000000000004';
  t_ujang uuid := 'c6000000-0000-4000-8000-000000000005';
begin
  select id into v_org from public.organizations where code = 'IHSANUL-ADAB';
  if v_org is null then
    raise exception 'Organisasi IHSANUL-ADAB belum ada. Jalankan seed zz-demo-data.sql terlebih dahulu.';
  end if;
  if not exists (select 1 from public.crm_contacts where id = b_siti and organization_id = v_org) then
    raise exception 'Penerima demo belum ada. Jalankan zzz-demo-giving-waqf-beneficiaries.sql terlebih dahulu.';
  end if;

  select coalesce(
    (select id from public.profiles where email = 'admin@ihsanuladab.or.id' limit 1),
    '10000000-0000-4000-8000-000000000012'::uuid
  ) into v_actor;
  select coalesce(
    (select id from public.profiles where auth_user_id = 'demo-field-auth'),
    v_actor
  ) into v_field;

  -- ------------------------------------------------------------------
  -- Program pangan: dana + barang (hanya bila masih konfigurasi awal)
  -- ------------------------------------------------------------------
  update public.programs
  set support_modes = array['cash', 'in_kind']::text[],
      cash_budget_amount = 60000000,
      goods_budget_amount = 90000000,
      logistics_budget_amount = 0,
      budget_amount = 150000000,
      updated_at = now()
  where id = v_program_pangan and organization_id = v_org
    and support_modes = array['cash']::text[]
    and goods_budget_amount = 0
    and budget_amount = 150000000;

  insert into public.program_goods_plan_items (
    organization_id, program_id, product_id, quantity, unit, unit_value, notes, sort_order, created_by
  )
  select v_org, v_program_pangan, product_id, quantity, unit, unit_value, notes, sort_order, v_actor
  from (values
    (v_product_rice, 150::numeric, 'paket', 450000::numeric, '1 paket beras 5 kg per keluarga per bulan', 1),
    (v_product_oil, 150::numeric, 'botol', 150000::numeric, '1 botol minyak 2 L per keluarga per bulan', 2)
  ) as plan(product_id, quantity, unit, unit_value, notes, sort_order)
  where exists (
    select 1 from public.programs
    where id = v_program_pangan and organization_id = v_org and 'in_kind' = any(support_modes)
  )
  on conflict (program_id, product_id) do nothing;

  -- ------------------------------------------------------------------
  -- Tugas lapangan untuk petugas demo
  -- ------------------------------------------------------------------
  insert into public.field_tasks (
    id, organization_id, reference_number, task_type, title, instructions, priority,
    due_date, status, program_id, beneficiary_contact_id, support_modes, cash_amount,
    goods_package_count, goods_summary, location_text, assigned_profile_id,
    started_at, completed_at, completion_notes, created_by, updated_by
  ) values
    (t_siti, v_org, 'TGS-DEMO-0001', 'distribution', 'Salurkan dana & barang — Ibu Siti Aminah',
     'Serahkan santunan tunai dan paket pangan dalam satu kunjungan. Minta tanda tangan di kartu penerima.',
     'high', current_date, 'todo', v_program_pangan, b_siti, array['cash', 'in_kind'], 300000,
     1, 'beras 5 kg, minyak 2 L', 'Gg. Saluyu RT 04/07 No. 3, Cipadung Kulon, Panyileukan, Bandung',
     v_field, null, null, null, v_actor, v_actor),
    (t_warsih, v_org, 'TGS-DEMO-0002', 'distribution', 'Salurkan barang — Ibu Warsih',
     'Penerima lansia dan sedang cuci darah; serahkan di rumah, jangan diminta datang ke posko.',
     'urgent', current_date, 'in_progress', v_program_pangan, b_warsih, array['in_kind'], null,
     2, 'beras 5 kg, minyak 2 L', 'Kp. Babakan Sari RT 02/05, Cibiru Wetan, Cileunyi, Bandung',
     v_field, now() - interval '1 hour', null, null, v_actor, v_actor),
    (t_karta, v_org, 'TGS-DEMO-0003', 'verification', 'Verifikasi Bapak Karta Wijaya',
     'Pastikan kondisi disabilitas dan siapa yang merawat sehari-hari.',
     'normal', current_date + 2, 'todo', null, b_karta, '{}', null,
     null, null, 'Kp. Cisurupan RT 01/02, Cipadung Wetan, Panyileukan, Bandung',
     v_field, null, null, null, v_actor, v_actor),
    (t_fauzan, v_org, 'TGS-DEMO-0004', 'distribution', 'Salurkan dana — Ahmad Fauzan',
     'Santunan kafalah bulan ini diserahkan melalui ibunya (Ibu Siti Aminah).',
     'normal', current_date + 1, 'todo', v_program_kafalah, b_fauzan, array['cash'], 750000,
     null, null, 'Gg. Saluyu RT 04/07 No. 3, Cipadung Kulon, Panyileukan, Bandung',
     v_field, null, null, null, v_actor, v_actor),
    (t_ujang, v_org, 'TGS-DEMO-0005', 'monitoring', 'Pantau Keluarga Ujang Suryana',
     'Cek pemanfaatan bantuan pascabanjir dan kebutuhan perbaikan rumah.',
     'normal', current_date - 1, 'done', v_program_pangan, b_ujang, '{}', null,
     null, null, 'Hunian sementara Posko Tarogong, Garut',
     v_field, now() - interval '1 day 2 hours', now() - interval '1 day',
     'Bantuan dipakai untuk kebutuhan pokok; keluarga butuh bahan bangunan untuk atap.', v_actor, v_actor)
  on conflict (id) do nothing;

  perform pg_temp.demo_task_items(v_org, t_siti,
    array['Pastikan identitas penerima sesuai (KTP/KK)', 'Serahkan dana Rp300.000 dan hitung bersama penerima', 'Serahkan 1 paket (beras 5 kg, minyak 2 L) dan cek kelengkapannya', 'Minta konfirmasi / tanda terima dari penerima', 'Ambil foto serah terima', 'Ambil lokasi GPS', 'Kirim laporan lapangan'],
    array['check', 'handover_cash', 'handover_goods', 'confirmation', 'photo', 'gps', 'report'],
    array[true, true, true, true, true, false, true], 0, v_field);
  perform pg_temp.demo_task_items(v_org, t_warsih,
    array['Pastikan identitas penerima sesuai (KTP/KK)', 'Serahkan 2 paket (beras 5 kg, minyak 2 L) dan cek kelengkapannya', 'Minta konfirmasi / tanda terima dari penerima', 'Ambil foto serah terima', 'Ambil lokasi GPS', 'Kirim laporan lapangan'],
    array['check', 'handover_goods', 'confirmation', 'photo', 'gps', 'report'],
    array[true, true, true, true, false, true], 1, v_field);
  perform pg_temp.demo_task_items(v_org, t_karta,
    array['Temui penerima atau anggota keluarga', 'Cocokkan identitas dengan KTP/KK', 'Periksa kondisi tempat tinggal dan tanggungan', 'Konfirmasi ke tetangga atau ketua RT', 'Ambil foto kondisi rumah', 'Ambil lokasi GPS', 'Tanyakan kebutuhan kursi roda', 'Kirim laporan lapangan'],
    array['check', 'check', 'check', 'check', 'photo', 'gps', 'check', 'report'],
    array[true, true, true, false, true, false, true, true], 0, v_field);
  perform pg_temp.demo_task_items(v_org, t_fauzan,
    array['Pastikan identitas penerima sesuai (KTP/KK)', 'Serahkan dana Rp750.000 dan hitung bersama penerima', 'Minta konfirmasi / tanda terima dari penerima', 'Ambil foto serah terima', 'Ambil lokasi GPS', 'Kirim laporan lapangan'],
    array['check', 'handover_cash', 'confirmation', 'photo', 'gps', 'report'],
    array[true, true, true, true, false, true], 0, v_field);
  perform pg_temp.demo_task_items(v_org, t_ujang,
    array['Kunjungi penerima', 'Tanyakan pemanfaatan bantuan', 'Catat kondisi terkini dan kebutuhan lanjutan', 'Ambil foto kondisi', 'Kirim laporan lapangan'],
    array['check', 'check', 'check', 'photo', 'report'],
    array[true, true, true, false, true], 5, v_field);

  raise notice 'Data contoh tugas lapangan siap untuk organisasi %', v_org;
end $$;
