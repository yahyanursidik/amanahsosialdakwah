import { useList } from "@refinedev/core";
import { Camera, FilePlus2, MapPin } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import {
  EmptyState,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { buttonVariants } from "@/components/ui/button-variants";
import type { FieldReport } from "@/features/field/types";
import {
  fieldReportStatusLabels,
  fieldReportTypeLabels,
  labelOf,
  optionsOf,
  severityLabels,
  toneOf,
  verificationResultLabels,
} from "@/features/giving/labels";

export function FieldReportListPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const reportType = params.get("report_type") ?? "";
  const mine = params.get("mine") === "true";
  const search = params.get("q") ?? "";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const reports = useList<FieldReport>({
    resource: "field_reports",
    filters: [
      { field: "status", operator: "eq", value: status },
      { field: "report_type", operator: "eq", value: reportType },
      { field: "mine", operator: "eq", value: mine ? "true" : "" },
      { field: "q", operator: "eq", value: search },
    ],
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });

  const columns: ResourceTableColumn<FieldReport>[] = [
    {
      header: "Laporan",
      key: "title",
      render: (item) => (
        <div className="crm-contact-cell">
          <Link to={`/field/reports/${item.id}`}>
            <strong>{item.title}</strong>
          </Link>
          <small>
            {item.reference_number} · {labelOf(fieldReportTypeLabels, item.report_type)}
            {item.verification_result ? ` · ${labelOf(verificationResultLabels, item.verification_result)}` : ""}
            {item.severity ? ` · ${labelOf(severityLabels, item.severity)}` : ""}
          </small>
        </div>
      ),
    },
    {
      header: "Pelapor",
      key: "reporter",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.reporter_name}</strong>
          <small>{new Date(item.occurred_at).toLocaleString("id-ID")}</small>
        </div>
      ),
    },
    {
      header: "Terkait",
      key: "related",
      render: (item) =>
        item.beneficiary_name ??
        item.distribution_reference ??
        item.shipment_reference ??
        item.program_name ??
        "—",
    },
    {
      header: "Bukti",
      key: "proof",
      render: (item) => (
        <span className="flex gap-2 text-sm">
          {item.latitude ? <MapPin aria-label="Ada GPS" size={16} /> : null}
          {item.photo_count > 0 ? (
            <span className="flex items-center gap-1">
              <Camera aria-hidden size={16} /> {item.photo_count}
            </span>
          ) : null}
          {!item.latitude && item.photo_count === 0 ? "—" : null}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone={item.status === "follow_up" ? "warning" : toneOf(item.status)}>
            {labelOf(fieldReportStatusLabels, item.status)}
          </StatusBadge>
          {item.follow_up_needed ? <StatusBadge tone="warning">Minta tindak lanjut</StatusBadge> : null}
        </div>
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Lapangan"
        title="Laporan lapangan"
        description="Semua laporan dari tim lapangan: penyaluran, pengiriman, verifikasi penerima, pemantauan, situasi, dan insiden. Supervisor mereview laporan berstatus menunggu."
        actions={
          <Link className={buttonVariants({})} to="/field/reports/new">
            <FilePlus2 aria-hidden size={16} /> Laporan baru
          </Link>
        }
      />
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Cari laporan"
          className="min-w-64 flex-1 rounded-xl border px-3 py-2"
          placeholder="Cari judul, nomor, penerima, atau pelapor…"
          value={search}
          onChange={(event) => update("q", event.target.value)}
        />
        <select aria-label="Status" className="rounded-xl border px-3 py-2" value={status} onChange={(event) => update("status", event.target.value)}>
          <option value="">Semua status</option>
          {optionsOf(fieldReportStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select aria-label="Jenis" className="rounded-xl border px-3 py-2" value={reportType} onChange={(event) => update("report_type", event.target.value)}>
          <option value="">Semua jenis</option>
          {optionsOf(fieldReportTypeLabels).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input checked={mine} type="checkbox" onChange={(event) => update("mine", event.target.checked ? "true" : "")} />
          Hanya laporan saya
        </label>
      </div>
      {reports.query.isError ? (
        <ErrorState title="Laporan tidak dapat dimuat" description="Periksa izin laporan lapangan." onRetry={() => reports.query.refetch()} />
      ) : (
        <ResourceTable
          ariaLabel="Daftar laporan lapangan"
          columns={columns}
          getRowId={(item) => item.id}
          isLoading={reports.query.isLoading}
          items={reports.result?.data ?? []}
          empty={<EmptyState title="Belum ada laporan" description="Laporan dari tim lapangan akan muncul di sini." />}
        />
      )}
    </section>
  );
}
