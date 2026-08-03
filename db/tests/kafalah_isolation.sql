begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('18000000-0000-0000-0000-000000000001', 'kafalah-user-a', 'Kafalah User A', 'kafalah-a@example.test'),
  ('18000000-0000-0000-0000-000000000002', 'kafalah-user-b', 'Kafalah User B', 'kafalah-b@example.test'),
  ('18000000-0000-0000-0000-000000000003', 'kafalah-user-none', 'Kafalah No Permission', 'kafalah-none@example.test');

insert into public.organizations (id, code, name, type) values
  ('28000000-0000-0000-0000-000000000001', 'KFL-ORG-A', 'Kafalah Org A', 'manager'),
  ('28000000-0000-0000-0000-000000000002', 'KFL-ORG-B', 'Kafalah Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status) values
  ('38000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'active'),
  ('38000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', 'active'),
  ('38000000-0000-0000-0000-000000000003', '28000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in ('38000000-0000-0000-0000-000000000001', '38000000-0000-0000-0000-000000000002')
  and role.organization_id is null and role.key = 'organization_owner';

insert into public.crm_contacts (id, organization_id, contact_type, display_name, normalized_name, status, created_by) values
  ('58000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000001', 'person', 'Beneficiary A', 'beneficiary a', 'active', '18000000-0000-0000-0000-000000000001'),
  ('58000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000002', 'person', 'Beneficiary B', 'beneficiary b', 'active', '18000000-0000-0000-0000-000000000002'),
  ('58000000-0000-0000-0000-000000000011', '28000000-0000-0000-0000-000000000001', 'person', 'Sponsor A', 'sponsor a', 'active', '18000000-0000-0000-0000-000000000001'),
  ('58000000-0000-0000-0000-000000000012', '28000000-0000-0000-0000-000000000002', 'person', 'Sponsor B', 'sponsor b', 'active', '18000000-0000-0000-0000-000000000002');

insert into public.crm_contact_roles (organization_id, contact_id, role_type, created_by) values
  ('28000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'beneficiary', '18000000-0000-0000-0000-000000000001'),
  ('28000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000002', 'beneficiary', '18000000-0000-0000-0000-000000000002'),
  ('28000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000011', 'kafil', '18000000-0000-0000-0000-000000000001'),
  ('28000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000012', 'kafil', '18000000-0000-0000-0000-000000000002');

insert into public.kafalah_needs (id, organization_id, reference_number, beneficiary_contact_id, need_type, title, description, approved_amount, period_months, created_by, updated_by) values
  ('68000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000001', 'KFL-NEED-A', '58000000-0000-0000-0000-000000000001', 'education', 'Need A', 'Kebutuhan pendidikan tenant A', 100000, 12, '18000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001'),
  ('68000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000002', 'KFL-NEED-B', '58000000-0000-0000-0000-000000000002', 'living', 'Need B', 'Kebutuhan penghidupan tenant B', 200000, 12, '18000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002');

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.kafalah_matches (organization_id, reference_number, need_id, sponsor_contact_id, matched_amount, start_date, end_date, created_by)
    values ('28000000-0000-0000-0000-000000000001', 'KFL-CROSS', '68000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000012', 10000, current_date, current_date + 30, '18000000-0000-0000-0000-000000000001');
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'Cross-tenant Kafalah matching unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id', '18000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '28000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.kafalah_needs;
  if visible_count <> 1 then raise exception 'Expected one Kafalah need for tenant A, got %', visible_count; end if;
  if exists (select 1 from public.kafalah_needs where id = '68000000-0000-0000-0000-000000000002') then
    raise exception 'Tenant A can read tenant B Kafalah need';
  end if;
  begin
    delete from public.kafalah_needs where id = '68000000-0000-0000-0000-000000000001';
    if not exists (select 1 from public.kafalah_needs where id = '68000000-0000-0000-0000-000000000001') then
      raise exception 'Kafalah hard delete unexpectedly succeeded';
    end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '18000000-0000-0000-0000-000000000003', true);
do $$ begin
  if exists (select 1 from public.kafalah_needs) then raise exception 'User without kafalah.read can read Kafalah'; end if;
end; $$;

rollback;
