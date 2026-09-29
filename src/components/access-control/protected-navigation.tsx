import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  ChevronDown,
  Search,
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
        end: true,
        label: "Program",
        resource: "programs",
        to: "/programs",
      },
      {
        action: "manage",
        icon: Tags,
        label: "Kategori program",
        resource: "program_categories",
        to: "/programs/categories",
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
        label: "Semua kontak",
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
        label: "Tag kontak",
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
        label: "Laporan per donatur & mitra",
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
        label: "Anggota & peran",
        resource: "memberships",
        to: "/memberships",
      },
      {
        action: "read",
        icon: KeyRound,
        label: "Hak akses per peran",
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

const COLLAPSED_KEY = "amanah.navigation.collapsed";

function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Navigasi utama: grup dapat dilipat (diingat per perangkat), grup halaman
 * aktif selalu terbuka, dan pencarian cepat untuk melompat ke menu.
 */
export function ProtectedNavigation() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed);
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();

  const toggle = (label: string) => {
    setCollapsed((current) => {
      const next = { ...current, [label]: !current[label] };
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Penyimpanan lokal tidak tersedia; status lipat hanya berlaku sesi ini.
      }
      return next;
    });
  };

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
      <label className="protected-navigation__search">
        <Search aria-hidden size={15} />
        <input
          aria-label="Cari menu"
          placeholder="Cari menu…"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {navigationGroups.map((group) => {
        const items = search
          ? group.items.filter((item) => `${item.label} ${group.label}`.toLowerCase().includes(search))
          : group.items;
        if (items.length === 0) return null;
        const containsActive = group.items.some((item) => isActivePath(pathname, item.to));
        const open = Boolean(search) || containsActive || !collapsed[group.label];
        const groupId = `nav-group-${group.label.replace(/\W+/g, "-").toLowerCase()}`;
        return (
          <section className="protected-navigation__group" data-open={open} key={group.label}>
            <h2>
              <button
                aria-controls={groupId}
                aria-expanded={open}
                className="protected-navigation__group-toggle"
                type="button"
                onClick={() => toggle(group.label)}
              >
                <span>{group.label}</span>
                <ChevronDown aria-hidden size={14} />
              </button>
            </h2>
            {open ? (
              <div className="protected-navigation__items" id={groupId}>
                {items.map((item) => {
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
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
