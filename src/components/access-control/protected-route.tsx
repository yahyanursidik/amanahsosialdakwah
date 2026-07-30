import { Navigate, Outlet, useLocation } from "react-router";

import { AccessDeniedState, AccessLoadingState } from "./can-access";
import { useCan } from "@/features/access-control/use-can";
import type { AccessAction } from "@/features/access-control/permission-resolver";

export type ProtectedRouteProps = {
  action: AccessAction;
  resource: string;
};

export function ProtectedRoute({ action, resource }: ProtectedRouteProps) {
  const location = useLocation();
  const permission = useCan({ action, resource });

  if (permission.isLoading || permission.isPending) {
    return (
      <main className="system-page" aria-busy="true">
        <div className="system-page__inner">
          <AccessLoadingState />
        </div>
      </main>
    );
  }

  if (!permission.data?.can) {
    return (
      <Navigate
        to="/unauthorized?reason=permission"
        state={{ from: location.pathname, reason: permission.data?.reason }}
        replace
      />
    );
  }

  return <Outlet />;
}

export function ProtectedRouteDeniedPreview() {
  return (
    <main className="system-page">
      <div className="system-page__inner">
        <AccessDeniedState />
      </div>
    </main>
  );
}
