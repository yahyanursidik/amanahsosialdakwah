import { describe, expect, it, vi } from "vitest";

import type {
  MembershipDocument,
  MembershipRoleDocument,
  PermissionDocument,
  PermissionResolverRepository,
  RoleDocument,
  RolePermissionDocument,
} from "./permission-resolver";
import { resolvePermission } from "./permission-resolver";

function documentBase(collectionId: string, id: string) {
  return {
    $collectionId: collectionId,
    $createdAt: "2026-01-01T00:00:00.000Z",
    $databaseId: "amanah-local",
    $id: id,
    $permissions: [],
    $updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function membership(
  overrides: Partial<MembershipDocument> = {},
): MembershipDocument {
  return {
    ...documentBase("memberships", "membership-a"),
    organization_id: "organization-a",
    profile_id: "user-a",
    status: "active",
    ...overrides,
  };
}

function membershipRole(
  overrides: Partial<MembershipRoleDocument> = {},
): MembershipRoleDocument {
  return {
    ...documentBase("membership_roles", "membership-role-a"),
    membership_id: "membership-a",
    organization_id: "organization-a",
    role_id: "role-a",
    ...overrides,
  };
}

function role(overrides: Partial<RoleDocument> = {}): RoleDocument {
  return {
    ...documentBase("roles", "role-a"),
    key: "role-a",
    name: "Role A",
    scope: "organization",
    status: "active",
    ...overrides,
  };
}

function rolePermission(
  overrides: Partial<RolePermissionDocument> = {},
): RolePermissionDocument {
  return {
    ...documentBase("role_permissions", "role-permission-a"),
    permission_id: "permission-a",
    role_id: "role-a",
    ...overrides,
  };
}

function permission(
  overrides: Partial<PermissionDocument> = {},
): PermissionDocument {
  return {
    ...documentBase("permissions", "permission-a"),
    key: "memberships.read",
    name: "Lihat membership",
    scope: "organization",
    ...overrides,
  };
}

function repository(
  overrides: Partial<PermissionResolverRepository> = {},
): PermissionResolverRepository {
  return {
    getMembership: vi.fn(async () => membership()),
    listMembershipRoles: vi.fn(async () => [membershipRole()]),
    listPermissions: vi.fn(async () => [permission()]),
    listRolePermissions: vi.fn(async () => [rolePermission()]),
    listRoles: vi.fn(async () => [role()]),
    ...overrides,
  };
}

const context = {
  membershipId: "membership-a",
  organizationId: "organization-a",
  userId: "user-a",
};

describe("resolvePermission", () => {
  it("mengizinkan akses saat membership aktif memiliki permission resource/action", async () => {
    const result = await resolvePermission(repository(), {
      action: "read",
      context,
      resource: "memberships",
    });

    expect(result.can).toBe(true);
  });

  it("menolak akses ketika permission tidak diberikan", async () => {
    const result = await resolvePermission(
      repository({
        listPermissions: vi.fn(async () => [
          permission({ key: "memberships.read" }),
        ]),
      }),
      {
        action: "manage",
        context,
        resource: "memberships",
      },
    );

    expect(result.can).toBe(false);
    expect(result.reason).toContain("memberships.manage");
  });

  it("menolak akses ketika membership tidak aktif", async () => {
    const result = await resolvePermission(
      repository({
        getMembership: vi.fn(async () => membership({ status: "suspended" })),
      }),
      {
        action: "read",
        context,
        resource: "memberships",
      },
    );

    expect(result.can).toBe(false);
  });

  it("memetakan action list/show ke read dan create/edit/delete ke manage", async () => {
    const repo = repository({
      listPermissions: vi.fn(async () => [
        permission({ key: "memberships.manage" }),
      ]),
    });

    const result = await resolvePermission(repo, {
      action: "delete",
      context,
      resource: "memberships",
    });

    expect(result.can).toBe(true);
  });
});
