begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('14000000-0000-0000-0000-000000000001', 'fund-user-a', 'Fund User A', 'fund-a@example.test'),
  ('14000000-0000-0000-0000-000000000002', 'fund-user-b', 'Fund User B', 'fund-b@example.test'),
  ('14000000-0000-0000-0000-000000000003', 'fund-no-permission', 'Fund No Permission', 'fund-none@example.test');

insert into public.organizations (id, code, name, type)
values
  ('24000000-0000-0000-0000-000000000001', 'FUND-ORG-A', 'Fund Org A', 'manager'),
  ('24000000-0000-0000-0000-000000000002', 'FUND-ORG-B', 'Fund Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('34000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'active'),
  ('34000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002', 'active'),
  ('34000000-0000-0000-0000-000000000003', '24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '34000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.fund_restrictions (
  id, organization_id, code, name, restriction_type, currency, created_by
)
values
  ('44000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'GENERAL-A', 'General A', 'unrestricted', 'IDR', '14000000-0000-0000-0000-000000000001'),
  ('44000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', 'GENERAL-B', 'General B', 'unrestricted', 'IDR', '14000000-0000-0000-0000-000000000002');

insert into public.fund_receipts (
  id, organization_id, reference_number, restriction_id, amount,
  currency, received_at, payment_method, status, created_by
)
values
  ('54000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'RCT-A', '44000000-0000-0000-0000-000000000001', 100000, 'IDR', now(), 'bank_transfer', 'posted', '14000000-0000-0000-0000-000000000001'),
  ('54000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', 'RCT-B', '44000000-0000-0000-0000-000000000002', 200000, 'IDR', now(), 'bank_transfer', 'posted', '14000000-0000-0000-0000-000000000002');

insert into public.fund_ledger_entries (
  id, organization_id, entry_number, entry_type, restriction_id,
  source_type, source_id, currency, available_delta, actor_profile_id, request_id
)
values
  ('64000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'LED-A', 'receipt_posted', '44000000-0000-0000-0000-000000000001', 'receipt', '54000000-0000-0000-0000-000000000001', 'IDR', 100000, '14000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001'),
  ('64000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', 'LED-B', 'receipt_posted', '44000000-0000-0000-0000-000000000002', 'receipt', '54000000-0000-0000-0000-000000000002', 'IDR', 200000, '14000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000002');

do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.fund_ledger_entries (
      organization_id, entry_number, entry_type, restriction_id,
      source_type, source_id, currency, available_delta, actor_profile_id, request_id
    ) values (
      '24000000-0000-0000-0000-000000000001', 'LED-CROSS', 'receipt_posted',
      '44000000-0000-0000-0000-000000000002', 'receipt',
      '54000000-0000-0000-0000-000000000001', 'IDR', 1,
      '14000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000003'
    );
  exception
    when foreign_key_violation then blocked := true;
  end;
  if not blocked then
    raise exception 'Cross-tenant restriction relation unexpectedly succeeded';
  end if;

  blocked := false;
  begin
    update public.fund_ledger_entries
    set available_delta = 999999
    where id = '64000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then blocked := true;
  end;
  if not blocked then
    raise exception 'Append-only ledger mutation unexpectedly succeeded';
  end if;

  blocked := false;
  begin
    update public.fund_receipts
    set amount = 999999
    where id = '54000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then blocked := true;
  end;
  if not blocked then
    raise exception 'Posted receipt financial mutation unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '14000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '24000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
  visible_balance numeric;
begin
  select count(*) into visible_count from public.fund_restrictions;
  if visible_count <> 1 then
    raise exception 'Expected one restriction for tenant A, got %', visible_count;
  end if;

  select sum(available_delta) into visible_balance from public.fund_ledger_entries;
  if visible_balance <> 100000 then
    raise exception 'Tenant A ledger balance is %, expected 100000', visible_balance;
  end if;

  if exists (
    select 1 from public.fund_receipts
    where id = '54000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B receipt';
  end if;

  begin
    delete from public.fund_receipts
    where id = '54000000-0000-0000-0000-000000000001';
    raise exception 'Fund receipt hard delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '14000000-0000-0000-0000-000000000003', true);

do $$
begin
  if exists (select 1 from public.fund_ledger_entries) then
    raise exception 'User without fund_ledger.read can read ledger';
  end if;
end;
$$;

rollback;
