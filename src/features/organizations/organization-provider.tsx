import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { setCurrentAccessContext } from "@/features/access-control/access-context";
import type { NeonAuthUser } from "@/providers/auth-provider";

import {
  clearActiveOrganizationPreference,
  readActiveOrganizationPreference,
  writeActiveOrganizationPreference,
} from "./active-organization-storage";
import {
  OrganizationContext,
  type OrganizationContextValue,
} from "./organization-context";
import {
  type OrganizationAccessRepository,
  type OrganizationOption,
  organizationAccessRepository,
  resolveOrganizationAccess,
} from "./organization-access";

type OrganizationProviderProps = {
  children: React.ReactNode;
  repository?: OrganizationAccessRepository;
};

export function OrganizationProvider({
  children,
  repository = organizationAccessRepository,
}: OrganizationProviderProps) {
  const [status, setStatus] =
    useState<OrganizationContextValue["status"]>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<NeonAuthUser | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [activeOrganization, setActiveOrganization] =
    useState<OrganizationOption | null>(null);
  const latestRequest = useRef(0);

  const commitAccess = useCallback(
    (
      currentUser: NeonAuthUser,
      organizationOptions: OrganizationOption[],
      selectedOrganization: OrganizationOption | null,
    ) => {
      setUser(currentUser);
      setOrganizations(organizationOptions);
      setActiveOrganization(selectedOrganization);
      setStatus("ready");
      setError(null);

      if (selectedOrganization) {
        setCurrentAccessContext({
          membershipId: selectedOrganization.membershipId,
          organizationId: selectedOrganization.organization.$id,
          userId: currentUser.$id,
        });
        writeActiveOrganizationPreference(selectedOrganization.organization.$id);
      } else {
        setCurrentAccessContext(null);
        clearActiveOrganizationPreference();
      }
    },
    [],
  );

  const load = useCallback(
    async (requestedOrganizationId?: string | null) => {
      const requestId = ++latestRequest.current;

      try {
        setStatus("loading");
        setError(null);
        const preferredOrganizationId =
          requestedOrganizationId === undefined
            ? readActiveOrganizationPreference()
            : requestedOrganizationId;
        const access = await resolveOrganizationAccess(
          repository,
          preferredOrganizationId,
        );

        if (requestId !== latestRequest.current) {
          return;
        }

        commitAccess(
          access.user,
          access.organizations,
          access.activeOrganization,
        );
      } catch (caughtError) {
        if (requestId !== latestRequest.current) {
          return;
        }

        setStatus("error");
        setCurrentAccessContext(null);
        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error("Konteks organisasi tidak dapat dimuat."),
        );
      }
    },
    [commitAccess, repository],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void load(activeOrganization?.organization.$id);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeOrganization?.organization.$id, load]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const access = await resolveOrganizationAccess(repository, organizationId);

      commitAccess(
        access.user,
        access.organizations,
        access.activeOrganization,
      );

      if (access.activeOrganization?.organization.$id !== organizationId) {
        throw new Error(
          "Membership organisasi tersebut tidak aktif atau tidak tersedia.",
        );
      }
    },
    [commitAccess, repository],
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      activeOrganization,
      error,
      organizations,
      refresh: () => load(activeOrganization?.organization.$id),
      status,
      switchOrganization,
      user,
    }),
    [
      activeOrganization,
      error,
      load,
      organizations,
      status,
      switchOrganization,
      user,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
