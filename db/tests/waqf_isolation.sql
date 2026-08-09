begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('19000000-0000-0000-0000-000000000001', 'waqf-user-a', 'Waqf User A', 'waqf-a@example.test'),
  ('19000000-0000-0000-0000-000000000002', 'waqf-user-b', 'Waqf User B', 'waqf-b@example.test'),
  ('19000000-0000-0000-0000-000000000003', 'waqf-user-none', 'Waqf No Permission', 'waqf-none@example.test');

insert into public.organizations (id, code, name, type) values
  ('29000000-0000-0000-0000-000000000001', 'WQF-ORG-A', 'Waqf Org A', 'manager'),
  ('29000000-0000-0000-0000-000000000002', 'WQF-ORG-B', 'Waqf Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status) values
  ('39000000-0000-0000-0000-000000000001', '29000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 'active'),
  ('39000000-0000-0000-0000-000000000002', '29000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000002', 'active'),
  ('39000000-0000-0000-0000-000000000003', '29000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in ('39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000002')
  and role.organization_id is null and role.key = 'organization_owner';

insert into public.crm_contacts (id, organization_id, contact_type, display_name, normalized_name, status, created_by) values
  ('59000000-0000-0000-0000-000000000001', '29000000-0000-0000-0000-000000000001', 'person', 'Wakif A', 'wakif a', 'active', '19000000-0000-0000-0000-000000000001'),
  ('59000000-0000-0000-0000-000000000002', '29000000-0000-0000-0000-000000000002', 'person', 'Wakif B', 'wakif b', 'active', '19000000-0000-0000-0000-000000000002');

insert into public.waqf_assets (id, organization_id, reference_number, asset_type, name, description, donor_contact_id, created_by, updated_by) values
  ('69000000-0000-0000-0000-000000000001', '29000000-0000-0000-0000-000000000001', 'WQF-AST-A', 'land', 'Tanah Wakaf A', 'Tanah wakaf tenant A untuk pendidikan.', '59000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001'),
  ('69000000-0000-0000-0000-000000000002', '29000000-0000-0000-0000-000000000002', 'WQF-AST-B', 'building', 'Gedung Wakaf B', 'Gedung wakaf tenant B untuk layanan sosial.', '59000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000002');

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.waqf_assets (organization_id, reference_number, asset_type, name, description, donor_contact_id, created_by)
    values ('29000000-0000-0000-0000-000000000001', 'WQF-CROSS', 'land', 'Cross Tenant', 'Aset wakaf lintas tenant yang harus gagal.', '59000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000001');
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'Cross-tenant Waqf asset unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id', '19000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '29000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.waqf_assets;
  if visible_count <> 1 then raise exception 'Expected one Waqf asset for tenant A, got %', visible_count; end if;
  if exists (select 1 from public.waqf_assets where id = '69000000-0000-0000-0000-000000000002') then
    raise exception 'Tenant A can read tenant B Waqf asset';
  end if;
  begin
    delete from public.waqf_assets where id = '69000000-0000-0000-0000-000000000001';
    if not exists (select 1 from public.waqf_assets where id = '69000000-0000-0000-0000-000000000001') then
      raise exception 'Waqf hard delete unexpectedly succeeded';
    end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '19000000-0000-0000-0000-000000000003', true);
do $$ begin
  if exists (select 1 from public.waqf_assets) then raise exception 'User without waqf.read can read Waqf'; end if;
end; $$;

rollback;
