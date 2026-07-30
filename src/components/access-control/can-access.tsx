import type { ReactNode } from "react";

import { useCan } from "@/features/access-control/use-can";
import type { AccessAction } from "@/features/access-control/permission-resolver";

export type CanAccessProps = {
  action: AccessAction;
  children: ReactNode;
  denied?: ReactNode;
  loading?: ReactNode;
  resource: string;
};

export function AccessDeniedState() {
  return (
    <div className="access-state" role="status">
      <span className="access-state__code">DITOLAK</span>
      <p>Akses tidak tersedia untuk permission ini.</p>
    </div>
  );
}

export function AccessLoadingState() {
  return (
    <div className="access-state" role="status" aria-busy="true">
      <span className="access-state__code">MEMERIKSA</span>
      <p>Memeriksa permission organisasi...</p>
    </div>
  );
}

export function CanAccess({
  action,
  children,
  denied = null,
  loading = null,
  resource,
}: CanAccessProps) {
  const permission = useCan({ action, resource });

  if (permission.isLoading || permission.isPending) {
    return <>{loading}</>;
  }

  if (!permission.data?.can) {
    return <>{denied}</>;
  }

  return <>{children}</>;
}
