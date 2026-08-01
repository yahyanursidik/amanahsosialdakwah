import { NavLink } from "react-router";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  FolderHeart,
  FileCheck2,
  GitPullRequestArrow,
  HeartHandshake,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  Layers3,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  Tags,
  Truck,
  UsersRound,
  Workflow,
} from "lucide-react";

import { CanAccess } from "./can-access";

const navigationGroups = [
  {
    items: [
      {
        action: "read",
        icon: Layers3,
        label: "Program",
        resource: "programs",
        to: "/programs",
      },
      {
        action: "read",
        icon: ClipboardList,
        label: "Pengajuan",
        resource: "applications",
        to: "/applications",
      },
      {
        action: "read",
        icon: FolderHeart,
        label: "Kasus",
        resource: "cases",
        to: "/cases",
      },
      {
        action: "read",
        icon: ClipboardCheck,
        label: "Asesmen",
        resource: "assessments",
        to: "/assessments",
      },
      {
        action: "read",
        icon: GitPullRequestArrow,
        label: "Approval",
        resource: "approval_requests",
        to: "/approval-requests",
      },
    ],
    label: "Program & layanan",
  },
  {
    items: [
      {
        action: "read",
        icon: Landmark,
        label: "Dana amanah",
        resource: "fund_ledger",
        to: "/funds",
      },
      {
        action: "read",
        icon: PackageCheck,
        label: "Pengadaan",
        resource: "procurement_requests",
        to: "/procurement",
      },
      {
        action: "read",
        icon: PackageSearch,
        label: "Inventory",
        resource: "inventory_balances",
        to: "/inventory",
      },
      {
        action: "read",
        icon: PackageOpen,
        label: "Paket bantuan",
        resource: "aid_package_packings",
        to: "/aid-packages",
      },
      {
        action: "read",
        icon: Truck,
        label: "Logistik",
        resource: "logistics_shipments",
        to: "/logistics",
      },
      {
        action: "read",
        icon: Truck,
        label: "Distribusi",
        resource: "distributions",
        to: "/distributions",
      },
      {
        action: "read",
        icon: FileCheck2,
        label: "Bukti & dokumen",
        resource: "evidence_files",
        to: "/evidence",
      },
    ],
    label: "Operasional",
  },
  {
    items: [
      {
        action: "read",
        icon: HeartHandshake,
        label: "Contact master",
        resource: "crm_contacts",
        to: "/crm/contacts",
      },
      {
        action: "read",
        icon: Tags,
        label: "Tag CRM",
        resource: "crm_tags",
        to: "/crm/tags",
      },
    ],
    label: "Relasi",
  },
  {
    items: [
      {
        action: "read",
        icon: Building2,
        label: "Organisasi",
        resource: "organizations",
        to: "/organizations",
      },
      {
        action: "read",
        icon: UsersRound,
        label: "Membership",
        resource: "memberships",
        to: "/memberships",
      },
      {
        action: "read",
        icon: KeyRound,
        label: "Role & permission",
        resource: "roles",
        to: "/roles",
      },
      {
        action: "read",
        icon: Workflow,
        label: "Workflow approval",
        resource: "approval_workflows",
        to: "/approval-workflows",
      },
      {
        action: "read",
        icon: LayoutTemplate,
        label: "Template asesmen",
        resource: "assessment_templates",
        to: "/assessment-templates",
      },
    ],
    label: "Tata kelola",
  },
] as const;

export function ProtectedNavigation() {
  return (
    <nav className="protected-navigation" aria-label="Navigasi utama">
      <NavLink className="protected-navigation__home" end to="/">
        <LayoutDashboard aria-hidden="true" size={18} />
        <span>Ringkasan</span>
      </NavLink>

      {navigationGroups.map((group) => (
        <section className="protected-navigation__group" key={group.label}>
          <h2>{group.label}</h2>
          <div className="protected-navigation__items">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <CanAccess
                  action={item.action}
                  key={item.to}
                  loading={
                    <span
                      aria-hidden
                      className="protected-navigation__placeholder"
                    />
                  }
                  resource={item.resource}
                >
                  <NavLink to={item.to}>
                    <Icon aria-hidden="true" size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </CanAccess>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
