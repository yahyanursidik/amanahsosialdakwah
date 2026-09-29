import { useList, useNavigation } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  HeartHandshake,
  Sprout,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type {
  BeneficiaryListItem,
  BeneficiarySummary,
} from "@/features/beneficiaries/types";
import {
  beneficiaryCategoryLabels,
  beneficiarySourceLabels,
  labelOf,
  optionsOf,
  vulnerabilityLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type { ProgramsDocument } from "@/generated/neon/models";
import { apiFetch } from "@/lib/neon/http";

function vulnerabilityTone(level: string | null) {
  if (level === "critical") return "danger" as const;
  if (level === "high") return "warning" as const;
  if (level === "low") return "success" as const;
  return "neutral" as const;
}

function completenessTone(value: number) {
  if (value >= 80) return "success" as const;
  if (value >= 50) return "warning" as const;
  return "danger" as const;
}

export function BeneficiaryListPage() {
  const { create, show } = useNavigation();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [vulnerability, setVulnerability] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const summary = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      apiFetch<{ data: BeneficiarySummary }>("/api/v1/beneficiaries/summary"),
    queryKey: ["beneficiaries", "summary", organizationId],
  });
  const programs = useList<ProgramsDocument>({
    resource: "programs",
    filters: [{ field: "is_archived", operator: "eq", value: false }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const beneficiaries = useList<BeneficiaryListItem>({
    resource: "beneficiaries",
    filters: [
      { field: "q", operator: "eq", value: search },
      { field: "program_id", operator: "eq", value: programId },
      { field: "source", operator: "eq", value: source },
      { field: "category", operator: "eq", value: category },
      { field: "vulnerability", operator: "eq", value: vulnerability },
    ],
    pagination: { currentPage: page, pageSize, mode: "server" },
  });
  const total = beneficiaries.result?.total ?? 0;
  const setFilter =
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setPage(1);
    };

  const columns: ResourceTableColumn<BeneficiaryListItem>[] = [
    {
      key: "name",
      header: "Penerima",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.display_name}</strong>
          <small>
            {[
              item.contact_type === "institution" ? "Lembaga" : null,
              item.identity_last4 ? `NIK ••••${item.identity_last4}` : null,
              item.primary_phone,
            ]
              .filter(Boolean)
              .join(" · ") || "Data kontak belum lengkap"}
          </small>
          <small>
            {[item.district, item.city].filter(Boolean).join(", ") ||
              "Alamat belum diisi"}
          </small>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.vulnerability_level ? (
            <StatusBadge tone={vulnerabilityTone(item.vulnerability_level)}>
              {labelOf(vulnerabilityLabels, item.vulnerability_level)}
            </StatusBadge>
          ) : null}
          {(item.beneficiary_categories ?? []).slice(0, 3).map((value) => (
            <StatusBadge key={value} tone="info">
              {labelOf(beneficiaryCategoryLabels, value)}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      key: "programs",
      header: "Program / sumber",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>
            {item.program_names.length > 0
              ? item.program_names.slice(0, 2).join(", ")
              : "Belum mengikuti program"}
            {item.program_names.length > 2
              ? ` +${item.program_names.length - 2}`
              : ""}
          </strong>
          <small>
            {item.sources.length > 0
              ? item.sources
                  .map((value) => labelOf(beneficiarySourceLabels, value))
                  .join(" · ")
              : "Terdaftar, belum menerima"}
          </small>
        </div>
      ),
    },
    {
      key: "received",
      header: "Bantuan diterima",
      align: "right",
      render: (item) => (
        <div className="crm-contact-cell">
          <MoneyDisplay
            amount={Number(item.cash_received) + Number(item.waqf_received)}
            currency="IDR"
            mutedZero
          />
          <small>
            {item.packages_received > 0
              ? `${item.packages_received} paket · `
              : ""}
            {item.last_aid_at
              ? `terakhir ${new Date(item.last_aid_at).toLocaleDateString("id-ID")}`
              : "belum ada penyaluran"}
          </small>
        </div>
      ),
    },
    {
      key: "completeness",
      header: "Profil",
      align: "right",
      render: (item) => (
        <StatusBadge tone={completenessTone(item.profile_completeness)}>
          {item.profile_completeness}%
        </StatusBadge>
      ),
    },
  ];

  const stats = summary.data?.data;
  const statCards = stats
    ? [
        { icon: UsersRound, label: "Total penerima", value: stats.total },
        { icon: HeartHandshake, label: "Sudah menerima bantuan", value: stats.reached },
        { icon: AlertTriangle, label: "Kerentanan tinggi/kritis", value: stats.high_vulnerability },
        { icon: Sprout, label: "Penerima manfaat wakaf", value: stats.waqf_beneficiaries },
      ]
    : [];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Program & pengajuan"
        title="Penerima manfaat"
        description="Data seluruh penerima dari semua program: donasi, paket bantuan, manfaat wakaf, dan kafalah. Setiap penerima memiliki profil lengkap dan riwayat bantuan."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="crm_beneficiary_profiles"
            onClick={() => create("beneficiaries")}
          >
            <UserPlus size={16} /> Tambah penerima
          </ProtectedActionButton>
        }
      />

      {statCards.length > 0 ? (
        <div className="report-metric-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="report-metric" key={card.label}>
                <Icon aria-hidden size={18} />
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Cari penerima"
          className="min-w-64 flex-1 rounded-xl border px-3 py-2"
          placeholder="Cari nama, telepon, kota, atau 4 digit terakhir NIK…"
          value={search}
          onChange={(event) => setFilter(setSearch)(event.target.value)}
        />
        <select
          aria-label="Program"
          className="rounded-xl border px-3 py-2"
          value={programId}
          onChange={(event) => setFilter(setProgramId)(event.target.value)}
        >
          <option value="">Semua program</option>
          {(programs.result?.data ?? []).map((program) => (
            <option key={program.$id} value={program.$id}>
              {program.code} — {program.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sumber"
          className="rounded-xl border px-3 py-2"
          value={source}
          onChange={(event) => setFilter(setSource)(event.target.value)}
        >
          <option value="">Semua sumber</option>
          {optionsOf(beneficiarySourceLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Kategori"
          className="rounded-xl border px-3 py-2"
          value={category}
          onChange={(event) => setFilter(setCategory)(event.target.value)}
        >
          <option value="">Semua kategori</option>
          {optionsOf(beneficiaryCategoryLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Kerentanan"
          className="rounded-xl border px-3 py-2"
          value={vulnerability}
          onChange={(event) => setFilter(setVulnerability)(event.target.value)}
        >
          <option value="">Semua kerentanan</option>
          {optionsOf(vulnerabilityLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {beneficiaries.query.isError ? (
        <ErrorState
          title="Data penerima tidak dapat dimuat"
          description="Periksa organisasi aktif dan izin melihat profil penerima."
          onRetry={() => beneficiaries.query.refetch()}
        />
      ) : (
        <ResourceTable
          ariaLabel="Daftar penerima manfaat"
          columns={columns}
          items={beneficiaries.result?.data ?? []}
          getRowId={(item) => item.id}
          isLoading={beneficiaries.query.isLoading}
          empty={
            <EmptyState
              title="Belum ada penerima yang cocok"
              description="Tambahkan penerima baru atau ubah filter pencarian."
            />
          }
          rowActions={(item) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => show("beneficiaries", item.id)}
            >
              <Eye aria-hidden size={16} />
              <span className="sr-only">Lihat {item.display_name}</span>
            </Button>
          )}
        />
      )}

      {total > pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <span>
            Menampilkan {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} dari {total} penerima
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              size="sm"
              variant="outline"
              onClick={() => setPage((value) => value - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              disabled={page * pageSize >= total}
              size="sm"
              variant="outline"
              onClick={() => setPage((value) => value + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
