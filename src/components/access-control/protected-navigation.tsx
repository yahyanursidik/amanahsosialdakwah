import { NavLink } from "react-router";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  FolderHeart,
  GitPullRequestArrow,
  HeartHandshake,
  KeyRound,
  Landmark,
  Layers3,
  PackageCheck,
  Truck,
  UsersRound,
} from "lucide-react";

import { CanAccess } from "./can-access";

const navigationItems = [
  {
    action: "read",
    icon: PackageCheck,
    label: "Pengadaan",
    resource: "procurement_requests",
    to: "/procurement",
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
    icon: Landmark,
    label: "Dana",
    resource: "fund_ledger",
    to: "/funds",
  },
  {
    action: "read",
    icon: GitPullRequestArrow,
    label: "Approval",
    resource: "approval_requests",
    to: "/approval-requests",
  },
  {
    action: "read",
    icon: Building2,
    label: "Organisasi",
    resource: "organizations",
    to: "/organizations",
  },
  {
    action: "read",
    icon: HeartHandshake,
    label: "CRM",
    resource: "crm_contacts",
    to: "/crm/contacts",
  },
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
    icon: UsersRound,
    label: "Membership",
    resource: "memberships",
    to: "/memberships",
  },
  {
    action: "read",
    icon: KeyRound,
    label: "Role",
    resource: "roles",
    to: "/roles",
  },
] as const;

export function ProtectedNavigation() {
  return (
    <nav className="protected-navigation" aria-label="Navigasi utama">
      {navigationItems.map((item) => {
        const Icon = item.icon;

        return (
          <CanAccess
            action={item.action}
            key={item.to}
            resource={item.resource}
          >
            <NavLink to={item.to}>
              <Icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </NavLink>
          </CanAccess>
        );
      })}
    </nav>
  );
}
