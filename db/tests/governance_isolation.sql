begin;

insert into public.profiles (id, auth_user_id, display_name, email) values
  ('1c000000-0000-0000-0000-000000000001','governance-user-a','Governance User A','governance-a@example.test'),
  ('1c000000-0000-0000-0000-000000000002','governance-user-b','Governance User B','governance-b@example.test'),
  ('1c000000-0000-0000-0000-000000000003','governance-field','Governance Field','governance-field@example.test');

insert into public.organizations (id, code, name, type) values
  ('2c000000-0000-0000-0000-000000000001','GOV-ORG-A','Governance Org A','manager'),
  ('2c000000-0000-0000-0000-000000000002','GOV-ORG-B','Governance Org B','manager');

insert into public.memberships (id, organization_id, profile_id, status) values
  ('3c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000001','active'),
  ('3c000000-0000-0000-0000-000000000002','2c000000-0000-0000-0000-000000000002','1c000000-0000-0000-0000-000000000002','active'),
  ('3c000000-0000-0000-0000-000000000003','2c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000003','active');

insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
select membership.organization_id, membership.id, role.id, membership.profile_id
from public.memberships membership join public.roles role on role.organization_id is null
where (membership.id in ('3c000000-0000-0000-0000-000000000001','3c000000-0000-0000-0000-000000000002') and role.key='organization_owner')
   or (membership.id='3c000000-0000-0000-0000-000000000003' and role.key='field_officer');

insert into public.risk_flags (
  id, organization_id, reference_number, subject_type, risk_type, severity,
  title, description, response_due_at, resolution_due_at, created_by
) values
  ('4c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001','RSK-A','organization','operational','high','Risiko tenant A','Risiko operasional khusus tenant A.',now()+interval '8 hours',now()+interval '3 days','1c000000-0000-0000-0000-000000000001'),
  ('4c000000-0000-0000-0000-000000000002','2c000000-0000-0000-0000-000000000002','RSK-B','organization','financial','medium','Risiko tenant B','Risiko finansial khusus tenant B.',now()+interval '1 day',now()+interval '7 days','1c000000-0000-0000-0000-000000000002');

do $$
declare blocked boolean := false;
begin
  begin
    update public.risk_flags set status='accepted' where id='4c000000-0000-0000-0000-000000000001';
    update public.risk_flags set status='monitoring' where id='4c000000-0000-0000-0000-000000000001';
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Invalid backward risk transition unexpectedly succeeded'; end if;
end;
$$;

select set_config('app.current_profile_id','1c000000-0000-0000-0000-000000000001',true);
select set_config('app.current_organization_id','2c000000-0000-0000-0000-000000000001',true);
set local role app_runtime;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.risk_flags;
  if visible_count <> 1 then raise exception 'Expected one tenant risk, got %', visible_count; end if;
  if exists (select 1 from public.risk_flags where id='4c000000-0000-0000-0000-000000000002') then
    raise exception 'Tenant A can read tenant B risk';
  end if;
  begin
    delete from public.risk_flags where id='4c000000-0000-0000-0000-000000000001';
    if not exists (select 1 from public.risk_flags where id='4c000000-0000-0000-0000-000000000001') then
      raise exception 'Risk hard delete unexpectedly succeeded';
    end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('app.current_profile_id','1c000000-0000-0000-0000-000000000003',true);
do $$
begin
  if exists (select 1 from public.risk_flags) then
    raise exception 'Field officer can read risk register without permission';
  end if;
  if not private.has_permission('2c000000-0000-0000-0000-000000000001','governance_incidents.report') then
    raise exception 'Field officer cannot report incident';
  end if;
end;
$$;

rollback;
