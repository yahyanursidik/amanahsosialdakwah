begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('13000000-0000-0000-0000-000000000001', 'approval-user-a', 'Approval User A', 'approval-a@example.test'),
  ('13000000-0000-0000-0000-000000000002', 'approval-user-b', 'Approval User B', 'approval-b@example.test'),
  ('13000000-0000-0000-0000-000000000003', 'approval-no-permission', 'Approval No Permission', 'approval-none@example.test');

insert into public.organizations (id, code, name, type)
values
  ('23000000-0000-0000-0000-000000000001', 'APR-ORG-A', 'Approval Org A', 'manager'),
  ('23000000-0000-0000-0000-000000000002', 'APR-ORG-B', 'Approval Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('33000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'active'),
  ('33000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'active'),
  ('33000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000003', 'active');

insert into public.membership_roles (
  organization_id,
  membership_id,
  role_id,
  created_by
)
select
  membership.organization_id,
  membership.id,
  role.id,
  membership.profile_id
from public.memberships membership
cross join public.roles role
where membership.id in (
  '33000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.approval_workflows (
  id, organization_id, code, name, resource_type, status, created_by
)
values
  ('43000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'APR-A', 'Approval A', 'case', 'active', '13000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'APR-B', 'Approval B', 'case', 'active', '13000000-0000-0000-0000-000000000002');

insert into public.approval_workflow_versions (
  id, organization_id, workflow_id, version_number, status, created_by
)
values
  ('53000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 1, 'draft', '13000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '43000000-0000-0000-0000-000000000002', 1, 'draft', '13000000-0000-0000-0000-000000000002');

insert into public.approval_workflow_steps (
  id, organization_id, workflow_version_id, position, name,
  required_permission, minimum_approvals, created_by
)
values
  ('63000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 1, 'Approver A', 'approval_requests.act', 1, '13000000-0000-0000-0000-000000000001'),
  ('63000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000002', 1, 'Approver B', 'approval_requests.act', 1, '13000000-0000-0000-0000-000000000002');

update public.approval_workflow_versions
set status = 'published'
where id in (
  '53000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000002'
);

insert into public.approval_requests (
  id, organization_id, reference_number, workflow_version_id,
  subject_type, subject_id, subject_snapshot, title, status, requested_by
)
values
  ('73000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'APR-TEST-A', '53000000-0000-0000-0000-000000000001', 'case', '83000000-0000-0000-0000-000000000001', '{"reference":"CASE-A"}', 'Request A', 'approved', '13000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'APR-TEST-B', '53000000-0000-0000-0000-000000000002', 'case', '83000000-0000-0000-0000-000000000002', '{"reference":"CASE-B"}', 'Request B', 'approved', '13000000-0000-0000-0000-000000000002');

do $$
declare
  mutation_blocked boolean := false;
begin
  begin
    insert into public.approval_requests (
      id, organization_id, reference_number, workflow_version_id,
      subject_type, subject_id, subject_snapshot, title, requested_by
    )
    values (
      '73000000-0000-0000-0000-000000000003',
      '23000000-0000-0000-0000-000000000001',
      'APR-CROSS-TENANT',
      '53000000-0000-0000-0000-000000000002',
      'case',
      '83000000-0000-0000-0000-000000000003',
      '{}',
      'Cross tenant',
      '13000000-0000-0000-0000-000000000001'
    );
    raise exception 'Cross-tenant workflow relation unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;

  begin
    update public.approval_requests
    set title = 'Mutated final request'
    where id = '73000000-0000-0000-0000-000000000001';
  exception
    when raise_exception then mutation_blocked := true;
  end;

  if not mutation_blocked then
    raise exception 'Final approval request mutation unexpectedly succeeded';
  end if;
end;
$$;

select set_config('app.current_profile_id', '13000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '23000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.approval_requests;

  if visible_count <> 1 then
    raise exception 'Expected one approval request for tenant A, got %', visible_count;
  end if;

  if exists (
    select 1 from public.approval_requests
    where id = '73000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B approval request';
  end if;

  begin
    delete from public.approval_requests
    where id = '73000000-0000-0000-0000-000000000001';
    raise exception 'Approval request hard delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '13000000-0000-0000-0000-000000000003', true);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.approval_requests;

  if visible_count <> 0 then
    raise exception 'User without approval_requests.read can see % request(s)', visible_count;
  end if;
end;
$$;

rollback;
