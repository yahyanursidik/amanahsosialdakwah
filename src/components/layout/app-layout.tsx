import { Outlet } from "react-router";

import { ProtectedNavigation } from "@/components/access-control/protected-navigation";
import { OrganizationSwitcher } from "@/features/organizations/organization-switcher";

import { UserMenu } from "./user-menu";

export function AppLayout() {
  return (
    <div className="app-layout">
      <aside className="app-layout__sidebar" aria-label="Navigasi aplikasi">
        <span
          className="auth-brand app-layout__brand"
          aria-label="Amanah Sosial-Dakwah"
        >
          <span className="auth-brand__mark" aria-hidden="true">
            AS
          </span>
          <span>
            Amanah
            <small>Sosial-Dakwah</small>
          </span>
        </span>
        <OrganizationSwitcher variant="sidebar" />
        <ProtectedNavigation />
      </aside>
      <div className="app-layout__main">
        <header className="app-layout__header">
          <span
            className="auth-brand app-layout__mobile-brand"
            aria-label="Amanah Sosial-Dakwah"
          >
            <span className="auth-brand__mark" aria-hidden="true">
              AS
            </span>
            <span>Amanah</span>
          </span>
          <div className="app-layout__mobile-switcher">
            <OrganizationSwitcher variant="compact" />
          </div>
          <div className="app-layout__actions">
            <UserMenu />
          </div>
        </header>
        <div className="app-layout__mobile-navigation">
          <ProtectedNavigation />
        </div>
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
