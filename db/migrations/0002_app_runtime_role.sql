do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime;
  end if;
end;
$$;

grant usage on schema public to app_runtime;

grant select, insert, update, delete on public.organizations to app_runtime;
grant select, insert, update, delete on public.profiles to app_runtime;
grant select, insert, update, delete on public.organization_units to app_runtime;
grant select, insert, update, delete on public.memberships to app_runtime;
grant select, insert, update, delete on public.roles to app_runtime;
grant select, insert, update, delete on public.permissions to app_runtime;
grant select, insert, update, delete on public.role_permissions to app_runtime;
grant select, insert, update, delete on public.membership_roles to app_runtime;
grant select, insert, update, delete on public.organization_relationships to app_runtime;
