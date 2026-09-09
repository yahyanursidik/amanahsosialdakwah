import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";

import {
  EmptyState,
  FilterBar,
  LoadingSkeleton,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/features/organizations/organization-context";
import type { OrganizationOption } from "@/features/organizations/organization-access";

const organizationTypeLabels: Record<string, string> = {
  distribution_partner: "Mitra penyaluran",
  grantor: "Pemberi amanah",
  institution: "Lembaga",
  internal: "Internal platform",
  manager: "Pengelola amanah",
};

function organizationTypeLabel(type?: string) {
  return type ? (organizationTypeLabels[type] ?? "Organisasi") : "Organisasi";
}

export function OrganizationHubPage() {
  const { activeOrganization, organizations, status, switchOrganization } =
    useOrganization();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const visibleOrganizations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");

    if (!query) {
      return organizations;
    }

    return organizations.filter(({ organization }) =>
      [organization.name, organization.code, organization.type]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("id-ID").includes(query)),
    );
  }, [organizations, search]);

  const openWorkspace = async (organizationId: string) => {
    setSwitchingId(organizationId);

    try {
      await switchOrganization(organizationId);
      navigate("/", { replace: true });
    } finally {
      setSwitchingId(null);
    }
  };

  const columns: ResourceTableColumn<OrganizationOption>[] = [
    {
      header: "Organisasi",
      key: "organization",
      render: ({ organization }) => (
        <div className="crm-contact-cell">
          <strong>{organization.name}</strong>
          <small>{organization.code}</small>
        </div>
      ),
    },
    {
      header: "Peran lembaga",
      key: "type",
      render: ({ organization }) => organizationTypeLabel(organization.type),
    },
    {
      header: "Konteks saat ini",
      key: "active",
      render: ({ organization }) =>
        activeOrganization?.organization.$id === organization.$id ? (
          <StatusBadge tone="success">Workspace terbuka</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Belum dipilih</StatusBadge>
        ),
    },
  ];

  if (status === "loading") {
    return (
      <section className="workspace-page" aria-label="Memuat pusat organisasi">
        <LoadingSkeleton lines={6} variant="table" />
      </section>
    );
  }

  return (
    <section
      className="workspace-page"
      aria-labelledby="organization-hub-title"
    >
      <PageHeader
        eyebrow="PLATFORM"
        title="Pusat organisasi"
        description="Pilih organisasi yang ingin dikelola. Data operasional baru ditampilkan setelah konteks kerja dipilih dan divalidasi server."
        meta={
          <StatusBadge tone="info">
            {organizations.length} organisasi dapat diakses
          </StatusBadge>
        }
      />

      <section
        className="workspace-actions"
        aria-labelledby="organization-hub-note"
      >
        <div className="workspace-section-heading">
          <div>
            <h2 id="organization-hub-note">Akses platform yang aman</h2>
            <p>
              Daftar ini hanya memuat organisasi dengan membership aktif Anda.
              Pemilihan organisasi tidak pernah dipercaya hanya dari browser.
            </p>
          </div>
          <ShieldCheck
            aria-hidden
            className="workspace-section-heading__icon"
          />
        </div>
      </section>

      <FilterBar
        searchLabel="Cari organisasi"
        searchPlaceholder="Cari nama, kode, atau jenis organisasi"
        searchValue={search}
        onSearchChange={setSearch}
      />
      <ResourceTable
        columns={columns}
        getRowId={({ organization }) => organization.$id}
        items={visibleOrganizations}
        empty={
          <EmptyState
            title="Tidak ada organisasi yang dapat diakses"
            description="Mintalah administrator platform untuk mengaktifkan membership organisasi Anda."
          />
        }
        rowActions={({ organization }) => {
          const isActive =
            activeOrganization?.organization.$id === organization.$id;
          const isSwitching = switchingId === organization.$id;

          return (
            <Button
              size="sm"
              variant={isActive ? "outline" : "default"}
              disabled={isSwitching}
              onClick={() => void openWorkspace(organization.$id)}
            >
              {isSwitching
                ? "Membuka…"
                : isActive
                  ? "Buka lagi"
                  : "Buka workspace"}
              <ArrowRight aria-hidden="true" size={16} />
            </Button>
          );
        }}
      />

      <p className="workspace-page__notice">
        <Building2 aria-hidden size={16} />
        Super admin tetap membutuhkan membership aktif pada tiap organisasi. Ini
        menjaga jejak audit dan isolasi tenant tanpa memberi akses silang secara
        diam-diam.
      </p>
    </section>
  );
}
