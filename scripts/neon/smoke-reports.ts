import { getDatabasePool } from "../../server/db/client";
import { getOrganizationReport } from "../../server/services/report-service";

const pool = getDatabasePool();
const email = process.env.NEON_SMOKE_EMAIL ?? "admin@ihsanuladab.or.id";

try {
  const identity = await pool.query<{
    membership_id: string;
    organization_id: string;
    profile_id: string;
    user_id: string;
  }>(
    `select membership.id as membership_id, membership.organization_id,
            profile.id as profile_id, profile.auth_user_id as user_id
     from public.profiles profile
     join public.memberships membership on membership.profile_id = profile.id
     join public.organizations organization on organization.id = membership.organization_id
     where lower(profile.email) = lower($1) and membership.status = 'active'
       and organization.code = 'IHSANUL-ADAB'
     limit 1`,
    [email],
  );
  const actor = identity.rows[0];
  if (!actor) throw new Error("Akun smoke test production tidak ditemukan.");

  const permissionResult = await pool.query<{ key: string }>(
    `select distinct permission.key
     from public.membership_roles membership_role
     join public.roles role on role.id = membership_role.role_id
     join public.role_permissions role_permission on role_permission.role_id = role.id
     join public.permissions permission on permission.id = role_permission.permission_id
     where membership_role.membership_id = $1
       and membership_role.organization_id = $2
       and (role.organization_id is null or role.organization_id = $2)
       and (role_permission.organization_id is null or role_permission.organization_id = $2)`,
    [actor.membership_id, actor.organization_id],
  );

  const report = await getOrganizationReport(
    {
      membershipId: actor.membership_id,
      organizationId: actor.organization_id,
      permissions: new Set(permissionResult.rows.map((row) => row.key)),
      profileId: actor.profile_id,
      requestId: crypto.randomUUID(),
      userId: actor.user_id,
    },
    { range: "30d" },
  );

  console.log(
    `Smoke report lulus: ${report.availableSections.length} bagian, ${report.actionItems.length} kategori tindak lanjut.`,
  );
} finally {
  await pool.end();
}
