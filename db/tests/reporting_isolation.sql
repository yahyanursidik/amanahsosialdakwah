begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('1b000000-0000-0000-0000-000000000001', 'report-user-a', 'Report User A', 'report-a@example.test'),
  ('1b000000-0000-0000-0000-000000000002', 'report-user-b', 'Report User B', 'report-b@example.test'),
  ('1b000000-0000-0000-0000-000000000003', 'report-field-user', 'Report Field User', 'report-field@example.test');

insert into public.organizations (id, code, name, type) values
  ('2b000000-0000-0000-0000-000000000001', 'RPT-ORG-A', 'Report Org A', 'manager'),
  ('2b000000-0000-0000-0000-000000000002', 'RPT-ORG-B', 'Report Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status) values
  ('3b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'active'),
  ('3b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', 'active'),
  ('3b000000-0000-0000-0000-000000000003', '2b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
join public.roles role on role.organization_id is null
where (membership.id in ('3b000000-0000-0000-0000-000000000001', '3b000000-0000-0000-0000-000000000002') and role.key = 'organization_owner')
   or (membership.id = '3b000000-0000-0000-0000-000000000003' and role.key = 'field_officer');

insert into public.programs (id, organization_id, code, name, target_beneficiary_type, fund_type, status, created_by) values
  ('4b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'REPORT-A', 'Report Program A', 'individual', 'general', 'active', '1b000000-0000-0000-0000-000000000001'),
  ('4b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'REPORT-B', 'Report Program B', 'individual', 'general', 'active', '1b000000-0000-0000-0000-000000000002');

select set_config('app.current_profile_id', '1b000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '2b000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare visible_count integer;
begin
  if not private.has_permission('2b000000-0000-0000-0000-000000000001', 'reports.read') then
    raise exception 'Organization owner is missing reports.read';
  end if;
  select count(*) into visible_count from public.programs where status = 'active';
  if visible_count <> 1 then
    raise exception 'Report aggregate expected one tenant program, got %', visible_count;
  end if;
  if exists (select 1 from public.programs where id = '4b000000-0000-0000-0000-000000000002') then
    raise exception 'Report context can read another tenant program';
  end if;
end;
$$;

select set_config('app.current_profile_id', '1b000000-0000-0000-0000-000000000003', true);
do $$
begin
  if private.has_permission('2b000000-0000-0000-0000-000000000001', 'reports.read') then
    raise exception 'Field officer unexpectedly received reports.read';
  end if;
end;
$$;

rollback;
