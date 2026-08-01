begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('1b000000-0000-0000-0000-000000000001', 'logistics-user-a', 'Logistics User A', 'logistics-a@example.test'),
  ('1b000000-0000-0000-0000-000000000002', 'logistics-user-b', 'Logistics User B', 'logistics-b@example.test'),
  ('1b000000-0000-0000-0000-000000000003', 'logistics-no-permission', 'Logistics No Permission', 'logistics-none@example.test');

insert into public.organizations (id, code, name, type) values
  ('2b000000-0000-0000-0000-000000000001', 'LOG-ORG-A', 'Logistics Org A', 'manager'),
  ('2b000000-0000-0000-0000-000000000002', 'LOG-ORG-B', 'Logistics Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status) values
  ('3b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'active'),
  ('3b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', 'active'),
  ('3b000000-0000-0000-0000-000000000003', '2b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership cross join public.roles role
where membership.id in ('3b000000-0000-0000-0000-000000000001', '3b000000-0000-0000-0000-000000000002')
  and role.organization_id is null and role.key = 'organization_owner';

insert into public.inventory_products (id, organization_id, sku, name, base_unit, created_by) values
  ('4b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'LOG-A', 'Logistics Product A', 'pcs', '1b000000-0000-0000-0000-000000000001'),
  ('4b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'LOG-B', 'Logistics Product B', 'pcs', '1b000000-0000-0000-0000-000000000002');
insert into public.inventory_warehouses (id, organization_id, code, name, created_by) values
  ('5b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'LOG-WH-A', 'Logistics Warehouse A', '1b000000-0000-0000-0000-000000000001'),
  ('5b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'LOG-WH-B', 'Logistics Warehouse B', '1b000000-0000-0000-0000-000000000002');
insert into public.aid_package_templates (id, organization_id, code, name, status, created_by) values
  ('6b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'LOG-PKG-A', 'Logistics Package A', 'active', '1b000000-0000-0000-0000-000000000001'),
  ('6b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'LOG-PKG-B', 'Logistics Package B', 'active', '1b000000-0000-0000-0000-000000000002');
insert into public.aid_package_packings (id, organization_id, reference_number, template_id, warehouse_id, package_count, status, packed_by, packed_at, created_by) values
  ('7b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'LOG-PACK-A', '6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 10, 'packed', '1b000000-0000-0000-0000-000000000001', now(), '1b000000-0000-0000-0000-000000000001'),
  ('7b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'LOG-PACK-B', '6b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000002', 20, 'packed', '1b000000-0000-0000-0000-000000000002', now(), '1b000000-0000-0000-0000-000000000002');

insert into public.logistics_couriers (id, organization_id, code, name, created_by) values
  ('8b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'COURIER-A', 'Courier A', '1b000000-0000-0000-0000-000000000001'),
  ('8b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'COURIER-B', 'Courier B', '1b000000-0000-0000-0000-000000000002');

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.logistics_shipments (organization_id, reference_number, packing_id, courier_id, destination_name, destination_address, created_by)
    values ('2b000000-0000-0000-0000-000000000001', 'CROSS-TENANT', '7b000000-0000-0000-0000-000000000002', '8b000000-0000-0000-0000-000000000001', 'Penerima', 'Alamat penerima lintas tenant', '1b000000-0000-0000-0000-000000000001');
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'Cross-tenant shipment unexpectedly succeeded'; end if;
end;
$$;

insert into public.logistics_shipments (id, organization_id, reference_number, packing_id, courier_id, destination_name, destination_address, status, dispatched_at, created_by) values
  ('9b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', 'SHIP-A', '7b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000001', 'Penerima A', 'Alamat penerima organisasi A', 'dispatched', now(), '1b000000-0000-0000-0000-000000000001'),
  ('9b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-000000000002', 'SHIP-B', '7b000000-0000-0000-0000-000000000002', '8b000000-0000-0000-0000-000000000002', 'Penerima B', 'Alamat penerima organisasi B', 'dispatched', now(), '1b000000-0000-0000-0000-000000000002');
insert into public.logistics_tracking_events (id, organization_id, shipment_id, event_type, event_at, created_by) values
  ('ab000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001', 'dispatched', now(), '1b000000-0000-0000-0000-000000000001');

do $$
declare blocked boolean := false;
begin
  begin
    update public.logistics_tracking_events set notes = 'tamper' where id = 'ab000000-0000-0000-0000-000000000001';
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Append-only tracking mutation unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id', '1b000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '2b000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare visible_count integer;
declare delete_blocked boolean := false;
begin
  select count(*) into visible_count from public.logistics_shipments;
  if visible_count <> 1 then raise exception 'Expected one shipment for tenant A, got %', visible_count; end if;
  if exists (select 1 from public.logistics_shipments where id = '9b000000-0000-0000-0000-000000000002') then raise exception 'Tenant A can read tenant B shipment'; end if;
  begin
    delete from public.logistics_shipments where id = '9b000000-0000-0000-0000-000000000001';
  exception when insufficient_privilege then delete_blocked := true;
  end;
  if not delete_blocked then raise exception 'Runtime unexpectedly received shipment DELETE privilege'; end if;
  if not exists (select 1 from public.logistics_shipments where id = '9b000000-0000-0000-0000-000000000001') then raise exception 'Shipment hard delete unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id', '1b000000-0000-0000-0000-000000000003', true);
do $$
begin
  if exists (select 1 from public.logistics_shipments) then raise exception 'User without logistics permission can read shipments'; end if;
end;
$$;

rollback;
