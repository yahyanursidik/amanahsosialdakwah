import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, MapPin, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { mapsUrl } from "@/features/field/device";
import type { FieldReport } from "@/features/field/types";
import {
  fieldReportStatusLabels,
  fieldReportTypeLabels,
  labelOf,
  severityLabels,
  toneOf,
  verificationCheckLabels,
  verificationResultLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

const text = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export function FieldReportDetailPage() {
  const { id = "" } = useParams();
  const { activeOrganization, user } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const query = useQuery({
    enabled: Boolean(id && organizationId),
    queryFn: () => apiFetch<{ data: FieldReport }>(`/api/v1/field/reports/${id}`),
    queryKey: ["field", "report", organizationId, id],
  });

  if (query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }
  if (query.isError || !query.data) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Lapangan" title="Laporan lapangan" />
        <ErrorState title="Laporan tidak ditemukan" description="Data tidak tersedia atau Anda belum memiliki izin." onRetry={() => query.refetch()} />
      </section>
    );
  }

  const report = query.data.data;
  const review = (decision: "follow_up" | "rejected" | "reviewed") => {
    setPending(true);
    setError("");
    apiFetch<{ data: { assessment_updated: string | null } }>(`/api/v1/field/reports/${id}/review`, {
      body: JSON.stringify({ decision, notes }),
      method: "POST",
    })
      .then((response) => {
        setResult(
          response.data.assessment_updated
            ? `Review tersimpan. Status kelayakan penerima diperbarui menjadi "${response.data.assessment_updated}".`
            : "Review tersimpan.",
        );
        setNotes("");
        void query.refetch();
      })
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setPending(false));
  };
  const checks = Object.entries(report.verification_checks ?? {}).filter(([, value]) => value);
  const isOwnReport = report.created_by === user?.$id;

  return (
    <section className="workspace-page print-document">
      <PageHeader
        eyebrow={`Lapangan · ${labelOf(fieldReportTypeLabels, report.report_type)}`}
        title={report.title}
        meta={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={report.status === "follow_up" ? "warning" : toneOf(report.status)}>
              {labelOf(fieldReportStatusLabels, report.status)}
            </StatusBadge>
            {report.verification_result ? (
              <StatusBadge tone={report.verification_result === "eligible" ? "success" : "warning"}>
                {labelOf(verificationResultLabels, report.verification_result)}
              </StatusBadge>
            ) : null}
            {report.severity ? <StatusBadge tone="danger">Insiden {labelOf(severityLabels, report.severity).toLowerCase()}</StatusBadge> : null}
          </div>
        }
        description={`${report.reference_number} · oleh ${report.reporter_name} · ${new Date(report.occurred_at).toLocaleString("id-ID")}`}
        actions={
          <Link className={`${buttonVariants({ variant: "outline" })} print-hidden`} to="/field/reports">
            <ArrowLeft aria-hidden size={16} /> Daftar
          </Link>
        }
      />

      <DetailSection title="Ringkasan">
        <p className="whitespace-pre-wrap">{report.summary}</p>
        {report.issues ? (
          <p className="mt-2">
            <strong>Kendala:</strong> {report.issues}
          </p>
        ) : null}
        {report.follow_up_needed ? <StatusBadge tone="warning">Pelapor meminta tindak lanjut</StatusBadge> : null}
      </DetailSection>

      <DetailSection
        title="Keterkaitan & capaian"
        items={[
          {
            label: "Penerima",
            value: report.beneficiary_contact_id ? (
              <Link to={`/beneficiaries/${report.beneficiary_contact_id}`}>{report.beneficiary_name}</Link>
            ) : (
              "—"
            ),
          },
          {
            label: "Distribusi",
            value: report.distribution_plan_id ? (
              <Link to={`/distributions/${report.distribution_plan_id}`}>{report.distribution_reference}</Link>
            ) : (
              "—"
            ),
          },
          {
            label: "Pengiriman",
            value: report.shipment_id ? (
              <Link to={`/logistics/shipments/${report.shipment_id}`}>{report.shipment_reference}</Link>
            ) : (
              "—"
            ),
          },
          { label: "Kasus", value: text(report.case_reference) },
          { label: "Program", value: text(report.program_name) },
          { label: "Penerima terlayani", value: text(report.beneficiaries_reached) },
          { label: "Paket diserahkan", value: text(report.packages_delivered) },
          {
            label: "Dana disalurkan",
            value: report.amount_distributed ? <MoneyDisplay amount={report.amount_distributed} currency="IDR" /> : "—",
          },
          { label: "Anggota keluarga (diamati)", value: text(report.household_size_observed) },
        ]}
      />

      {checks.length > 0 ? (
        <DetailSection title="Ceklis verifikasi">
          <ul className="field-checklist">
            {checks.map(([key]) => (
              <li key={key}>
                <CheckCircle2 aria-hidden className="inline text-emerald-600" size={16} /> {labelOf(verificationCheckLabels, key)}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      <DetailSection
        title="Lokasi"
        items={[
          {
            label: "GPS",
            value: report.latitude ? (
              <a href={mapsUrl(report.latitude, report.longitude ?? "")} rel="noreferrer" target="_blank">
                <MapPin aria-hidden className="inline" size={14} /> {report.latitude}, {report.longitude}
                {report.location_accuracy_m ? ` (±${Math.round(Number(report.location_accuracy_m))} m)` : ""}
              </a>
            ) : (
              "Tidak dicantumkan"
            ),
          },
          { label: "Keterangan", value: text(report.location_text) },
        ]}
      />

      {(report.photos ?? []).length > 0 ? (
        <DetailSection title={`Foto (${report.photos?.length})`}>
          <div className="field-photos field-photos--view">
            {(report.photos ?? []).map((photo) => (
              <figure key={photo.id}>
                <a href={photo.data_url} rel="noreferrer" target="_blank">
                  <img alt={photo.caption ?? `Foto ${photo.sequence_number}`} src={photo.data_url} />
                </a>
                {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </DetailSection>
      ) : null}

      {report.status !== "submitted" ? (
        <DetailSection
          title="Review supervisor"
          items={[
            { label: "Direview oleh", value: text(report.reviewer_name) },
            { label: "Waktu", value: report.reviewed_at ? new Date(report.reviewed_at).toLocaleString("id-ID") : "—" },
            { label: "Catatan", value: text(report.review_notes) },
          ]}
        />
      ) : (
        <CanAccess action="review" resource="field_reports">
          <DetailSection
            title="Review supervisor"
            description={
              isOwnReport
                ? "Laporan Anda sendiri harus direview oleh supervisor lain."
                : report.report_type === "verification_visit"
                  ? "Menyetujui laporan verifikasi otomatis memperbarui status kelayakan penerima."
                  : "Setujui, minta tindak lanjut, atau tolak laporan."
            }
          >
            {result ? <p className="text-sm">{result}</p> : null}
            {error ? <p className="field-card__error">{error}</p> : null}
            {!isOwnReport ? (
              <div className="print-hidden space-y-3">
                <div className="auth-field auth-field--wide">
                  <Label htmlFor="review-notes">Catatan review (min. 10 karakter)</Label>
                  <textarea id="review-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pending || notes.trim().length < 10} onClick={() => review("reviewed")}>
                    <CheckCircle2 aria-hidden size={16} /> Setujui
                  </Button>
                  <Button disabled={pending || notes.trim().length < 10} variant="outline" onClick={() => review("follow_up")}>
                    <RotateCcw aria-hidden size={16} /> Perlu tindak lanjut
                  </Button>
                  <Button disabled={pending || notes.trim().length < 10} variant="ghost" onClick={() => review("rejected")}>
                    <XCircle aria-hidden size={16} /> Tolak
                  </Button>
                </div>
              </div>
            ) : null}
          </DetailSection>
        </CanAccess>
      )}
    </section>
  );
}
