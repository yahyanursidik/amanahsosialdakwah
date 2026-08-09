import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CircleCheckBig,
  Clock3,
  Layers3,
  PackageSearch,
  Sprout,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type {
  MoneyTotal,
  OrganizationReportEnvelope,
} from "@/features/reports/types";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

const ranges = [
  { label: "30 hari", value: "30d" },
  { label: "90 hari", value: "90d" },
  { label: "1 tahun", value: "365d" },
] as const;

function MoneyTotals({ totals }: { totals: MoneyTotal[] }) {
  if (totals.length === 0) return <span className="report-empty-value">—</span>;
  return (
    <span className="report-money-list">
      {totals.map((total) => (
        <MoneyDisplay
          amount={total.amount}
          currency={total.currency}
          key={total.currency}
        />
      ))}
    </span>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("30d");
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const report = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      apiFetch<OrganizationReportEnvelope>(
        `/api/v1/reports/overview?range=${range}`,
      ),
    queryKey: ["reports", "overview", organizationId, range],
  });

  if (report.isLoading) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Laporan organisasi" title="Ringkasan amanah" />
        <LoadingSkeleton lines={8} />
      </section>
    );
  }

  if (report.isError || !report.data) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Laporan organisasi" title="Ringkasan amanah" />
        <ErrorState
          title="Laporan belum dapat dimuat"
          description="Periksa permission reports.read dan akses baca modul sumber."
          onRetry={() => report.refetch()}
        />
      </section>
    );
  }

  const data = report.data.data;
  const metricCards = [
    { icon: Layers3, label: "Program aktif", value: data.metrics.activePrograms },
    { icon: Clock3, label: "Kasus terbuka", value: data.metrics.openCases },
    { icon: CircleCheckBig, label: "Distribusi selesai", value: data.metrics.completedDistributions },
    { icon: PackageSearch, label: "Batch kedaluwarsa ≤30 hari", value: data.metrics.expiringBatches },
    { icon: Sprout, label: "Aset wakaf aktif", value: data.metrics.activeWaqfAssets },
  ].filter((metric) => metric.value !== null);

  return (
    <section className="workspace-page report-page">
      <PageHeader
        eyebrow="Laporan organisasi"
        title="Ringkasan amanah"
        description="Angka dihitung server-side dalam konteks organisasi aktif. Nilai uang tidak pernah dijumlahkan lintas mata uang."
        actions={
          <div className="report-range" aria-label="Rentang laporan">
            {ranges.map((item) => (
              <Button
                key={item.value}
                onClick={() => setRange(item.value)}
                size="sm"
                variant={range === item.value ? "default" : "outline"}
              >
                {item.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="report-metric-grid">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="report-metric" key={metric.label}>
              <Icon aria-hidden size={18} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          );
        })}
        {data.metrics.stockedProducts !== null ? (
          <article className="report-metric">
            <PackageSearch aria-hidden size={18} />
            <span>Produk memiliki stok</span>
            <strong>{data.metrics.stockedProducts}</strong>
          </article>
        ) : null}
      </div>

      <section className="report-money-grid" aria-label="Arus nilai periode">
        <article>
          <BanknoteArrowUp aria-hidden />
          <span>Dana diterima</span>
          <MoneyTotals totals={data.money.received} />
        </article>
        <article>
          <BanknoteArrowDown aria-hidden />
          <span>Dana disalurkan</span>
          <MoneyTotals totals={data.money.disbursed} />
        </article>
        <article>
          <Sprout aria-hidden />
          <span>Pendapatan wakaf</span>
          <MoneyTotals totals={data.money.waqfIncome} />
        </article>
        <article>
          <CircleCheckBig aria-hidden />
          <span>Manfaat wakaf</span>
          <MoneyTotals totals={data.money.waqfBenefits} />
        </article>
      </section>

      <DetailSection
        title="Perlu ditindaklanjuti"
        description="Antrean diprioritaskan berdasarkan risiko dan usia pekerjaan."
      >
        {data.actionItems.length === 0 ? (
          <div className="report-clear-state">
            <CircleCheckBig aria-hidden />
            <div>
              <strong>Tidak ada antrean kritis</strong>
              <p>Seluruh indikator yang dapat Anda akses berada dalam batas pemantauan.</p>
            </div>
          </div>
        ) : (
          <div className="report-action-list">
            {data.actionItems.map((item) => (
              <Link key={item.category} to={item.href}>
                <AlertTriangle aria-hidden />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <StatusBadge tone={item.severity === "high" ? "danger" : "warning"}>
                  {item.count}
                </StatusBadge>
                <ArrowRight aria-hidden size={16} />
              </Link>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection
        title="Performa program"
        description="Kasus adalah posisi terkini; distribusi adalah realisasi dalam periode terpilih."
      >
        <ResourceTable
          items={data.programPerformance}
          getRowId={(item) => `${item.id}-${item.distribution_currency ?? "none"}`}
          columns={[
            { header: "Program", key: "program", render: (item) => <span><strong>{item.name}</strong><small className="report-table-note">{item.code}</small></span> },
            { header: "Kasus aktif", key: "cases", align: "right", render: (item) => item.active_cases },
            { header: "Eligible", key: "eligible", align: "right", render: (item) => item.eligible_cases },
            { header: "Distribusi selesai", key: "distribution", align: "right", render: (item) => item.completed_distributions },
            { header: "Nilai distribusi", key: "amount", align: "right", render: (item) => item.distribution_currency ? <MoneyDisplay amount={item.distributed_amount} currency={item.distribution_currency} /> : "—" },
          ]}
        />
      </DetailSection>

      {data.waqfPerformance.length > 0 ? (
        <DetailSection
          title="Portofolio wakaf"
          description="Nilai perolehan dipisahkan berdasarkan jenis aset dan mata uang."
        >
          <ResourceTable
            items={data.waqfPerformance}
            getRowId={(item) => `${item.asset_type}-${item.currency}`}
            columns={[
              { header: "Jenis aset", key: "type", render: (item) => item.asset_type.replaceAll("_", " ") },
              { header: "Jumlah aset", key: "total", align: "right", render: (item) => item.total_assets },
              { header: "Aktif", key: "active", align: "right", render: (item) => item.active_assets },
              { header: "Nilai perolehan", key: "value", align: "right", render: (item) => <MoneyDisplay amount={item.acquisition_value} currency={item.currency} /> },
            ]}
          />
        </DetailSection>
      ) : null}

      <p className="report-generated-at">
        Dihitung {new Date(data.generatedAt).toLocaleString("id-ID")} · bagian tersedia: {data.availableSections.join(", ") || "tidak ada"}.
      </p>
    </section>
  );
}
