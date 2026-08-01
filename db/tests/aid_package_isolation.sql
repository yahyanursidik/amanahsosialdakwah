begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('1a000000-0000-0000-0000-000000000001', 'aid-package-user-a', 'Aid Package User A', 'package-a@example.test'),
  ('1a000000-0000-0000-0000-000000000002', 'aid-package-user-b', 'Aid Package User B', 'package-b@example.test'),
  ('1a000000-0000-0000-0000-000000000003', 'aid-package-no-permission', 'Aid Package No Permission', 'package-none@example.test');

insert into public.organizations (id, code, name, type) values
  ('2a000000-0000-0000-0000-000000000001', 'PKG-ORG-A', 'Aid Package Org A', 'manager'),
  ('2a000000-0000-0000-0000-000000000002', 'PKG-ORG-B', 'Aid Package Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status) values
  ('3a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'active'),
  ('3a000000-0000-0000-0000-000000000002', '2a000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002', 'active'),
  ('3a000000-0000-0000-0000-000000000003', '2a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in ('3a000000-0000-0000-0000-000000000001', '3a000000-0000-0000-0000-000000000002')
  and role.organization_id is null and role.key = 'organization_owner';

insert into public.inventory_products (id, organization_id, sku, name, base_unit, created_by) values
  ('4a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', 'PKG-RICE-A', 'Package Rice A', 'kg', '1a000000-0000-0000-0000-000000000001'),
  ('4a000000-0000-0000-0000-000000000002', '2a000000-0000-0000-0000-000000000002', 'PKG-RICE-B', 'Package Rice B', 'kg', '1a000000-0000-0000-0000-000000000002');

insert into public.inventory_warehouses (id, organization_id, code, name, created_by) values
  ('5a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', 'PKG-WH-A', 'Package Warehouse A', '1a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '2a000000-0000-0000-0000-000000000002', 'PKG-WH-B', 'Package Warehouse B', '1a000000-0000-0000-0000-000000000002');

insert into public.aid_package_templates (id, organization_id, code, name, status, created_by) values
  ('6a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', 'PKG-A', 'Template Package A', 'draft', '1a000000-0000-0000-0000-000000000001'),
  ('6a000000-0000-0000-0000-000000000002', '2a000000-0000-0000-0000-000000000002', 'PKG-B', 'Template Package B', 'draft', '1a000000-0000-0000-0000-000000000002');

insert into public.aid_package_template_items (id, organization_id, template_id, product_id, quantity, unit, created_by) values
  ('7a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', '4a000000-0000-0000-0000-000000000001', 2, 'kg', '1a000000-0000-0000-0000-000000000001'),
  ('7a000000-0000-0000-0000-000000000002', '2a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000002', '4a000000-0000-0000-0000-000000000002', 3, 'kg', '1a000000-0000-0000-0000-000000000002');

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.aid_package_template_items (
      organization_id, template_id, product_id, quantity, unit, created_by
    ) values (
      '2a000000-0000-0000-0000-000000000001',
      '6a000000-0000-0000-0000-000000000001',
      '4a000000-0000-0000-0000-000000000002',
      1, 'kg', '1a000000-0000-0000-0000-000000000001'
    );
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'Cross-tenant package product unexpectedly succeeded'; end if;
end;
$$;

update public.aid_package_templates
set status = 'active', published_at = now(), published_by = created_by
where id in (
  '6a000000-0000-0000-0000-000000000001',
  '6a000000-0000-0000-0000-000000000002'
);

insert into public.aid_package_packings (id, organization_id, reference_number, template_id, warehouse_id, package_count, created_by) values
  ('8a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', 'PACK-A', '6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 10, '1a000000-0000-0000-0000-000000000001'),
  ('8a000000-0000-0000-0000-000000000002', '2a000000-0000-0000-0000-000000000002', 'PACK-B', '6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 20, '1a000000-0000-0000-0000-000000000002');

do $$
declare blocked boolean := false;
begin
  begin
    delete from public.aid_package_packings where id = '8a000000-0000-0000-0000-000000000001';
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Aid package packing hard delete unexpectedly succeeded'; end if;

  blocked := false;
  begin
    update public.aid_package_template_items
    set quantity = 99
    where id = '7a000000-0000-0000-0000-000000000001';
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Published package item mutation unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id', '1a000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '2a000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.aid_package_templates;
  if visible_count <> 1 then raise exception 'Expected one package template for tenant A, got %', visible_count; end if;
  if exists (select 1 from public.aid_package_packings where id = '8a000000-0000-0000-0000-000000000002') then
    raise exception 'Tenant A can read tenant B package packing';
  end if;
end;
$$;

select set_config('app.current_profile_id', '1a000000-0000-0000-0000-000000000003', true);
do $$
begin
  if exists (select 1 from public.aid_package_templates) then
    raise exception 'User without package permission can read templates';
  end if;
end;
$$;

rollback;
