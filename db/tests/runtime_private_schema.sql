begin;

select set_config(
  'app.current_profile_id',
  '19000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'app.current_organization_id',
  '29000000-0000-0000-0000-000000000001',
  true
);

set local role app_runtime;

do $$
begin
  if private.current_profile_id()
     <> '19000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'Runtime role cannot resolve current profile context';
  end if;

  if private.current_organization_id()
     <> '29000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'Runtime role cannot resolve current organization context';
  end if;

  perform private.has_active_membership(
    '29000000-0000-0000-0000-000000000001'::uuid
  );
  perform private.has_permission(
    '29000000-0000-0000-0000-000000000001'::uuid,
    'organizations.read'
  );
end;
$$;

rollback;
