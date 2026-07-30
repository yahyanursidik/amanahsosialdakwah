begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('11000000-0000-0000-0000-000000000001', 'application-user-a', 'Application User A', 'application-a@example.test'),
  ('11000000-0000-0000-0000-000000000002', 'application-user-b', 'Application User B', 'application-b@example.test'),
  ('11000000-0000-0000-0000-000000000003', 'application-user-without-permission', 'No Permission User', 'no-permission@example.test');

insert into public.organizations (id, code, name, type)
values
  ('21000000-0000-0000-0000-000000000001', 'APP-ORG-A', 'Application Org A', 'manager'),
  ('21000000-0000-0000-0000-000000000002', 'APP-ORG-B', 'Application Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'active'),
  ('31000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'active'),
  ('31000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (
  organization_id,
  membership_id,
  role_id,
  created_by
)
select
  membership.organization_id,
  membership.id,
  role.id,
  membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.programs (
  id,
  organization_id,
  code,
  name,
  target_beneficiary_type,
  fund_type,
  status,
  created_by
)
values
  ('41000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'PROGRAM-A', 'Program A', 'individual', 'general', 'active', '11000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'PROGRAM-B', 'Program B', 'individual', 'general', 'active', '11000000-0000-0000-0000-000000000002');

insert into public.crm_contacts (
  id,
  organization_id,
  contact_type,
  display_name,
  normalized_name,
  status,
  created_by
)
values
  ('51000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'person', 'Beneficiary A', 'beneficiary a', 'active', '11000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'person', 'Beneficiary B', 'beneficiary b', 'active', '11000000-0000-0000-0000-000000000002');

insert into public.aid_applications (
  id,
  organization_id,
  reference_number,
  program_id,
  applicant_contact_id,
  channel,
  requested_support,
  status,
  created_by
)
values
  ('61000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'APP-TEST-A', '41000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'field', 'Kebutuhan pengujian tenant A', 'draft', '11000000-0000-0000-0000-000000000001'),
  ('61000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'APP-TEST-B', '41000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002', 'field', 'Kebutuhan pengujian tenant B', 'draft', '11000000-0000-0000-0000-000000000002');

select set_config('app.current_profile_id', '11000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '21000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.aid_applications;

  if visible_count <> 1 then
    raise exception 'Expected one application for tenant A, got %', visible_count;
  end if;

  if exists (
    select 1
    from public.aid_applications
    where id = '61000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B application';
  end if;

  begin
    delete from public.aid_applications
    where id = '61000000-0000-0000-0000-000000000001';
    raise exception 'Hard delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '11000000-0000-0000-0000-000000000003', true);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.aid_applications;

  if visible_count <> 0 then
    raise exception 'User without applications.read can see % application(s)', visible_count;
  end if;
end;
$$;

rollback;
