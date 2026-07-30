begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('16000000-0000-0000-0000-000000000001', 'procurement-user-a', 'Procurement User A', 'procurement-a@example.test'),
  ('16000000-0000-0000-0000-000000000002', 'procurement-user-b', 'Procurement User B', 'procurement-b@example.test'),
  ('16000000-0000-0000-0000-000000000003', 'procurement-no-permission', 'Procurement No Permission', 'procurement-none@example.test');

insert into public.organizations (id, code, name, type)
values
  ('26000000-0000-0000-0000-000000000001', 'PRC-ORG-A', 'Procurement Org A', 'manager'),
  ('26000000-0000-0000-0000-000000000002', 'PRC-ORG-B', 'Procurement Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'active'),
  ('36000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000002', 'active'),
  ('36000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '36000000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.programs (
  id, organization_id, code, name, target_beneficiary_type,
  fund_type, status, created_by
)
values
  ('46000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'PRC-PROGRAM-A', 'Procurement Program A', 'individual', 'general', 'active', '16000000-0000-0000-0000-000000000001'),
  ('46000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', 'PRC-PROGRAM-B', 'Procurement Program B', 'individual', 'general', 'active', '16000000-0000-0000-0000-000000000002');

insert into public.crm_contacts (
  id, organization_id, contact_type, display_name,
  normalized_name, status, created_by
)
values
  ('56000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'institution', 'Procurement Vendor A', 'procurement vendor a', 'active', '16000000-0000-0000-0000-000000000001'),
  ('56000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', 'institution', 'Procurement Vendor B', 'procurement vendor b', 'active', '16000000-0000-0000-0000-000000000002');

insert into public.procurement_requests (
  id, organization_id, reference_number, program_id, vendor_contact_id,
  title, purpose, items, currency, quote_amount, quote_currency,
  status, created_by
)
values
  ('66000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'PRC-REQ-A', '46000000-0000-0000-0000-000000000001', '56000000-0000-0000-0000-000000000001', 'Pengadaan A', 'Procurement request test A', '[{"name":"Beras","quantity":"10","unit":"kg"}]'::jsonb, 'IDR', 100000, 'IDR', 'approved', '16000000-0000-0000-0000-000000000001'),
  ('66000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', 'PRC-REQ-B', '46000000-0000-0000-0000-000000000002', '56000000-0000-0000-0000-000000000002', 'Pengadaan B', 'Procurement request test B', '[{"name":"Minyak","quantity":"5","unit":"dus"}]'::jsonb, 'IDR', 200000, 'IDR', 'approved', '16000000-0000-0000-0000-000000000002');

insert into public.purchase_orders (
  id, organization_id, procurement_request_id, reference_number,
  vendor_contact_id, amount, currency, status, created_by
)
values
  ('76000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', 'PRC-PO-A', '56000000-0000-0000-0000-000000000001', 100000, 'IDR', 'draft', '16000000-0000-0000-0000-000000000001'),
  ('76000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', 'PRC-PO-B', '56000000-0000-0000-0000-000000000002', 200000, 'IDR', 'draft', '16000000-0000-0000-0000-000000000002');

insert into public.procurement_events (
  id, organization_id, entity_type, entity_id, event_type,
  to_status, actor_profile_id, request_id
)
values
  ('86000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'procurement_request', '66000000-0000-0000-0000-000000000001', 'created', 'approved', '16000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001'),
  ('86000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', 'procurement_request', '66000000-0000-0000-0000-000000000002', 'created', 'approved', '16000000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000002');

do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.purchase_orders (
      organization_id, procurement_request_id, reference_number,
      vendor_contact_id, amount, currency, created_by
    ) values (
      '26000000-0000-0000-0000-000000000001',
      '66000000-0000-0000-0000-000000000002',
      'PRC-CROSS',
      '56000000-0000-0000-0000-000000000001',
      1, 'IDR', '16000000-0000-0000-0000-000000000001'
    );
  exception
    when foreign_key_violation then blocked := true;
  end;
  if not blocked then
    raise exception 'Cross-tenant procurement relation unexpectedly succeeded';
  end if;

  blocked := false;
  begin
    update public.procurement_events
    set event_type = 'tampered'
    where id = '86000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then blocked := true;
  end;
  if not blocked then
    raise exception 'Append-only procurement event mutation unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '16000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '26000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.procurement_requests;
  if visible_count <> 1 then
    raise exception 'Expected one procurement request for tenant A, got %', visible_count;
  end if;
  if exists (
    select 1 from public.procurement_requests
    where id = '66000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B procurement request';
  end if;
  begin
    delete from public.procurement_requests
    where id = '66000000-0000-0000-0000-000000000001';
  exception
    when insufficient_privilege then null;
  end;
  if not exists (
    select 1 from public.procurement_requests
    where id = '66000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Procurement hard delete unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '16000000-0000-0000-0000-000000000003', true);

do $$
begin
  if exists (select 1 from public.procurement_requests) then
    raise exception 'User without procurement_requests.read can read procurement requests';
  end if;
end;
$$;

rollback;
