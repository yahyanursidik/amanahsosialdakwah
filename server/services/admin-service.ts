import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type {
  AddMemberInput,
  OrganizationProfileInput,
  RoleInput,
  UpdateMemberInput,
} from "../routes/admin-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const OWNER_ROLE = "organization_owner";

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

export async function getOrganizationProfile(context: RequestContext) {
  requirePermission(context, "organizations.read");
  return withTenantTransaction(context, async (_database, client) => {
    const organization = (
      await client.query<Row>(
        `select id, code, name, legal_name, type, status, created_at, updated_at
         from public.organizations where id = $1`,
        [context.organizationId],
      )
    ).rows[0] ?? missing("Organisasi tidak ditemukan.");
    const stats = (
      await client.query<Row>(
        `select
           (select count(*)::int from public.memberships where organization_id = $1 and status = 'active') as active_members,
           (select count(*)::int from public.programs where organization_id = $1 and not is_archived) as programs,
           (select count(*)::int from public.crm_contacts where organization_id = $1 and status = 'active') as contacts,
           (select count(*)::int from public.roles where organization_id = $1) as custom_roles`,
        [context.organizationId],
      )
    ).rows[0];
    return { ...organization, stats };
  });
}

export async function updateOrganizationProfile(context: RequestContext, input: OrganizationProfileInput) {
  requirePermission(context, "organizations.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = (
      await client.query<Row>(`select id, name, legal_name from public.organizations where id = $1`, [
        context.organizationId,
      ])
    ).rows[0] ?? missing("Organisasi tidak ditemukan.");
    const updated = await client.query<Row>(
      `update public.organizations set name = $1, legal_name = $2, updated_at = now()
       where id = $3 returning id, code, name, legal_name, type, status`,
      [input.name, input.legal_name ?? null, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "organization.profile_updated",
      after: updated.rows[0],
      before,
      entityId: context.organizationId,
      entityType: "organization",
    });
    return updated.rows[0];
  });
}

export async function listMembers(context: RequestContext) {
  requirePermission(context, "memberships.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select membership.id, membership.status, membership.joined_at, membership.profile_id,
              profile.display_name, profile.email,
              coalesce(json_agg(json_build_object('id', role.id, 'key', role.key, 'name', role.name)
                         order by role.name) filter (where role.id is not null), '[]') as roles,
              (select max(event.occurred_at) from public.audit_events event
               where event.organization_id = membership.organization_id
                 and event.actor_profile_id = membership.profile_id) as last_activity_at
       from public.memberships membership
       join public.profiles profile on profile.id = membership.profile_id
       left join public.membership_roles membership_role
         on membership_role.membership_id = membership.id
        and membership_role.organization_id = membership.organization_id
       left join public.roles role on role.id = membership_role.role_id
       where membership.organization_id = $1
       group by membership.id, profile.id
       order by (membership.status = 'active') desc, profile.display_name`,
      [context.organizationId],
    );
    return result.rows;
  });
}

async function assertRoles(client: PoolClient, context: RequestContext, roleIds: string[]) {
  const found = await client.query<{ id: string; key: string }>(
    `select id, key from public.roles
     where id = any($1::uuid[]) and (organization_id is null or organization_id = $2)`,
    [roleIds, context.organizationId],
  );
  if (found.rows.length !== new Set(roleIds).size) {
    throw new DomainError("VALIDATION_ERROR", "Sebagian peran tidak ditemukan.", 400);
  }
  return found.rows;
}

async function replaceMemberRoles(
  client: PoolClient,
  context: RequestContext,
  membershipId: string,
  roleIds: string[],
) {
  await client.query(
    `delete from public.membership_roles where membership_id = $1 and organization_id = $2`,
    [membershipId, context.organizationId],
  );
  for (const roleId of new Set(roleIds)) {
    await client.query(
      `insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
       values ($1, $2, $3, $4)`,
      [context.organizationId, membershipId, roleId, context.profileId],
    );
  }
}

/** Organisasi harus selalu punya minimal satu pemilik aktif. */
async function assertOwnerRemains(client: PoolClient, context: RequestContext) {
  const owners = await client.query<{ count: number }>(
    `select count(*)::int as count
     from public.memberships membership
     join public.membership_roles membership_role
       on membership_role.membership_id = membership.id and membership_role.organization_id = membership.organization_id
     join public.roles role on role.id = membership_role.role_id
     where membership.organization_id = $1 and membership.status = 'active' and role.key = $2`,
    [context.organizationId, OWNER_ROLE],
  );
  if ((owners.rows[0]?.count ?? 0) === 0) {
    throw new DomainError(
      "INVALID_STATE",
      "Organisasi harus memiliki minimal satu Pemilik Organisasi yang aktif.",
      409,
    );
  }
}

export async function addMember(context: RequestContext, input: AddMemberInput) {
  requirePermission(context, "memberships.manage");
  return withTenantTransaction(context, async (database, client) => {
    await assertRoles(client, context, input.role_ids);
    const profile = (
      await client.query<{ id: string; display_name: string; status: string }>(
        `select * from private.lookup_profile_for_membership($1, $2)`,
        [context.organizationId, input.email],
      )
    ).rows[0];
    if (!profile) {
      throw new DomainError(
        "NOT_FOUND",
        "Email ini belum pernah masuk ke aplikasi. Minta yang bersangkutan mendaftar/masuk sekali, lalu tambahkan lagi.",
        404,
      );
    }
    if (profile.status !== "active") {
      throw new DomainError("INVALID_STATE", "Akun pengguna ini sedang tidak aktif.", 409);
    }
    const membership = (
      await client.query<Row>(
        `insert into public.memberships (organization_id, profile_id, status, created_by)
         values ($1, $2, 'active', $3)
         on conflict (organization_id, profile_id) do update set status = 'active', updated_at = now()
         returning id`,
        [context.organizationId, profile.id, context.profileId],
      )
    ).rows[0]!;
    await replaceMemberRoles(client, context, membership.id, input.role_ids);
    await insertAuditEvent(database, context, {
      action: "membership.added",
      after: { email: input.email, roles: input.role_ids },
      entityId: membership.id,
      entityType: "membership",
    });
    return { id: membership.id, name: profile.display_name };
  });
}

export async function updateMember(context: RequestContext, membershipId: string, input: UpdateMemberInput) {
  requirePermission(context, "memberships.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = (
      await client.query<Row>(
        `select id, profile_id, status from public.memberships where id = $1 and organization_id = $2 for update`,
        [membershipId, context.organizationId],
      )
    ).rows[0] ?? missing("Anggota tidak ditemukan.");
    if (before.profile_id === context.profileId && input.status !== "active") {
      throw new DomainError("INVALID_STATE", "Anda tidak dapat menonaktifkan akun Anda sendiri.", 409);
    }
    await assertRoles(client, context, input.role_ids);
    await client.query(
      `update public.memberships set status = $1, updated_at = now() where id = $2 and organization_id = $3`,
      [input.status, membershipId, context.organizationId],
    );
    await replaceMemberRoles(client, context, membershipId, input.role_ids);
    await assertOwnerRemains(client, context);
    await insertAuditEvent(database, context, {
      action: "membership.updated",
      after: input,
      before,
      entityId: membershipId,
      entityType: "membership",
    });
    return { id: membershipId };
  });
}

export async function listRolesWithPermissions(context: RequestContext) {
  requirePermission(context, "roles.read");
  return withTenantTransaction(context, async (_database, client) => {
    const [roles, permissions] = await Promise.all([
      client.query<Row>(
        `select role.id, role.key, role.name, role.description, role.is_system,
                role.organization_id is null as is_global,
                coalesce((select array_agg(permission.key order by permission.key)
                          from public.role_permissions role_permission
                          join public.permissions permission on permission.id = role_permission.permission_id
                          where role_permission.role_id = role.id), '{}') as permission_keys,
                (select count(*)::int from public.membership_roles membership_role
                 join public.memberships membership
                   on membership.id = membership_role.membership_id and membership.status = 'active'
                 where membership_role.role_id = role.id and membership_role.organization_id = $1) as member_count
         from public.roles role
         where role.organization_id is null or role.organization_id = $1
         order by role.organization_id nulls first, role.name`,
        [context.organizationId],
      ),
      client.query<Row>(
        `select id, key, resource, action, description from public.permissions order by resource, action`,
      ),
    ]);
    return { permissions: permissions.rows, roles: roles.rows };
  });
}

function roleKey(name: string) {
  return `custom_${name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)}`;
}

async function replaceRolePermissions(
  client: PoolClient,
  context: RequestContext,
  roleId: string,
  permissionKeys: string[],
) {
  const permissions = await client.query<{ id: string }>(
    `select id from public.permissions where key = any($1::text[])`,
    [permissionKeys],
  );
  if (permissions.rows.length !== new Set(permissionKeys).size) {
    throw new DomainError("VALIDATION_ERROR", "Sebagian hak akses tidak dikenal.", 400);
  }
  await client.query(`delete from public.role_permissions where role_id = $1 and organization_id = $2`, [
    roleId,
    context.organizationId,
  ]);
  for (const permission of permissions.rows) {
    await client.query(
      `insert into public.role_permissions (organization_id, role_id, permission_id, created_by)
       values ($1, $2, $3, $4)`,
      [context.organizationId, roleId, permission.id, context.profileId],
    );
  }
}

export async function createRole(context: RequestContext, input: RoleInput) {
  requirePermission(context, "roles.manage");
  return withTenantTransaction(context, async (database, client) => {
    const created = await client
      .query<Row>(
        `insert into public.roles (organization_id, key, name, description, is_system, created_by)
         values ($1, $2, $3, $4, false, $5) returning id`,
        [context.organizationId, roleKey(input.name), input.name, input.description ?? null, context.profileId],
      )
      .catch((error: unknown) => {
        if ((error as { code?: string }).code === "23505") {
          throw new DomainError("CONFLICT", "Nama peran sudah dipakai.", 409);
        }
        throw error;
      });
    const id = created.rows[0]!.id;
    await replaceRolePermissions(client, context, id, input.permission_keys);
    await insertAuditEvent(database, context, {
      action: "role.created",
      after: input,
      entityId: id,
      entityType: "role",
    });
    return { id };
  });
}

export async function updateRole(context: RequestContext, roleId: string, input: RoleInput) {
  requirePermission(context, "roles.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = (
      await client.query<Row>(`select * from public.roles where id = $1 and organization_id = $2`, [
        roleId,
        context.organizationId,
      ])
    ).rows[0];
    if (!before) {
      throw new DomainError("FORBIDDEN", "Peran bawaan sistem tidak dapat diubah; duplikat menjadi peran khusus.", 403);
    }
    await client.query(
      `update public.roles set name = $1, description = $2, updated_at = now() where id = $3 and organization_id = $4`,
      [input.name, input.description ?? null, roleId, context.organizationId],
    );
    await replaceRolePermissions(client, context, roleId, input.permission_keys);
    await insertAuditEvent(database, context, {
      action: "role.updated",
      after: input,
      before,
      entityId: roleId,
      entityType: "role",
    });
    return { id: roleId };
  });
}
