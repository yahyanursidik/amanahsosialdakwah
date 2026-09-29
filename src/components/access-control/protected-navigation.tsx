import { NavLink } from "react-router";
import {
  BookOpenCheck,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  FolderHeart,
  FileCheck2,
  FileStack,
  FileText,
  Gift,
  GitPullRequestArrow,
  HandCoins,
  SlidersHorizontal,
  HandHeart,
  HeartHandshake,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  NotebookPen,
  Layers3,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  Route,
  Sprout,
  ShieldAlert,
  ListChecks,
  Smartphone,
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
        icon: Smartphone,
        label: "Tugas lapangan",
        resource: "field_reports",
        to: "/field",
        end: true,
      },
      {
        action: "read",
        icon: NotebookPen,
        label: "Laporan lapangan",
        resource: "field_reports",
        to: "/field/reports",
      },
      {
        action: "manage",
        icon: ListChecks,
        label: "Kelola tugas",
        resource: "field_tasks",
        to: "/field/tasks",
      },
      {
        action: "manage",
        icon: SlidersHorizontal,
        label: "Pengaturan lapangan",
        resource: "field_settings",
        to: "/field/settings",
      },
    ],
    label: "Lapangan",
  },
  {
    items: [
      {
        action: "read",
        icon: HandHeart,
        label: "Donatur & wakif",
        resource: "donors",
        to: "/donors",
      },
      {
        action: "read",
        icon: Landmark,
        label: "Dana amanah",
        resource: "fund_ledger",
        to: "/funds",
      },
      {
        action: "read",
        icon: Gift,
        label: "Donasi barang",
        resource: "in_kind_donations",
        to: "/in-kind-donations",
      },
      {
        action: "read",
        icon: Sprout,
        label: "Wakaf & setoran wakif",
        resource: "waqf",
        to: "/waqf",
      },
      {
        action: "read",
        icon: HandCoins,
        label: "Kafalah",
        resource: "kafalah",
        to: "/kafalah",
      },
    ],
    label: "Penghimpunan",
  },
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
        icon: HandHeart,
        label: "Penerima manfaat",
        resource: "crm_beneficiary_profiles",
        to: "/beneficiaries",
      },
      {
        action: "read",
        icon: ClipboardList,
        label: "Pengajuan bantuan",
        resource: "applications",
        to: "/applications",
      },
      {
        action: "read",
        icon: FileStack,
        label: "Pengajuan program wakaf",
        resource: "waqf",
        to: "/waqf/proposals",
      },
      {
        action: "read",
        icon: FolderHeart,
        label: "Kasus penerima",
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
    label: "Program & pengajuan",
  },
  {
    items: [
      {
        action: "read",
        icon: Truck,
        label: "Distribusi",
        resource: "distributions",
        to: "/distributions",
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
        icon: Route,
        label: "Logistik",
        resource: "logistics_shipments",
        to: "/logistics",
      },
      {
        action: "read",
        icon: PackageSearch,
        label: "Inventory & gudang",
        resource: "inventory_balances",
        to: "/inventory",
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
        icon: FileCheck2,
        label: "Bukti & dokumen",
        resource: "evidence_files",
        to: "/evidence",
      },
    ],
    label: "Penyaluran",
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
        icon: UsersRound,
        label: "Mitra & pengaju",
        resource: "crm_contact_roles",
        to: "/crm/partners",
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
        end: true,
        icon: ChartNoAxesCombined,
        label: "Laporan & dashboard",
        resource: "reports",
        to: "/reports",
      },
      {
        action: "read",
        icon: FileText,
        label: "Donatur, mitra & pengaju",
        resource: "stakeholder_reports",
        to: "/reports/stakeholders",
      },
      {
        action: "read",
        icon: ShieldAlert,
        label: "Audit & risiko",
        resource: "risk_flags",
        to: "/governance",
      },
    ],
    label: "Laporan",
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
      <NavLink className="protected-navigation__home" to="/guide">
        <BookOpenCheck aria-hidden="true" size={18} />
        <span>Panduan alur</span>
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
                  <NavLink end={"end" in item} to={item.to}>
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
