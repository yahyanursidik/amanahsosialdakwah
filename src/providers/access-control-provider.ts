import type {
  AccessControlProvider,
  CanParams,
  CanReturnType,
} from "@refinedev/core";

import { getCurrentAccessContext } from "@/features/access-control/access-context";
import type {
  AccessAction,
  AccessContext,
  PermissionDecision,
} from "@/features/access-control/permission-resolver";
import { apiFetch } from "@/lib/neon/http";

export type AccessDecisionRepository = {
  can(check: {
    action: AccessAction;
    context: AccessContext;
    resource: string;
  }): Promise<PermissionDecision>;
};

export const accessDecisionRepository: AccessDecisionRepository = {
  can(check) {
    return apiFetch<PermissionDecision>("/api/access/can", {
      body: JSON.stringify({
        action: check.action,
        organizationId: check.context.organizationId,
        resource: check.resource,
      }),
      method: "POST",
    });
  },
};

function resourceNameFromParams(params: CanParams) {
  return params.resource ?? params.params?.resource?.name;
}

export function createAccessControlProvider(
  repository: AccessDecisionRepository = accessDecisionRepository,
): AccessControlProvider {
  return {
    async can(params): Promise<CanReturnType> {
      const resource = resourceNameFromParams(params);
      const context = getCurrentAccessContext();

      if (!context) {
        return {
          can: false,
          reason: "Konteks organisasi aktif belum tersedia.",
        };
      }

      if (!resource) {
        return {
          can: false,
          reason: "Resource tidak didefinisikan.",
        };
      }

      const decision = await repository.can({
        action: params.action,
        context,
        resource,
      });

      return decision;
    },
    options: {
      buttons: {
        enableAccessControl: true,
        hideIfUnauthorized: true,
      },
      queryOptions: {
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
      },
    },
  };
}

export const accessControlProvider = createAccessControlProvider();
