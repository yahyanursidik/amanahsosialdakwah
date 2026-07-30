import { describe, expect, it, vi } from "vitest";

import type { ActiveOrganization, OrganizationAccessRepository } from "./organization-access";
import { resolveOrganizationAccess } from "./organization-access";

function organization(id: string): ActiveOrganization {
  return {
    $collectionId: "organizations",
    $createdAt: "2026-01-01T00:00:00.000Z",
    $databaseId: "neon",
    $id: id,
    $permissions: [],
    $updatedAt: "2026-01-01T00:00:00.000Z",
    code: id,
    name: `Organisasi ${id}`,
    status: "active",
    type: "manager",
  };
}

const user = {
  $id: "profile-a",
  authUserId: "auth-user-a",
  email: "user@example.org",
  id: "profile-a",
  name: "User A",
};

describe("resolveOrganizationAccess", () => {
  it("tidak mempercayai preferred organization tanpa membership database", async () => {
    const repository: OrganizationAccessRepository = {
      getAccess: vi.fn(async () => ({
        user,
        organizations: [
          {
            membershipId: "membership-a",
            organization: organization("organization-a"),
          },
        ],
      })),
    };

    const result = await resolveOrganizationAccess(
      repository,
      "organization-palsu-dari-storage",
    );

    expect(result.activeOrganization?.organization.$id).toBe("organization-a");
  });

  it("memilih preferred organization hanya jika server mengembalikannya sebagai membership aktif", async () => {
    const repository: OrganizationAccessRepository = {
      getAccess: vi.fn(async () => ({
        user,
        organizations: [
          {
            membershipId: "membership-a",
            organization: organization("organization-a"),
          },
          {
            membershipId: "membership-b",
            organization: organization("organization-b"),
          },
        ],
      })),
    };

    const result = await resolveOrganizationAccess(repository, "organization-b");

    expect(result.activeOrganization?.organization.$id).toBe("organization-b");
  });

  it("tidak menyamarkan kegagalan jaringan sebagai membership nonaktif", async () => {
    const repository: OrganizationAccessRepository = {
      getAccess: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    };

    await expect(
      resolveOrganizationAccess(repository, "organization-a"),
    ).rejects.toThrow("network unavailable");
  });
});
