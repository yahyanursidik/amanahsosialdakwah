import type {
  AccessControlProvider,
  CanParams,
  CanReturnType,
} from "@refinedev/core";

import { getCurrentAccessContext } from "@/features/access-control/access-context";
import {
  permissionResolverRepository,
  resolvePermission,
  type PermissionResolverRepository,
} from "@/features/access-control/permission-resolver";

function resourceNameFromParams(params: CanParams) {
  return params.resource ?? params.params?.resource?.name;
}

export function createAccessControlProvider(
  repository: PermissionResolverRepository = permissionResolverRepository,
): AccessControlProvider {
  return {
    async can(params): Promise<CanReturnType> {
      const resource = resourceNameFromParams(params);
      const decision = await resolvePermission(repository, {
        action: params.action,
        context: getCurrentAccessContext(),
        ...(resource ? { resource } : {}),
      });

      return decision;
    },
    options: {
      buttons: {
        enableAccessControl: true,
        hideIfUnauthorized: true,
      },
      queryOptions: {
        staleTime: 0,
      },
    },
  };
}

export const accessControlProvider = createAccessControlProvider();
