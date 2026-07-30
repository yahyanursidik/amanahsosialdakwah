begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('15000000-0000-0000-0000-000000000001', 'distribution-user-a', 'Distribution User A', 'distribution-a@example.test'),
  ('15000000-0000-0000-0000-000000000002', 'distribution-user-b', 'Distribution User B', 'distribution-b@example.test'),
  ('15000000-0000-0000-0000-000000000003', 'distribution-no-permission', 'Distribution No Permission', 'distribution-none@example.test');

insert into public.organizations (id, code, name, type)
values
  ('25000000-0000-0000-0000-000000000001', 'DST-ORG-A', 'Distribution Org A', 'manager'),
  ('25000000-0000-0000-0000-000000000002', 'DST-ORG-B', 'Distribution Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('35000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'active'),
  ('35000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000002', 'active'),
  ('35000000-0000-0000-0000-000000000003', '25000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '35000000-0000-0000-0000-000000000001',
  '35000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.programs (
  id, organization_id, code, name, target_beneficiary_type,
  fund_type, status, created_by
)
values
  ('45000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-PROGRAM-A', 'Distribution Program A', 'individual', 'general', 'active', '15000000-0000-0000-0000-000000000001'),
  ('45000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-PROGRAM-B', 'Distribution Program B', 'individual', 'general', 'active', '15000000-0000-0000-0000-000000000002');

insert into public.crm_contacts (
  id, organization_id, contact_type, display_name,
  normalized_name, status, created_by
)
values
  ('55000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'person', 'Distribution Beneficiary A', 'distribution beneficiary a', 'active', '15000000-0000-0000-0000-000000000001'),
  ('55000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'person', 'Distribution Beneficiary B', 'distribution beneficiary b', 'active', '15000000-0000-0000-0000-000000000002');

insert into public.aid_applications (
  id, organization_id, reference_number, program_id,
  applicant_contact_id, channel, requested_support, status, created_by
)
values
  ('65000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-APP-A', '45000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', 'field', 'Distribution test support A', 'converted', '15000000-0000-0000-0000-000000000001'),
  ('65000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-APP-B', '45000000-0000-0000-0000-000000000002', '55000000-0000-0000-0000-000000000002', 'field', 'Distribution test support B', 'converted', '15000000-0000-0000-0000-000000000002');

insert into public.beneficiary_cases (
  id, organization_id, reference_number, application_id, program_id,
  beneficiary_contact_id, status, created_by
)
values
  ('75000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-CASE-A', '65000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', 'eligible', '15000000-0000-0000-0000-000000000001'),
  ('75000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-CASE-B', '65000000-0000-0000-0000-000000000002', '45000000-0000-0000-0000-000000000002', '55000000-0000-0000-0000-000000000002', 'eligible', '15000000-0000-0000-0000-000000000002');

insert into public.fund_restrictions (
  id, organization_id, code, name, restriction_type, currency, created_by
)
values
  ('85000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-FUND-A', 'Distribution Fund A', 'unrestricted', 'IDR', '15000000-0000-0000-0000-000000000001'),
  ('85000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-FUND-B', 'Distribution Fund B', 'unrestricted', 'IDR', '15000000-0000-0000-0000-000000000002');

insert into public.fund_allocations (
  id, organization_id, reference_number, restriction_id, program_id,
  amount, currency, purpose, status, activated_at, activated_by, created_by
)
values
  ('95000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-ALC-A', '85000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', 100000, 'IDR', 'Distribution allocation test A', 'approved', now(), '15000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001'),
  ('95000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-ALC-B', '85000000-0000-0000-0000-000000000002', '45000000-0000-0000-0000-000000000002', 200000, 'IDR', 'Distribution allocation test B', 'approved', now(), '15000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000002');

insert into public.fund_disbursements (
  id, organization_id, reference_number, allocation_id, amount, currency,
  recipient_type, recipient_reference, payment_method, disbursed_at,
  status, created_by
)
values
  ('a5000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-DSB-A', '95000000-0000-0000-0000-000000000001', 100000, 'IDR', 'beneficiary', 'DST-CASE-A', 'cash', now(), 'posted', '15000000-0000-0000-0000-000000000001'),
  ('a5000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-DSB-B', '95000000-0000-0000-0000-000000000002', 200000, 'IDR', 'beneficiary', 'DST-CASE-B', 'cash', now(), 'posted', '15000000-0000-0000-0000-000000000002');

insert into public.distribution_plans (
  id, organization_id, reference_number, disbursement_id, allocation_id,
  program_id, case_id, beneficiary_contact_id, amount, currency,
  distribution_method, purpose, planned_at, status, created_by
)
values
  ('b5000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'DST-PLAN-A', 'a5000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', 100000, 'IDR', 'cash', 'Distribution plan test A', now(), 'draft', '15000000-0000-0000-0000-000000000001'),
  ('b5000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'DST-PLAN-B', 'a5000000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000002', '45000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000002', '55000000-0000-0000-0000-000000000002', 200000, 'IDR', 'cash', 'Distribution plan test B', now(), 'draft', '15000000-0000-0000-0000-000000000002');

insert into public.distribution_events (
  id, organization_id, distribution_plan_id, cycle_number, event_type,
  to_status, actor_profile_id, request_id
)
values
  ('c5000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 1, 'created', 'draft', '15000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001'),
  ('c5000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000002', 'b5000000-0000-0000-0000-000000000002', 1, 'created', 'draft', '15000000-0000-0000-0000-000000000002', 'd5000000-0000-0000-0000-000000000002');

do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.distribution_plans (
      organization_id, reference_number, disbursement_id, allocation_id,
      program_id, case_id, beneficiary_contact_id, amount, currency,
      distribution_method, purpose, planned_at, created_by
    ) values (
      '25000000-0000-0000-0000-000000000001', 'DST-CROSS',
      'a5000000-0000-0000-0000-000000000002',
      '95000000-0000-0000-0000-000000000001',
      '45000000-0000-0000-0000-000000000001',
      '75000000-0000-0000-0000-000000000001',
      '55000000-0000-0000-0000-000000000001',
      1, 'IDR', 'cash', 'Cross tenant distribution', now(),
      '15000000-0000-0000-0000-000000000001'
    );
  exception
    when foreign_key_violation then blocked := true;
  end;
  if not blocked then
    raise exception 'Cross-tenant disbursement relation unexpectedly succeeded';
  end if;

  blocked := false;
  begin
    update public.distribution_events
    set event_type = 'tampered'
    where id = 'c5000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then blocked := true;
  end;
  if not blocked then
    raise exception 'Append-only distribution event mutation unexpectedly succeeded';
  end if;

  blocked := false;
  begin
    update public.distribution_plans
    set amount = 1, status = 'ready'
    where id = 'b5000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then blocked := true;
  end;
  if not blocked then
    raise exception 'Immutable distribution context mutation unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '15000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '25000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.distribution_plans;
  if visible_count <> 1 then
    raise exception 'Expected one distribution for tenant A, got %', visible_count;
  end if;
  if exists (
    select 1 from public.distribution_plans
    where id = 'b5000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B distribution';
  end if;
  begin
    delete from public.distribution_plans
    where id = 'b5000000-0000-0000-0000-000000000001';
    raise exception 'Distribution hard delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '15000000-0000-0000-0000-000000000003', true);

do $$
begin
  if exists (select 1 from public.distribution_plans) then
    raise exception 'User without distributions.read can read distributions';
  end if;
end;
$$;

rollback;
