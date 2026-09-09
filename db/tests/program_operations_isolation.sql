begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('13100000-0000-0000-0000-000000000001', 'operations-user-a', 'Operations User A', 'operations-a@example.test'),
  ('13100000-0000-0000-0000-000000000002', 'operations-user-b', 'Operations User B', 'operations-b@example.test');
insert into public.organizations (id, code, name, type) values
  ('23100000-0000-0000-0000-000000000001', 'OPS-ORG-A', 'Operations Org A', 'manager'),
  ('23100000-0000-0000-0000-000000000002', 'OPS-ORG-B', 'Operations Org B', 'manager');
insert into public.memberships (id, organization_id, profile_id, status) values
  ('33100000-0000-0000-0000-000000000001', '23100000-0000-0000-0000-000000000001', '13100000-0000-0000-0000-000000000001', 'active'),
  ('33100000-0000-0000-0000-000000000002', '23100000-0000-0000-0000-000000000002', '13100000-0000-0000-0000-000000000002', 'active');
insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership cross join public.roles role
where membership.id in ('33100000-0000-0000-0000-000000000001', '33100000-0000-0000-0000-000000000002')
  and role.organization_id is null and role.key = 'organization_owner';

insert into public.programs (id, organization_id, code, name, target_beneficiary_type, fund_type, status, created_by) values
  ('43100000-0000-0000-0000-000000000001', '23100000-0000-0000-0000-000000000001', 'OPS-A', 'Operations Program A', 'family', 'general', 'active', '13100000-0000-0000-0000-000000000001'),
  ('43100000-0000-0000-0000-000000000002', '23100000-0000-0000-0000-000000000002', 'OPS-B', 'Operations Program B', 'family', 'general', 'active', '13100000-0000-0000-0000-000000000002');
insert into public.crm_contacts (id, organization_id, contact_type, display_name, normalized_name, status, created_by) values
  ('53100000-0000-0000-0000-000000000001', '23100000-0000-0000-0000-000000000001', 'person', 'Partner Operations A', 'partner operations a', 'active', '13100000-0000-0000-0000-000000000001'),
  ('53100000-0000-0000-0000-000000000002', '23100000-0000-0000-0000-000000000002', 'person', 'Partner Operations B', 'partner operations b', 'active', '13100000-0000-0000-0000-000000000002');
insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, created_by) values
  ('23100000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'distribution_partner', 'active', '13100000-0000-0000-0000-000000000001'),
  ('23100000-0000-0000-0000-000000000002', '53100000-0000-0000-0000-000000000002', 'distribution_partner', 'active', '13100000-0000-0000-0000-000000000002');
insert into public.aid_applications (id, organization_id, reference_number, program_id, applicant_contact_id, channel, requested_support, status, created_by) values
  ('63100000-0000-0000-0000-000000000001', '23100000-0000-0000-0000-000000000001', 'OPS-APP-A', '43100000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'field', 'Bantuan A', 'draft', '13100000-0000-0000-0000-000000000001'),
  ('63100000-0000-0000-0000-000000000002', '23100000-0000-0000-0000-000000000002', 'OPS-APP-B', '43100000-0000-0000-0000-000000000002', '53100000-0000-0000-0000-000000000002', 'field', 'Bantuan B', 'draft', '13100000-0000-0000-0000-000000000002');
insert into public.program_delivery_areas (id, organization_id, program_id, code, name, quota_capacity, created_by) values
  ('73100000-0000-0000-0000-000000000001', '23100000-0000-0000-0000-000000000001', '43100000-0000-0000-0000-000000000001', 'OPS-A-1', 'Area Operations A', 2, '13100000-0000-0000-0000-000000000001'),
  ('73100000-0000-0000-0000-000000000002', '23100000-0000-0000-0000-000000000002', '43100000-0000-0000-0000-000000000002', 'OPS-B-1', 'Area Operations B', 2, '13100000-0000-0000-0000-000000000002');
insert into public.program_partner_assignments (organization_id, program_id, delivery_area_id, partner_contact_id, readiness_status, created_by) values
  ('23100000-0000-0000-0000-000000000001', '43100000-0000-0000-0000-000000000001', '73100000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'ready', '13100000-0000-0000-0000-000000000001'),
  ('23100000-0000-0000-0000-000000000002', '43100000-0000-0000-0000-000000000002', '73100000-0000-0000-0000-000000000002', '53100000-0000-0000-0000-000000000002', 'ready', '13100000-0000-0000-0000-000000000002');
insert into public.program_application_allocations (organization_id, program_id, application_id, delivery_area_id, status, idempotency_key, request_hash, created_by) values
  ('23100000-0000-0000-0000-000000000001', '43100000-0000-0000-0000-000000000001', '63100000-0000-0000-0000-000000000001', '73100000-0000-0000-0000-000000000001', 'waitlisted', 'operations-test-key-a', 'hash-a', '13100000-0000-0000-0000-000000000001'),
  ('23100000-0000-0000-0000-000000000002', '43100000-0000-0000-0000-000000000002', '63100000-0000-0000-0000-000000000002', '73100000-0000-0000-0000-000000000002', 'waitlisted', 'operations-test-key-b', 'hash-b', '13100000-0000-0000-0000-000000000002');

select set_config('app.current_profile_id', '13100000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '23100000-0000-0000-0000-000000000001', true);
set local role app_runtime;
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.program_delivery_areas;
  if visible_count <> 1 then raise exception 'Tenant A can see % delivery areas', visible_count; end if;
  select count(*) into visible_count from public.program_partner_assignments;
  if visible_count <> 1 then raise exception 'Tenant A can see % partner assignments', visible_count; end if;
  select count(*) into visible_count from public.program_application_allocations;
  if visible_count <> 1 then raise exception 'Tenant A can see % program allocations', visible_count; end if;
end $$;

rollback;
