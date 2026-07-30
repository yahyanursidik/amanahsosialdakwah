grant usage on schema private to app_runtime;

grant execute on function private.current_profile_id() to app_runtime;
grant execute on function private.current_organization_id() to app_runtime;
grant execute on function private.has_active_membership(uuid) to app_runtime;
grant execute on function private.has_permission(uuid, text) to app_runtime;
grant execute on function private.can_manage_membership(uuid) to app_runtime;
