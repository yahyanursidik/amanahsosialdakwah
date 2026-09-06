import {
  ensureProfileAndBootstrap,
  requireSession,
  sendError,
  sendJson,
  toClientDocument,
  withRuntimeContext,
} from "../server/_shared/neon.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method tidak didukung.");
    return;
  }

  try {
    const { user } = await requireSession(request);
    const profile = await ensureProfileAndBootstrap(user);
    const memberships = await withRuntimeContext(
      profile.id,
      null,
      async (client) => {
        const result = await client.query(`
          select
            m.id as membership_id,
            o.*,
            coalesce(granted_permissions.permission_keys, '{}'::text[])
              as permission_keys
          from public.memberships m
          join public.organizations o on o.id = m.organization_id
          left join lateral (
            select array_agg(distinct permission.key order by permission.key)
              as permission_keys
            from public.membership_roles membership_role
            join public.roles role on role.id = membership_role.role_id
            join public.role_permissions role_permission
              on role_permission.role_id = role.id
            join public.permissions permission
              on permission.id = role_permission.permission_id
            where membership_role.membership_id = m.id
              and membership_role.organization_id = m.organization_id
              and (role.organization_id is null or role.organization_id = m.organization_id)
              and (
                role_permission.organization_id is null
                or role_permission.organization_id = m.organization_id
              )
          ) granted_permissions on true
          where m.profile_id = private.current_profile_id()
            and m.status = 'active'
            and o.status = 'active'
          order by o.name asc
        `);

        return result.rows.map(
          ({ membership_id, permission_keys, ...organization }) => ({
            membershipId: membership_id,
            organization: toClientDocument("organizations", organization),
            permissionKeys: permission_keys,
          }),
        );
      },
    );

    sendJson(response, 200, {
      user: {
        $id: profile.id,
        id: profile.id,
        authUserId: user.id,
        email: profile.email,
        name: profile.display_name,
      },
      profile: toClientDocument("profiles", profile),
      organizations: memberships,
    });
  } catch (error) {
    sendError(response, error.statusCode ?? 500, error.message ?? "Gagal memuat profil.");
  }
}
