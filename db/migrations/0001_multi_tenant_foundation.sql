create extension if not exists pgcrypto;

create schema if not exists private;

create or replace function private.current_profile_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_profile_id', true), '')::uuid
$$;

create or replace function private.current_organization_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_organization_id', true), '')::uuid
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  legal_name text,
  type text not null default 'manager',
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_status_check check (status in ('active', 'inactive', 'archived')),
  constraint organizations_type_check check (type in ('grantor', 'manager', 'distribution_partner', 'institution', 'internal'))
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text not null unique,
  display_name text not null,
  email text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_status_check check (status in ('active', 'inactive', 'suspended'))
);

alter table public.organizations
  add constraint organizations_created_by_fkey
  foreign key (created_by) references public.profiles(id)
  on delete set null;

create table if not exists public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.organization_units(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_units_unique_code_per_org unique (organization_id, code),
  constraint organization_units_status_check check (status in ('active', 'inactive', 'archived'))
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_unit_id uuid references public.organization_units(id) on delete set null,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_unique_profile_per_org unique (organization_id, profile_id),
  constraint memberships_status_check check (status in ('active', 'inactive', 'invited', 'suspended'))
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_unique_key_per_scope unique (organization_id, key)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_permissions_unique unique (role_id, permission_id)
);

create table if not exists public.membership_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_roles_unique unique (membership_id, role_id)
);

create table if not exists public.organization_relationships (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  relationship_type text not null,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_relationships_not_self check (source_organization_id <> target_organization_id),
  constraint organization_relationships_unique unique (source_organization_id, target_organization_id, relationship_type),
  constraint organization_relationships_status_check check (status in ('active', 'inactive', 'archived'))
);

create index if not exists idx_organization_units_org on public.organization_units(organization_id);
create index if not exists idx_organization_units_parent on public.organization_units(parent_id);
create index if not exists idx_memberships_org_profile_status on public.memberships(organization_id, profile_id, status);
create index if not exists idx_memberships_profile_status on public.memberships(profile_id, status);
create index if not exists idx_roles_org_key on public.roles(organization_id, key);
create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_role_permissions_permission on public.role_permissions(permission_id);
create index if not exists idx_membership_roles_membership on public.membership_roles(membership_id);
create index if not exists idx_membership_roles_org on public.membership_roles(organization_id);
create index if not exists idx_org_relationships_source on public.organization_relationships(source_organization_id);
create index if not exists idx_org_relationships_target on public.organization_relationships(target_organization_id);

create or replace function private.has_active_membership(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_organization_id
      and m.profile_id = private.current_profile_id()
      and m.status = 'active'
  )
$$;

create or replace function private.has_permission(target_organization_id uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.organization_id = target_organization_id
      and mr.organization_id = target_organization_id
      and m.profile_id = private.current_profile_id()
      and m.status = 'active'
      and p.key = permission_key
  )
$$;

create or replace function private.can_manage_membership(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select private.has_permission(target_organization_id, 'memberships.manage')
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime;
  end if;
end;
$$;

grant usage on schema public to app_runtime;
grant app_runtime to current_user;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations',
    'profiles',
    'organization_units',
    'memberships',
    'roles',
    'permissions',
    'role_permissions',
    'membership_roles',
    'organization_relationships'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to app_runtime', table_name);
    execute format('drop trigger if exists trg_%I_touch_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select using (private.has_active_membership(id));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
for insert with check (private.current_profile_id() is not null);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update using (private.has_permission(id, 'organizations.manage'))
with check (private.has_permission(id, 'organizations.manage'));

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
for delete using (private.has_permission(id, 'organizations.delete'));

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
for select using (id = private.current_profile_id());

drop policy if exists profiles_select_same_org on public.profiles;
create policy profiles_select_same_org on public.profiles
for select using (
  exists (
    select 1
    from public.memberships own_membership
    join public.memberships peer_membership
      on peer_membership.organization_id = own_membership.organization_id
    where own_membership.profile_id = private.current_profile_id()
      and own_membership.status = 'active'
      and peer_membership.profile_id = profiles.id
      and peer_membership.status = 'active'
  )
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert with check (id = private.current_profile_id());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update using (id = private.current_profile_id())
with check (id = private.current_profile_id());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
for delete using (false);

drop policy if exists organization_units_select on public.organization_units;
create policy organization_units_select on public.organization_units
for select using (private.has_active_membership(organization_id));

drop policy if exists organization_units_insert on public.organization_units;
create policy organization_units_insert on public.organization_units
for insert with check (private.has_permission(organization_id, 'organization_units.manage'));

drop policy if exists organization_units_update on public.organization_units;
create policy organization_units_update on public.organization_units
for update using (private.has_permission(organization_id, 'organization_units.manage'))
with check (private.has_permission(organization_id, 'organization_units.manage'));

drop policy if exists organization_units_delete on public.organization_units;
create policy organization_units_delete on public.organization_units
for delete using (private.has_permission(organization_id, 'organization_units.delete'));

drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
for select using (private.has_active_membership(organization_id));

drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships
for insert with check (private.can_manage_membership(organization_id));

drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships
for update using (private.can_manage_membership(organization_id))
with check (private.can_manage_membership(organization_id));

drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships
for delete using (private.has_permission(organization_id, 'memberships.delete'));

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
for select using (organization_id is null or private.has_active_membership(organization_id));

drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles
for insert with check (organization_id is not null and private.has_permission(organization_id, 'roles.manage'));

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles
for update using (organization_id is not null and private.has_permission(organization_id, 'roles.manage'))
with check (organization_id is not null and private.has_permission(organization_id, 'roles.manage'));

drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles
for delete using (organization_id is not null and private.has_permission(organization_id, 'roles.delete'));

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
for select using (private.current_profile_id() is not null);

drop policy if exists permissions_insert on public.permissions;
create policy permissions_insert on public.permissions
for insert with check (false);

drop policy if exists permissions_update on public.permissions;
create policy permissions_update on public.permissions
for update using (false) with check (false);

drop policy if exists permissions_delete on public.permissions;
create policy permissions_delete on public.permissions
for delete using (false);

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
for select using (organization_id is null or private.has_active_membership(organization_id));

drop policy if exists role_permissions_insert on public.role_permissions;
create policy role_permissions_insert on public.role_permissions
for insert with check (organization_id is not null and private.has_permission(organization_id, 'roles.manage'));

drop policy if exists role_permissions_update on public.role_permissions;
create policy role_permissions_update on public.role_permissions
for update using (organization_id is not null and private.has_permission(organization_id, 'roles.manage'))
with check (organization_id is not null and private.has_permission(organization_id, 'roles.manage'));

drop policy if exists role_permissions_delete on public.role_permissions;
create policy role_permissions_delete on public.role_permissions
for delete using (organization_id is not null and private.has_permission(organization_id, 'roles.manage'));

drop policy if exists membership_roles_select on public.membership_roles;
create policy membership_roles_select on public.membership_roles
for select using (private.has_active_membership(organization_id));

drop policy if exists membership_roles_insert on public.membership_roles;
create policy membership_roles_insert on public.membership_roles
for insert with check (private.has_permission(organization_id, 'memberships.manage'));

drop policy if exists membership_roles_update on public.membership_roles;
create policy membership_roles_update on public.membership_roles
for update using (private.has_permission(organization_id, 'memberships.manage'))
with check (private.has_permission(organization_id, 'memberships.manage'));

drop policy if exists membership_roles_delete on public.membership_roles;
create policy membership_roles_delete on public.membership_roles
for delete using (private.has_permission(organization_id, 'memberships.manage'));

drop policy if exists organization_relationships_select on public.organization_relationships;
create policy organization_relationships_select on public.organization_relationships
for select using (
  private.has_active_membership(source_organization_id)
  or private.has_active_membership(target_organization_id)
);

drop policy if exists organization_relationships_insert on public.organization_relationships;
create policy organization_relationships_insert on public.organization_relationships
for insert with check (private.has_permission(source_organization_id, 'organization_relationships.manage'));

drop policy if exists organization_relationships_update on public.organization_relationships;
create policy organization_relationships_update on public.organization_relationships
for update using (private.has_permission(source_organization_id, 'organization_relationships.manage'))
with check (private.has_permission(source_organization_id, 'organization_relationships.manage'));

drop policy if exists organization_relationships_delete on public.organization_relationships;
create policy organization_relationships_delete on public.organization_relationships
for delete using (private.has_permission(source_organization_id, 'organization_relationships.delete'));
