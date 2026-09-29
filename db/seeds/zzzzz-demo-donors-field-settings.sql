-- Data contoh pengelolaan donatur & wakif serta template ceklis lapangan.
-- Idempoten dan hanya menambah data pada organisasi IHSANUL-ADAB.
-- Membutuhkan migration 0037 & 0038 serta seed zzz-demo-giving-waqf-beneficiaries.sql.

do $$
declare
  v_org uuid;
  v_actor uuid;
  v_owner uuid;
  v_template uuid := 'c7000000-0000-4000-8000-000000000001';

  c_hendra uuid := 'c1000000-0000-4000-8000-000000000001';
  c_berkah uuid := 'c1000000-0000-4000-8000-000000000002';
  c_rahmawati uuid := 'c1000000-0000-4000-8000-000000000003';
  c_sulaiman uuid := 'c1000000-0000-4000-8000-000000000004';
begin
  select id into v_org from public.organizations where code = 'IHSANUL-ADAB';
  if v_org is null then
    raise exception 'Organisasi IHSANUL-ADAB belum ada.';
  end if;
  if not exists (select 1 from public.crm_contacts where id = c_hendra and organization_id = v_org) then
    raise exception 'Kontak demo belum ada. Jalankan zzz-demo-giving-waqf-beneficiaries.sql terlebih dahulu.';
  end if;

  select coalesce(
    (select id from public.profiles where email = 'admin@ihsanuladab.or.id' limit 1),
    '10000000-0000-4000-8000-000000000012'::uuid
  ) into v_actor;
  select coalesce(
    (select id from public.profiles where auth_user_id = 'demo-owner-auth'),
    v_actor
  ) into v_owner;

  -- ------------------------------------------------------------------
  -- Profil relasi donatur & wakif
  -- ------------------------------------------------------------------
  insert into public.crm_donor_profiles (
    organization_id, contact_id, segment, acquisition_source, preferred_channel,
    giving_interests, recurring_amount, recurring_frequency, recurring_day,
    receipt_preference, report_preference, publish_name, relationship_manager_id,
    notes, created_by, updated_by
  ) values
    (v_org, c_hendra, 'major', 'event', 'whatsapp', array['wakaf','education','sedekah'],
     500000, 'monthly', 5, 'whatsapp', 'quarterly', true, v_actor,
     'Aktif di kajian Ahad pagi. Lebih suka dihubungi setelah Isya.', v_actor, v_actor),
    (v_org, c_berkah, 'corporate', 'partner', 'email', array['in_kind','emergency'],
     null, 'none', null, 'email', 'per_gift', true, v_owner,
     'Program CSR pangan; laporan resmi dikirim ke divisi CSR dengan kop surat.', v_actor, v_actor),
    (v_org, c_rahmawati, 'regular', 'referral', 'whatsapp', array['wakaf','dakwah'],
     250000, 'monthly', 25, 'whatsapp', 'monthly', false, v_actor,
     'Ingin nama tidak dipublikasikan (hamba Allah).', v_actor, v_actor),
    (v_org, c_sulaiman, 'major', 'walk_in', 'phone', array['wakaf'],
     null, 'none', null, 'print', 'yearly', true, v_owner,
     'Wakaf atas nama almarhum H. Sulaiman; koordinasi melalui putra sulung.', v_actor, v_actor)
  on conflict (contact_id, organization_id) do nothing;

  insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, created_by)
  select v_org, contact_id, 'donor', 'active', v_actor
  from unnest(array[c_hendra, c_berkah, c_rahmawati, c_sulaiman]) as contact_id
  on conflict (organization_id, contact_id, role_type) do nothing;

  -- ------------------------------------------------------------------
  -- Riwayat komunikasi & tindak lanjut
  -- ------------------------------------------------------------------
  insert into public.crm_interactions (
    id, organization_id, contact_id, interaction_type, direction, occurred_at, summary,
    follow_up_note, follow_up_at, follow_up_status, follow_up_assigned_to, created_by
  ) values
    ('c8100000-0000-4000-8000-000000000001', v_org, c_hendra, 'whatsapp', 'outbound', now() - interval '12 days',
     'Mengirim laporan pemanfaatan wakaf produktif kuartal ini dan ucapan terima kasih.',
     'Tawarkan wakaf sumur untuk pesantren di Garut', now() + interval '2 days', 'open', v_actor, v_actor),
    ('c8100000-0000-4000-8000-000000000002', v_org, c_berkah, 'meeting', 'outbound', now() - interval '20 days',
     'Rapat evaluasi CSR pangan; mitra tertarik lanjut program Ramadhan.',
     'Kirim proposal paket Ramadhan 500 keluarga', now() - interval '1 day', 'open', v_owner, v_actor),
    ('c8100000-0000-4000-8000-000000000003', v_org, c_rahmawati, 'call', 'inbound', now() - interval '5 days',
     'Menanyakan sertifikat wakaf mushaf; sudah dijelaskan jadwal penerbitan.',
     null, null, 'none', null, v_actor),
    ('c8100000-0000-4000-8000-000000000004', v_org, c_sulaiman, 'visit', 'outbound', now() - interval '40 days',
     'Silaturahmi keluarga wakif tanah; menyerahkan foto perkembangan lokasi.',
     'Kirim laporan tahunan wakaf tanah', now() - interval '10 days', 'done', v_actor, v_actor)
  on conflict (id) do nothing;

  update public.crm_interactions
  set follow_up_done_at = now() - interval '9 days'
  where id = 'c8100000-0000-4000-8000-000000000004' and follow_up_done_at is null;

  -- ------------------------------------------------------------------
  -- Contoh template ceklis khusus (tidak menjadi bawaan)
  -- ------------------------------------------------------------------
  insert into public.field_checklist_templates (
    id, organization_id, name, description, task_type, is_default, created_by, updated_by
  ) values (
    v_template, v_org, 'Penyaluran sembako Ramadhan',
    'Contoh template khusus: salam, amplop, paket, dan foto bersama.',
    'distribution', false, v_actor, v_actor
  )
  on conflict (id) do nothing;

  insert into public.field_checklist_template_items (
    organization_id, template_id, sequence_number, item_kind, label, hint, is_required, applies_to
  ) values
    (v_org, v_template, 1, 'check', 'Ucapkan salam & perkenalkan diri pada {penerima}', 'Tunjukkan ID card lembaga', true, 'always'),
    (v_org, v_template, 2, 'handover_cash', 'Serahkan amplop {nominal}', null, true, 'cash'),
    (v_org, v_template, 3, 'handover_goods', 'Serahkan {paket} ({barang})', 'Cek tanggal kedaluwarsa sebelum diserahkan', true, 'in_kind'),
    (v_org, v_template, 4, 'confirmation', 'Minta tanda tangan kartu penerima', null, true, 'always'),
    (v_org, v_template, 5, 'photo', 'Foto bersama penerima', 'Minta izin sebelum memotret', true, 'always')
  on conflict (template_id, sequence_number) do nothing;

  raise notice 'Data contoh donatur & template lapangan siap untuk organisasi %', v_org;
end $$;
