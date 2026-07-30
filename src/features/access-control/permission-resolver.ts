import { apiFetch } from "@/lib/neon/http";

export type AccessAction =
  "read" | "manage" | "create" | "edit" | "delete" | "list" | "show" | string;

export type AccessContext = {
  membershipId: string;
  organizationId: string;
  userId: string;
};

export type PermissionCheck = {
  action: AccessAction;
  context: AccessContext | null;
  resource?: string;
};

export type PermissionDecision = {
  can: boolean;
  reason?: string;
};

export type NeonDocument = {
  readonly $collectionId: string;
  readonly $createdAt: string;
  readonly $databaseId: string;
  readonly $id: string;
  readonly $permissions: string[];
  readonly $updatedAt: string;
};

export type MembershipDocument = NeonDocument & {
  organization_id: string;
  profile_id: string;
  status: string;
};

export type MembershipRoleDocument = NeonDocument & {
  membership_id: string;
  organization_id: string;
  role_id: string;
};

export type RoleDocument = NeonDocument & {
  key: string;
  name: string;
  organization_id?: string | null;
  scope?: string;
  status?: string;
};

export type RolePermissionDocument = NeonDocument & {
  organization_id?: string | null;
  permission_id: string;
  role_id: string;
};

export type PermissionDocument = NeonDocument & {
  action?: string;
  key: string;
  name?: string;
  resource?: string;
  scope?: string;
};

export type PermissionResolverRepository = {
  getMembership(membershipId: string): Promise<MembershipDocument>;
  listMembershipRoles(
    organizationId: string,
    membershipId: string,
  ): Promise<MembershipRoleDocument[]>;
  listPermissions(permissionIds: string[]): Promise<PermissionDocument[]>;
  listRolePermissions(roleIds: string[]): Promise<RolePermissionDocument[]>;
  listRoles(roleIds: string[]): Promise<RoleDocument[]>;
};

type ApiDataResponse<T> = {
  data: T;
};

type ApiListResponse<T> = {
  data: T[];
  total: number;
};

function dataRequest<T>(body: Record<string, unknown>) {
  return apiFetch<T>("/api/data", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const permissionResolverRepository: PermissionResolverRepository = {
  async getMembership(membershipId) {
    const result = await dataRequest<ApiDataResponse<MembershipDocument>>({
      operation: "getOne",
      resource: "memberships",
      id: membershipId,
    });

    return result.data;
  },
  async listMembershipRoles(organizationId, membershipId) {
    const result = await dataRequest<ApiListResponse<MembershipRoleDocument>>({
      operation: "getList",
      resource: "membership_roles",
      filters: [
        { field: "organization_id", operator: "eq", value: organizationId },
        { field: "membership_id", operator: "eq", value: membershipId },
      ],
      pagination: { currentPage: 1, pageSize: 100 },
    });

    return result.data;
  },
  async listPermissions(permissionIds) {
    if (permissionIds.length === 0) {
      return [];
    }

    const result = await dataRequest<ApiListResponse<PermissionDocument>>({
      operation: "getList",
      resource: "permissions",
      filters: [{ field: "id", operator: "in", value: permissionIds }],
      pagination: { currentPage: 1, pageSize: 100 },
    });

    return result.data;
  },
  async listRolePermissions(roleIds) {
    if (roleIds.length === 0) {
      return [];
    }

    const result = await dataRequest<ApiListResponse<RolePermissionDocument>>({
      operation: "getList",
      resource: "role_permissions",
      filters: [{ field: "role_id", operator: "in", value: roleIds }],
      pagination: { currentPage: 1, pageSize: 100 },
    });

    return result.data;
  },
  async listRoles(roleIds) {
    if (roleIds.length === 0) {
      return [];
    }

    const result = await dataRequest<ApiListResponse<RoleDocument>>({
      operation: "getList",
      resource: "roles",
      filters: [{ field: "id", operator: "in", value: roleIds }],
      pagination: { currentPage: 1, pageSize: 100 },
    });

    return result.data;
  },
};

const actionAliases: Record<string, "read" | "manage"> = {
  create: "manage",
  delete: "manage",
  edit: "manage",
  list: "read",
  show: "read",
};

function normalizeAction(action: AccessAction): string {
  return actionAliases[action] ?? action;
}

function permissionKeyFor(resource: string | undefined, action: AccessAction) {
  const normalizedAction = normalizeAction(action);

  if (!resource) {
    return null;
  }

  return `${resource}.${normalizedAction}`;
}

function isRoleInScope(role: RoleDocument, organizationId: string) {
  return (
    (role.status === undefined || role.status === "active") &&
    (role.organization_id === organizationId ||
      role.organization_id === undefined ||
      role.organization_id === null)
  );
}

function isRolePermissionInScope(
  rolePermission: RolePermissionDocument,
  organizationId: string,
) {
  return (
    rolePermission.organization_id === organizationId ||
    rolePermission.organization_id === undefined ||
    rolePermission.organization_id === null
  );
}

export async function resolvePermission(
  repository: PermissionResolverRepository,
  check: PermissionCheck,
): Promise<PermissionDecision> {
  if (!check.context) {
    return {
      can: false,
      reason: "Konteks organisasi aktif belum tersedia.",
    };
  }

  const context = check.context;
  const requiredPermissionKey = permissionKeyFor(check.resource, check.action);

  if (!requiredPermissionKey) {
    return {
      can: false,
      reason: "Resource tidak didefinisikan.",
    };
  }

  const membership = await repository.getMembership(context.membershipId);

  if (
    membership.status !== "active" ||
    membership.organization_id !== context.organizationId ||
    membership.profile_id !== context.userId
  ) {
    return {
      can: false,
      reason: "Membership organisasi tidak aktif atau tidak sesuai.",
    };
  }

  const membershipRoles = await repository.listMembershipRoles(
    context.organizationId,
    context.membershipId,
  );
  const roleIds = [...new Set(membershipRoles.map((item) => item.role_id))];
  const roles = await repository.listRoles(roleIds);
  const scopedRoleIds = new Set(
    roles
      .filter((role) => isRoleInScope(role, context.organizationId))
      .map((role) => role.$id),
  );

  if (scopedRoleIds.size === 0) {
    return {
      can: false,
      reason: "Membership belum memiliki role aktif.",
    };
  }

  const rolePermissions = await repository.listRolePermissions([
    ...scopedRoleIds,
  ]);
  const scopedPermissionIds = [
    ...new Set(
      rolePermissions
        .filter(
          (rolePermission) =>
            scopedRoleIds.has(rolePermission.role_id) &&
            isRolePermissionInScope(rolePermission, context.organizationId),
        )
        .map((rolePermission) => rolePermission.permission_id),
    ),
  ];
  const permissions = await repository.listPermissions(scopedPermissionIds);
  const grantedPermissionKeys = new Set(
    permissions.map((permission) => permission.key),
  );

  if (grantedPermissionKeys.has(requiredPermissionKey)) {
    return { can: true };
  }

  return {
    can: false,
    reason: `Permission ${requiredPermissionKey} belum diberikan.`,
  };
}
