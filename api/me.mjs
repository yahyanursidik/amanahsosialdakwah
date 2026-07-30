import {
  ensureProfileAndBootstrap,
  requireSession,
  sendError,
  sendJson,
  toClientDocument,
  withRuntimeContext,
} from "./_shared/neon.mjs";

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
            o.*
          from public.memberships m
          join public.organizations o on o.id = m.organization_id
          where m.profile_id = private.current_profile_id()
            and m.status = 'active'
            and o.status = 'active'
          order by o.name asc
        `);

        return result.rows.map((row) => ({
          membershipId: row.membership_id,
          organization: toClientDocument("organizations", row),
        }));
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
