begin;

insert into public.profiles (id, auth_user_id, display_name, email)
values
  ('12000000-0000-0000-0000-000000000001', 'assessment-user-a', 'Assessment User A', 'assessment-a@example.test'),
  ('12000000-0000-0000-0000-000000000002', 'assessment-user-b', 'Assessment User B', 'assessment-b@example.test'),
  ('12000000-0000-0000-0000-000000000003', 'assessment-no-permission', 'Assessment No Permission', 'assessment-none@example.test');

insert into public.organizations (id, code, name, type)
values
  ('22000000-0000-0000-0000-000000000001', 'ASM-ORG-A', 'Assessment Org A', 'manager'),
  ('22000000-0000-0000-0000-000000000002', 'ASM-ORG-B', 'Assessment Org B', 'manager');

insert into public.memberships (id, organization_id, profile_id, status)
values
  ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'active'),
  ('32000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'active'),
  ('32000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', 'active');

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
  '32000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000002'
)
  and role.organization_id is null
  and role.key = 'organization_owner';

insert into public.programs (
  id,
  organization_id,
  code,
  name,
  target_beneficiary_type,
  fund_type,
  status,
  created_by
)
values
  ('42000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'ASM-PROGRAM-A', 'Assessment Program A', 'individual', 'general', 'active', '12000000-0000-0000-0000-000000000001'),
  ('42000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'ASM-PROGRAM-B', 'Assessment Program B', 'individual', 'general', 'active', '12000000-0000-0000-0000-000000000002');

insert into public.crm_contacts (
  id,
  organization_id,
  contact_type,
  display_name,
  normalized_name,
  status,
  created_by
)
values
  ('52000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'person', 'Assessment Beneficiary A', 'assessment beneficiary a', 'active', '12000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'person', 'Assessment Beneficiary B', 'assessment beneficiary b', 'active', '12000000-0000-0000-0000-000000000002');

insert into public.aid_applications (
  id,
  organization_id,
  reference_number,
  program_id,
  applicant_contact_id,
  channel,
  requested_support,
  status,
  created_by
)
values
  ('62000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'ASM-APP-A', '42000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'field', 'Kebutuhan asesmen tenant A', 'converted', '12000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'ASM-APP-B', '42000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'field', 'Kebutuhan asesmen tenant B', 'converted', '12000000-0000-0000-0000-000000000002');

insert into public.beneficiary_cases (
  id,
  organization_id,
  reference_number,
  application_id,
  program_id,
  beneficiary_contact_id,
  status,
  assigned_to,
  created_by
)
values
  ('72000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'ASM-CASE-A', '62000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'assessment', '12000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'ASM-CASE-B', '62000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'assessment', '12000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002');

insert into public.assessment_templates (
  id,
  organization_id,
  code,
  name,
  status,
  created_by
)
values
  ('82000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'ASM-TEMPLATE-A', 'Assessment Template A', 'active', '12000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'ASM-TEMPLATE-B', 'Assessment Template B', 'active', '12000000-0000-0000-0000-000000000002');

insert into public.assessment_template_versions (
  id,
  organization_id,
  template_id,
  version_number,
  status,
  passing_score,
  max_score,
  created_by
)
values
  ('92000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 1, 'published', 50, 100, '12000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', 1, 'published', 50, 100, '12000000-0000-0000-0000-000000000002');

insert into public.case_assessments (
  id,
  organization_id,
  reference_number,
  case_id,
  template_version_id,
  assessor_profile_id,
  max_score,
  created_by
)
values
  ('a2000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'ASM-TEST-A', '72000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 100, '12000000-0000-0000-0000-000000000001'),
  ('a2000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'ASM-TEST-B', '72000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 100, '12000000-0000-0000-0000-000000000002');

do $$
begin
  begin
    insert into public.case_assessments (
      id,
      organization_id,
      reference_number,
      case_id,
      template_version_id,
      assessor_profile_id,
      max_score,
      created_by
    )
    values (
      'a2000000-0000-0000-0000-000000000003',
      '22000000-0000-0000-0000-000000000001',
      'ASM-CROSS-TENANT',
      '72000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000001',
      '12000000-0000-0000-0000-000000000001',
      100,
      '12000000-0000-0000-0000-000000000001'
    );
    raise exception 'Cross-tenant case relation unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '12000000-0000-0000-0000-000000000001', true);
select set_config('app.current_organization_id', '22000000-0000-0000-0000-000000000001', true);
set local role app_runtime;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.case_assessments;

  if visible_count <> 1 then
    raise exception 'Expected one assessment for tenant A, got %', visible_count;
  end if;

  if exists (
    select 1
    from public.case_assessments
    where id = 'a2000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Tenant A can read tenant B assessment';
  end if;

  begin
    delete from public.case_assessments
    where id = 'a2000000-0000-0000-0000-000000000001';
    raise exception 'Assessment hard delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id', '12000000-0000-0000-0000-000000000003', true);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.case_assessments;

  if visible_count <> 0 then
    raise exception 'User without assessments.read can see % assessment(s)', visible_count;
  end if;
end;
$$;

rollback;
