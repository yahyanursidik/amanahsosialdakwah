begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('12000000-0000-0000-0000-000000000001', 'partner-user-a', 'Partner User A', 'partner-a@example.test'),
  ('12000000-0000-0000-0000-000000000002', 'partner-user-b', 'Partner User B', 'partner-b@example.test');

insert into public.organizations (id, code, name, type)
values
  ('22000000-0000-0000-0000-000000000001', 'PARTNER-ORG-A', 'Partner Org A', 'manager'),
  ('22000000-0000-0000-0000-000000000002', 'PARTNER-ORG-B', 'Partner Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'active'),
  ('32000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '32000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.crm_contacts (
  id, organization_id, contact_type, display_name, normalized_name, status, created_by
)
values
  ('52000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'institution', 'Mitra A', 'mitra a', 'active', '12000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'person', 'Pengaju B', 'pengaju b', 'active', '12000000-0000-0000-0000-000000000002');

insert into public.crm_contact_roles (
  organization_id, contact_id, role_type, status, created_by
)
values
  ('22000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'distribution_partner', 'active', '12000000-0000-0000-0000-000000000001'),
  ('22000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'applicant', 'active', '12000000-0000-0000-0000-000000000002');

select set_config('app.current_profile_id', '12000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '22000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.crm_contact_roles
  where role_type in ('distribution_partner', 'applicant');

  if visible_count <> 1 then
    raise exception 'Expected one visible partner/applicant role for tenant A, got %', visible_count;
  end if;

  if exists (
    select 1
    from public.crm_contact_roles
    where contact_id = '52000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B applicant role';
  end if;
end;
$$;

rollback;
