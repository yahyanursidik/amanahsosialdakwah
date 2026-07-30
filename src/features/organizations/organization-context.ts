import { createContext, useContext } from "react";

import type { NeonAuthUser } from "@/providers/auth-provider";

import type { OrganizationOption } from "./organization-access";

export type OrganizationContextValue = {
  activeOrganization: OrganizationOption | null;
  error: Error | null;
  organizations: OrganizationOption[];
  refresh(): Promise<void>;
  status: "loading" | "ready" | "error";
  switchOrganization(organizationId: string): Promise<void>;
  user: NeonAuthUser | null;
};

export const OrganizationContext =
  createContext<OrganizationContextValue | null>(null);

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganization harus digunakan di dalam provider.");
  }

  return context;
}
