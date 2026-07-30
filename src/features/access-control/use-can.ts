import { useCan as useRefineCan } from "@refinedev/core";

import { useOrganization } from "@/features/organizations/organization-context";

import type { AccessAction } from "./permission-resolver";

export type UseCanParams = {
  action: AccessAction;
  resource: string;
};

export function useCan({ action, resource }: UseCanParams) {
  const organization = useOrganization();
  const activeOrganization = organization.activeOrganization;
  const userId = organization.user?.$id;
  const enabled =
    organization.status === "ready" && !!activeOrganization && !!userId;
  const query = useRefineCan({
    action,
    resource,
    params: {
      membershipId: activeOrganization?.membershipId,
      organizationId: activeOrganization?.organization.$id,
      userId,
    },
    queryOptions: {
      enabled,
    },
  });

  if (organization.status === "loading") {
    return {
      ...query,
      data: undefined,
      isLoading: true,
      isPending: true,
    };
  }

  if (!enabled) {
    return {
      ...query,
      data: {
        can: false,
        reason: "Konteks organisasi aktif belum tersedia.",
      },
      isLoading: false,
      isPending: false,
    };
  }

  return query;
}
