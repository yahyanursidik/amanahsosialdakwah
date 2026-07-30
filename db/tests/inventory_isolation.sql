begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('17000000-0000-0000-0000-000000000001', 'inventory-user-a', 'Inventory User A', 'inventory-a@example.test'),
  ('17000000-0000-0000-0000-000000000002', 'inventory-user-b', 'Inventory User B', 'inventory-b@example.test'),
  ('17000000-0000-0000-0000-000000000003', 'inventory-no-permission', 'Inventory No Permission', 'inventory-none@example.test');

insert into public.organizations (id, code, name, type)
values
  ('27000000-0000-0000-0000-000000000001', 'INV-ORG-A', 'Inventory Org A', 'manager'),
  ('27000000-0000-0000-0000-000000000002', 'INV-ORG-B', 'Inventory Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('37000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 'active'),
  ('37000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000002', 'active'),
  ('37000000-0000-0000-0000-000000000003', '27000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '37000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.inventory_products (
  id, organization_id, sku, name, base_unit, track_batch, track_expiry, created_by
)
values
  ('47000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', 'INV-RICE-A', 'Inventory Rice A', 'kg', true, true, '17000000-0000-0000-0000-000000000001'),
  ('47000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000002', 'INV-RICE-B', 'Inventory Rice B', 'kg', true, true, '17000000-0000-0000-0000-000000000002');

insert into public.inventory_warehouses (
  id, organization_id, code, name, type, created_by
)
values
  ('57000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', 'INV-WH-A', 'Gudang A', 'central', '17000000-0000-0000-0000-000000000001'),
  ('57000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000002', 'INV-WH-B', 'Gudang B', 'central', '17000000-0000-0000-0000-000000000002');

insert into public.inventory_batches (
  id, organization_id, product_id, batch_number, expires_at, created_by
)
values
  ('67000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', 'BATCH-A', '2027-12-31', '17000000-0000-0000-0000-000000000001'),
  ('67000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000002', '47000000-0000-0000-0000-000000000002', 'BATCH-B', '2027-12-31', '17000000-0000-0000-0000-000000000002');

insert into public.inventory_balances (
  id, organization_id, product_id, warehouse_id, batch_id, quantity_on_hand
)
values
  ('77000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', '67000000-0000-0000-0000-000000000001', 10),
  ('77000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000002', '47000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000002', '67000000-0000-0000-0000-000000000002', 20);

insert into public.inventory_movements (
  id, organization_id, product_id, warehouse_id, batch_id, movement_type,
  direction, quantity, unit, source_type, source_id, occurred_at,
  request_id, created_by
)
values
  ('87000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', '67000000-0000-0000-0000-000000000001', 'adjustment_in', 'in', 10, 'kg', 'inventory_adjustment', '97000000-0000-0000-0000-000000000001', now(), '97000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000001'),
  ('87000000-0000-0000-0000-000000000002', '27000000-0000-0000-0000-000000000002', '47000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000002', '67000000-0000-0000-0000-000000000002', 'adjustment_in', 'in', 20, 'kg', 'inventory_adjustment', '97000000-0000-0000-0000-000000000003', now(), '97000000-0000-0000-0000-000000000004', '17000000-0000-0000-0000-000000000002');

do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.inventory_balances (
      organization_id, product_id, warehouse_id, quantity_on_hand
    ) values (
      '27000000-0000-0000-0000-000000000001',
      '47000000-0000-0000-0000-000000000002',
      '57000000-0000-0000-0000-000000000001',
      1
    );
  exception
    when foreign_key_violation then blocked := true;
  end;
  if not blocked then
    raise exception 'Cross-tenant inventory balance unexpectedly succeeded';
  end if;

  blocked := false;
  begin
    update public.inventory_movements
    set quantity = 99
    where id = '87000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then blocked := true;
  end;
  if not blocked then
    raise exception 'Append-only inventory movement mutation unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '17000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '27000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.inventory_balances;
  if visible_count <> 1 then
    raise exception 'Expected one inventory balance for tenant A, got %', visible_count;
  end if;
  if exists (
    select 1 from public.inventory_balances
    where id = '77000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B inventory balance';
  end if;
  begin
    delete from public.inventory_movements
    where id = '87000000-0000-0000-0000-000000000001';
  exception
    when insufficient_privilege then null;
  end;
  if not exists (
    select 1 from public.inventory_movements
    where id = '87000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Inventory movement hard delete unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '17000000-0000-0000-0000-000000000003', true);

do $$
begin
  if exists (select 1 from public.inventory_balances) then
    raise exception 'User without inventory_balances.read can read inventory balances';
  end if;
end;
$$;

rollback;
