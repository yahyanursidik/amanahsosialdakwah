import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import {
  DetailSection,
  EmptyState,
  ErrorState,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  StakeholderRole,
  StakeholderSummary,
  StakeholderSummaryRow,
} from "@/features/reports/types";
import { apiFetch } from "@/lib/neon/http";

const roleTabs: Array<{
  description: string;
  label: string;
  value: StakeholderRole;
}> = [
  {
    description:
      "Donatur & wakif: dana, barang, dan setoran wakaf dalam periode. Klik nama untuk laporan pribadi yang dapat dicetak.",
    label: "Donatur & wakif",
    value: "donor",
  },
  {
    description:
      "Lembaga mitra penyalur: penugasan program, kesiapan, dan paket yang disalurkan.",
    label: "Mitra penyalur",
    value: "distribution_partner",
  },
  {
    description:
      "Individu & lembaga pengaju (termasuk mitra yang mengajukan atas nama penerima): jumlah pengajuan dan hasil seleksi.",
    label: "Pengaju",
    value: "applicant",
  },
];

const ranges = [
  { label: "30 hari", value: "30d" },
  { label: "90 hari", value: "90d" },
  { label: "1 tahun", value: "365d" },
] as const;

const nameColumn: ResourceTableColumn<StakeholderSummaryRow> = {
  header: "Nama",
  key: "name",
  render: (item) => (
    <div className="crm-contact-cell">
      <Link to={`/reports/stakeholders/${item.id}`}>
        <strong>{item.display_name}</strong>
      </Link>
      <small>
        {item.contact_type === "institution" ? "Lembaga" : item.contact_type ? "Individu" : item.city ?? ""}
      </small>
    </div>
  ),
};

const money = (value?: string) => <MoneyDisplay amount={value ?? "0"} currency="IDR" />;

const columnsByRole: Record<StakeholderRole, ResourceTableColumn<StakeholderSummaryRow>[]> = {
  applicant: [
    nameColumn,
    { align: "right", header: "Pengajuan", key: "applications", render: (item) => item.applications },
    { align: "right", header: "Atas nama penerima", key: "behalf", render: (item) => item.on_behalf_applications },
    { align: "right", header: "Diterima", key: "accepted", render: (item) => item.accepted },
    { align: "right", header: "Diproses", key: "progress", render: (item) => item.in_progress },
    { align: "right", header: "Ditolak", key: "rejected", render: (item) => item.rejected },
    { align: "right", header: "Penerima", key: "beneficiaries", render: (item) => item.beneficiaries },
    { align: "right", header: "Usulan wakaf", key: "waqf", render: (item) => item.waqf_proposals },
  ],
  distribution_partner: [
    nameColumn,
    { align: "right", header: "Program", key: "programs", render: (item) => item.program_count },
    { align: "right", header: "Tugas aktif", key: "active", render: (item) => item.active_assignments },
    { align: "right", header: "Siap/menerima", key: "ready", render: (item) => item.ready_assignments },
    { align: "right", header: "Penerima dilayani", key: "fulfillments", render: (item) => item.fulfillments },
    { align: "right", header: "Paket", key: "packages", render: (item) => item.packages },
  ],
  donor: [
    nameColumn,
    { align: "right", header: "Dana", key: "cash", render: (item) => money(item.cash_amount) },
    { align: "right", header: "Barang (estimasi)", key: "goods", render: (item) => money(item.goods_value) },
    { align: "right", header: "Wakaf", key: "waqf", render: (item) => money(item.waqf_amount) },
    { align: "right", header: "Total", key: "total", render: (item) => money(item.total_value) },
    {
      align: "right",
      header: "Transaksi",
      key: "count",
      render: (item) => (item.cash_count ?? 0) + (item.goods_count ?? 0) + (item.waqf_count ?? 0),
    },
  ],
};

export function StakeholderReportPage() {
  const [params, setParams] = useSearchParams();
  const role = (params.get("role") as StakeholderRole | null) ?? "donor";
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("90d");
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const report = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      apiFetch<{ data: StakeholderSummary }>(
        `/api/v1/reports/stakeholders?role=${role}&range=${range}`,
      ),
    queryKey: ["reports", "stakeholders", organizationId, role, range],
  });
  const tab = roleTabs.find((item) => item.value === role) ?? roleTabs[0]!;
  const anonymous = report.data?.data.anonymous;

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Laporan"
        title="Laporan pemangku kepentingan"
        description="Transparansi untuk pemberi amanah, mitra penyalur, dan pengaju. Setiap nama memiliki laporan pribadi yang dapat dicetak dan dibagikan."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} to="/reports">
            <ArrowLeft aria-hidden size={16} /> Ringkasan organisasi
          </Link>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="report-range" role="tablist" aria-label="Peran">
          {roleTabs.map((item) => (
            <Button
              aria-selected={role === item.value}
              key={item.value}
              role="tab"
              size="sm"
              variant={role === item.value ? "default" : "outline"}
              onClick={() => setParams({ role: item.value })}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="report-range" aria-label="Rentang laporan">
          {ranges.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={range === item.value ? "default" : "outline"}
              onClick={() => setRange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{tab.description}</p>

      {report.isError ? (
        <ErrorState
          title="Laporan belum dapat dimuat"
          description="Laporan ini membutuhkan izin laporan pemangku kepentingan serta akses baca modul terkait."
          onRetry={() => report.refetch()}
        />
      ) : (
        <ResourceTable
          columns={columnsByRole[role]}
          getRowId={(item) => item.id}
          isLoading={report.isLoading}
          items={report.data?.data.data ?? []}
          empty={
            <EmptyState
              title="Belum ada data pada periode ini"
              description="Pastikan transaksi ditautkan ke kontak terdaftar agar muncul di laporan."
            />
          }
          rowActions={(item) => (
            <Link
              className={buttonVariants({ size: "sm", variant: "ghost" })}
              to={`/reports/stakeholders/${item.id}`}
            >
              <FileText aria-hidden size={16} />
              <span className="sr-only">Laporan {item.display_name}</span>
            </Link>
          )}
        />
      )}

      {role === "donor" && anonymous ? (
        <DetailSection
          title="Pemberian anonim / tanpa kontak"
          description="Pemberian yang tidak ditautkan ke kontak (Hamba Allah atau belum terdaftar)."
          items={[
            { label: "Dana", value: money(anonymous.cash_amount) },
            { label: "Barang (estimasi)", value: money(anonymous.goods_value) },
            { label: "Wakaf", value: money(anonymous.waqf_amount) },
          ]}
        />
      ) : null}
    </section>
  );
}
