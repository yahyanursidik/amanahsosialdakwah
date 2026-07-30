begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('10000000-0000-0000-0000-000000000001', 'auth-user-a', 'User A', 'a@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'auth-user-b', 'User B', 'b@example.test')
on conflict (id) do nothing;

insert into public.organizations (id, code, name, type)
values
  ('20000000-0000-0000-0000-000000000001', 'ORG-A', 'Organisasi A', 'manager'),
  ('20000000-0000-0000-0000-000000000002', 'ORG-B', 'Organisasi B', 'manager')
on conflict (id) do nothing;

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'active'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'active')
on conflict (id) do nothing;

select set_config('app.current_profile_id', '10000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '20000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.organizations;

  if visible_count <> 1 then
    raise exception 'Expected exactly 1 visible organization for tenant A, got %', visible_count;
  end if;

  if exists (
    select 1
    from public.organizations
    where id = '20000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can see tenant B organization';
  end if;
end;
$$;

rollback;
