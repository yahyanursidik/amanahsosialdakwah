import { Menu, X } from "lucide-react";
import { useRef, useState } from "react";
import { Outlet } from "react-router";

import { ProtectedNavigation } from "@/components/access-control/protected-navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { OrganizationSwitcher } from "@/features/organizations/organization-switcher";

import { AppFooter } from "./app-footer";
import { UserMenu } from "./user-menu";

export function AppLayout() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);

  return (
    <div className="app-layout">
      <aside
        aria-label="Navigasi aplikasi"
        className="app-layout__sidebar"
        data-open={navigationOpen}
        id="app-navigation"
        ref={navigationRef}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) {
            setNavigationOpen(false);
          }
        }}
      >
        <div className="app-layout__sidebar-heading">
          <BrandLogo className="app-layout__brand" variant="white" />
          <button
            aria-label="Tutup navigasi"
            className="app-layout__sidebar-close"
            onClick={() => setNavigationOpen(false)}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <OrganizationSwitcher variant="sidebar" />
        <ProtectedNavigation />
        <p className="app-layout__sidebar-note">
          Menu ditampilkan sesuai permission organisasi aktif.
        </p>
      </aside>
      {navigationOpen ? (
        <button
          aria-label="Tutup navigasi"
          className="app-layout__scrim"
          onClick={() => setNavigationOpen(false)}
          type="button"
        />
      ) : null}
      <div className="app-layout__main">
        <header className="app-layout__header">
          <button
            aria-controls="app-navigation"
            aria-expanded={navigationOpen}
            aria-label="Buka navigasi"
            className="app-layout__menu-trigger"
            onClick={() => {
              if (navigationRef.current) {
                navigationRef.current.scrollTop = 0;
              }
              setNavigationOpen(true);
            }}
            type="button"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <div className="app-layout__header-copy">
            <strong>Ruang kerja organisasi</strong>
            <span>Amanah yang dapat ditelusuri</span>
          </div>
          <div className="app-layout__mobile-switcher">
            <OrganizationSwitcher variant="compact" />
          </div>
          <div className="app-layout__actions">
            <UserMenu />
          </div>
        </header>
        <main className="app-layout__content">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
