import { Navigate, Outlet, useLocation } from "react-router";

import { Button } from "@/components/ui/button";

import { useOrganization } from "./organization-context";

export function OrganizationGuard() {
  const location = useLocation();
  const organization = useOrganization();

  if (organization.status === "loading") {
    return (
      <main className="system-page" aria-busy="true">
        <div className="system-page__inner">
          <p>Memvalidasi membership organisasi…</p>
        </div>
      </main>
    );
  }

  if (organization.status === "error") {
    return (
      <main className="system-page">
        <div className="system-page__inner">
          <span className="system-page__code">KONEKSI</span>
          <h1>Konteks organisasi belum dapat diverifikasi.</h1>
          <p>
            Akses ditutup sementara karena status membership tidak dapat
            divalidasi ke Neon/Postgres.
          </p>
          <div className="system-page__actions">
            <Button onClick={() => void organization.refresh()}>
              Coba lagi
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!organization.activeOrganization) {
    return (
      <Navigate
        to="/unauthorized?reason=inactive-membership"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <Outlet />;
}
