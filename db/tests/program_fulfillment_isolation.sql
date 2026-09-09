begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('13000000-0000-0000-0000-000000000001', 'fulfillment-user-a', 'Fulfillment User A', 'fulfillment-a@example.test'),
  ('13000000-0000-0000-0000-000000000002', 'fulfillment-user-b', 'Fulfillment User B', 'fulfillment-b@example.test');

insert into public.organizations (id, code, name, type)
values
  ('23000000-0000-0000-0000-000000000001', 'FULFILL-ORG-A', 'Fulfillment Org A', 'manager'),
  ('23000000-0000-0000-0000-000000000002', 'FULFILL-ORG-B', 'Fulfillment Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('33000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'active'),
  ('33000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '33000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.programs (
  id, organization_id, code, name, target_beneficiary_type, fund_type, status, created_by
)
values
  ('43000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'FULFILL-A', 'Fulfillment Program A', 'individual', 'general', 'active', '13000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'FULFILL-B', 'Fulfillment Program B', 'individual', 'general', 'active', '13000000-0000-0000-0000-000000000002');

insert into public.crm_contacts (
  id, organization_id, contact_type, display_name, normalized_name, status, created_by
)
values
  ('53000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'person', 'Fulfillment Beneficiary A', 'fulfillment beneficiary a', 'active', '13000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'person', 'Fulfillment Beneficiary B', 'fulfillment beneficiary b', 'active', '13000000-0000-0000-0000-000000000002');

insert into public.aid_applications (
  id, organization_id, reference_number, program_id, applicant_contact_id,
  channel, requested_support, status, created_by
)
values
  ('63000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'FULFILL-APP-A', '43000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'field', 'Paket kebutuhan dasar tenant A', 'draft', '13000000-0000-0000-0000-000000000001'),
  ('63000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'FULFILL-APP-B', '43000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000002', 'field', 'Paket kebutuhan dasar tenant B', 'draft', '13000000-0000-0000-0000-000000000002');

insert into public.inventory_warehouses (
  id, organization_id, code, name, type, status, created_by
)
values
  ('73000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'FULA-WH', 'Gudang Fulfillment A', 'central', 'active', '13000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'FULB-WH', 'Gudang Fulfillment B', 'central', 'active', '13000000-0000-0000-0000-000000000002');

insert into public.aid_package_templates (
  id, organization_id, code, name, status, created_by
)
values
  ('83000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'FULA-PKG', 'Paket Fulfillment A', 'active', '13000000-0000-0000-0000-000000000001'),
  ('83000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'FULB-PKG', 'Paket Fulfillment B', 'active', '13000000-0000-0000-0000-000000000002');

insert into public.aid_package_packings (
  id, organization_id, reference_number, template_id, warehouse_id,
  package_count, status, packed_by, packed_at, created_by
)
values
  ('93000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'FULA-PACK', '83000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 2, 'packed', '13000000-0000-0000-0000-000000000001', now(), '13000000-0000-0000-0000-000000000001'),
  ('93000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'FULB-PACK', '83000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000002', 2, 'packed', '13000000-0000-0000-0000-000000000002', now(), '13000000-0000-0000-0000-000000000002');

insert into public.program_publications (
  organization_id, program_id, version_number, public_slug, public_title,
  public_summary, report_title, report_narrative, status, published_by,
  published_at, created_by
)
values
  ('23000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 1, 'fulfillment-public-a', 'Fulfillment Public A', 'Ringkasan publik tenant A yang cukup panjang.', 'Laporan A', 'Narasi laporan publik tenant A yang cukup panjang.', 'published', '13000000-0000-0000-0000-000000000001', now(), '13000000-0000-0000-0000-000000000001'),
  ('23000000-0000-0000-0000-000000000002', '43000000-0000-0000-0000-000000000002', 1, 'fulfillment-public-b', 'Fulfillment Public B', 'Ringkasan publik tenant B yang cukup panjang.', 'Laporan B', 'Narasi laporan publik tenant B yang cukup panjang.', 'published', '13000000-0000-0000-0000-000000000002', now(), '13000000-0000-0000-0000-000000000002');

insert into public.program_beneficiary_fulfillments (
  organization_id, program_id, application_id, beneficiary_contact_id, packing_id,
  package_count, idempotency_key, request_hash, created_by
)
values
  ('23000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 1, 'fulfillment-test-key-a', 'test-hash-a', '13000000-0000-0000-0000-000000000001'),
  ('23000000-0000-0000-0000-000000000002', '43000000-0000-0000-0000-000000000002', '63000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000002', 1, 'fulfillment-test-key-b', 'test-hash-b', '13000000-0000-0000-0000-000000000002');

select set_config('app.current_profile_id', '13000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '23000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
  support_modes_value text[];
  cash_budget numeric;
begin
  select count(*) into visible_count from public.program_beneficiary_fulfillments;
  if visible_count <> 1 then
    raise exception 'Expected one visible fulfillment for tenant A, got %', visible_count;
  end if;
  if exists (
    select 1 from public.program_beneficiary_fulfillments
    where application_id = '63000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B fulfillment';
  end if;

  select support_modes, cash_budget_amount
  into support_modes_value, cash_budget
  from public.programs
  where id = '43000000-0000-0000-0000-000000000001';

  if support_modes_value <> ARRAY['cash']::text[] or cash_budget <> 0 then
    raise exception 'Legacy program support defaults are invalid';
  end if;

  select count(*) into visible_count from public.program_publications;
  if visible_count <> 1 then
    raise exception 'Expected one visible program publication for tenant A, got %', visible_count;
  end if;
end;
$$;

rollback;
