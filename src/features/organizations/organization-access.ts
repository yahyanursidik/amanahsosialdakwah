import { apiFetch } from "@/lib/neon/http";
import type { NeonAuthUser } from "@/providers/auth-provider";

export type NeonDocument = {
  readonly $collectionId: string;
  readonly $createdAt: string;
  readonly $databaseId: string;
  readonly $id: string;
  readonly $permissions: string[];
  readonly $updatedAt: string;
};

export type ActiveOrganization = NeonDocument & {
  code: string;
  legal_name?: string | null;
  name: string;
  status: "active" | "inactive" | "archived" | "suspended";
  type?: string;
};

export type OrganizationOption = {
  membershipId: string;
  organization: ActiveOrganization;
};

export type OrganizationAccessResult = {
  activeOrganization: OrganizationOption | null;
  organizations: OrganizationOption[];
  user: NeonAuthUser;
};

export type MeOrganizationResponse = {
  organizations: OrganizationOption[];
  user: NeonAuthUser;
};

export type OrganizationAccessRepository = {
  getAccess(): Promise<MeOrganizationResponse>;
};

export const organizationAccessRepository: OrganizationAccessRepository = {
  getAccess() {
    return apiFetch<MeOrganizationResponse>("/api/me");
  },
};

export async function resolveOrganizationAccess(
  repository: OrganizationAccessRepository,
  preferredOrganizationId: string | null,
): Promise<OrganizationAccessResult> {
  const access = await repository.getAccess();
  const organizations = access.organizations.sort((left, right) =>
    left.organization.name.localeCompare(right.organization.name, "id"),
  );
  const activeOrganization =
    organizations.find(
      (item) => item.organization.$id === preferredOrganizationId,
    ) ??
    organizations[0] ??
    null;

  return {
    activeOrganization,
    organizations,
    user: access.user,
  };
}
