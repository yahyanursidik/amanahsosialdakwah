begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('1c000000-0000-0000-0000-000000000001', 'evidence-user-a', 'Evidence User A', 'evidence-a@example.test'),
  ('1c000000-0000-0000-0000-000000000002', 'evidence-user-b', 'Evidence User B', 'evidence-b@example.test'),
  ('1c000000-0000-0000-0000-000000000003', 'evidence-no-permission', 'Evidence No Permission', 'evidence-none@example.test');
insert into public.organizations (id, code, name, type) values
  ('2c000000-0000-0000-0000-000000000001', 'EVD-ORG-A', 'Evidence Org A', 'manager'),
  ('2c000000-0000-0000-0000-000000000002', 'EVD-ORG-B', 'Evidence Org B', 'manager');
insert into public.memberships (id, organization_id, profile_id, status) values
  ('3c000000-0000-0000-0000-000000000001', '2c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'active'),
  ('3c000000-0000-0000-0000-000000000002', '2c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'active'),
  ('3c000000-0000-0000-0000-000000000003', '2c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000003', 'active');
insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership cross join public.roles role
where membership.id in ('3c000000-0000-0000-0000-000000000001', '3c000000-0000-0000-0000-000000000002')
  and role.organization_id is null and role.key = 'organization_owner';

insert into public.crm_contacts (id, organization_id, contact_type, display_name, normalized_name, status, created_by) values
  ('4c000000-0000-0000-0000-000000000001', '2c000000-0000-0000-0000-000000000001', 'person', 'Evidence Contact A', 'evidence contact a', 'active', '1c000000-0000-0000-0000-000000000001'),
  ('4c000000-0000-0000-0000-000000000002', '2c000000-0000-0000-0000-000000000002', 'person', 'Evidence Contact B', 'evidence contact b', 'active', '1c000000-0000-0000-0000-000000000002');

insert into public.evidence_files (id, organization_id, logical_file_id, entity_type, entity_id, classification, purpose, original_file_name, safe_file_name, object_key, storage_bucket, mime_type, size_bytes, status, confirmed_by, confirmed_at, created_by) values
  ('5c000000-0000-0000-0000-000000000001', '2c000000-0000-0000-0000-000000000001', '6c000000-0000-0000-0000-000000000001', 'crm_contact', '4c000000-0000-0000-0000-000000000001', 'internal', 'Bukti tenant A', 'bukti-a.pdf', 'bukti-a.pdf', 'organizations/a/file-a.pdf', 'private-test', 'application/pdf', 100, 'available', '1c000000-0000-0000-0000-000000000001', now(), '1c000000-0000-0000-0000-000000000001'),
  ('5c000000-0000-0000-0000-000000000002', '2c000000-0000-0000-0000-000000000002', '6c000000-0000-0000-0000-000000000002', 'crm_contact', '4c000000-0000-0000-0000-000000000002', 'restricted', 'Bukti tenant B', 'bukti-b.pdf', 'bukti-b.pdf', 'organizations/b/file-b.pdf', 'private-test', 'application/pdf', 100, 'available', '1c000000-0000-0000-0000-000000000002', now(), '1c000000-0000-0000-0000-000000000002');
insert into public.evidence_access_events (id, organization_id, evidence_file_id, action, actor_profile_id) values
  ('7c000000-0000-0000-0000-000000000001', '2c000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000001', 'upload_confirmed', '1c000000-0000-0000-0000-000000000001');

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.evidence_files (organization_id, previous_version_id, entity_type, entity_id, classification, purpose, original_file_name, safe_file_name, object_key, storage_bucket, mime_type, size_bytes, created_by)
    values ('2c000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000002', 'crm_contact', '4c000000-0000-0000-0000-000000000001', 'internal', 'Cross tenant', 'cross.pdf', 'cross.pdf', 'cross/file.pdf', 'private-test', 'application/pdf', 100, '1c000000-0000-0000-0000-000000000001');
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'Cross-tenant evidence version unexpectedly succeeded'; end if;

  blocked := false;
  begin
    update public.evidence_access_events set metadata = '{"tampered":true}' where id = '7c000000-0000-0000-0000-000000000001';
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Evidence access event mutation unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id', '1c000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '2c000000-0000-0000-0000-000000000001', true);
set local role app_runtime;
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.evidence_files;
  if visible_count <> 1 then raise exception 'Expected one evidence file for tenant A, got %', visible_count; end if;
  if exists (select 1 from public.evidence_files where id = '5c000000-0000-0000-0000-000000000002') then raise exception 'Tenant A can read tenant B evidence'; end if;
end;
$$;

select set_config('app.current_profile_id', '1c000000-0000-0000-0000-000000000003', true);
do $$ begin
  if exists (select 1 from public.evidence_files) then raise exception 'User without evidence permission can read files'; end if;
end $$;

rollback;
