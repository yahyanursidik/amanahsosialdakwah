import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import {
  ArrowLeft,
  ArrowRightCircle,
  CheckCircle2,
  Search,
  Send,
  XCircle,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  labelOf,
  proposalStatusLabels,
  proposerTypeLabels,
  toneOf,
  waqfAssetTypeLabels,
  waqfProposalTypeLabels,
} from "@/features/giving/labels";
import type { WaqfProposal } from "@/features/waqf/types";

const eventLabels: Record<string, string> = {
  approved: "Disetujui",
  cancelled: "Dibatalkan",
  converted: "Diteruskan ke operasional",
  created: "Dicatat",
  rejected: "Ditolak",
  submitted: "Diajukan",
  under_review: "Mulai dinilai",
};

export function WaqfProposalDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<WaqfProposal>({
    id,
    resource: "waqf_proposals",
    queryOptions: { enabled: Boolean(id) },
  });
  const command = useCustomMutation<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >();
  const [notes, setNotes] = useState("");
  const [utilizationType, setUtilizationType] = useState("social");

  const run = (path: string, values: Record<string, unknown> = {}) =>
    command.mutate(
      { url: `/api/v1/waqf/proposals/${id}/${path}`, method: "post", values },
      {
        onSuccess: () => {
          setNotes("");
          void query.query.refetch();
        },
      },
    );

  if (query.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }
  if (query.query.isError || !query.result) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Wakaf" title="Pengajuan wakaf" />
        <ErrorState
          title="Pengajuan tidak ditemukan"
          description="Data tidak tersedia atau berada pada organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const record = query.result;
  const pending = command.mutation.isPending;

  const nextStep: Record<string, string> = {
    approved:
      record.proposal_type === "benefit_request"
        ? "Teruskan menjadi rencana pemanfaatan aset wakaf."
        : "Teruskan menjadi aset wakaf draft, lalu lengkapi dokumen legal & registrasi.",
    cancelled: "Pengajuan ditutup.",
    converted: "Selesai — lanjutkan pengelolaan di halaman aset wakaf.",
    draft: "Periksa kelengkapan lalu ajukan untuk dinilai.",
    rejected: "Pengajuan ditolak. Informasikan alasan kepada pengaju.",
    submitted: "Penilai membuka pengajuan untuk mulai dinilai.",
    under_review:
      "Penilai (berbeda dari pencatat) memutuskan setuju atau tolak dengan catatan.",
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Wakaf · ${labelOf(waqfProposalTypeLabels, record.proposal_type)}`}
        title={record.title}
        meta={
          <StatusBadge tone={toneOf(record.status)}>
            {labelOf(proposalStatusLabels, record.status)}
          </StatusBadge>
        }
        description={`Langkah berikutnya: ${nextStep[record.status] ?? "-"}`}
        actions={
          <Button variant="outline" onClick={() => list("waqf_proposals")}>
            <ArrowLeft aria-hidden size={16} /> Daftar
          </Button>
        }
      />
      {command.mutation.isError ? (
        <ErrorState
          title="Tindakan tidak dapat diproses"
          description={command.mutation.error?.message ?? "Coba lagi."}
        />
      ) : null}

      <DetailSection
        title="Ringkasan"
        items={[
          { label: "Nomor", value: record.reference_number },
          {
            label: "Pengaju",
            value: (
              <Link to={`/reports/stakeholders/${record.proposer_contact_id}`}>
                {record.proposer_name} ({labelOf(proposerTypeLabels, record.proposer_type)})
              </Link>
            ),
          },
          { label: "Kontak", value: record.proposer_phone ?? "—" },
          {
            label:
              record.proposal_type === "benefit_request"
                ? "Aset sumber manfaat"
                : "Jenis aset diusulkan",
            value:
              record.proposal_type === "benefit_request" ? (
                <Link to={`/waqf/assets/${record.asset_id}`}>
                  {record.asset_name}
                </Link>
              ) : (
                labelOf(waqfAssetTypeLabels, record.proposed_asset_type)
              ),
          },
          {
            label: "Nilai kebutuhan",
            value: record.requested_amount ? (
              <MoneyDisplay
                amount={record.requested_amount}
                currency={record.currency}
              />
            ) : (
              "—"
            ),
          },
          {
            label: "Perkiraan penerima manfaat",
            value: record.beneficiary_estimate ?? "—",
          },
          { label: "Lokasi", value: record.location_text ?? "—" },
          { label: "Catatan penilai", value: record.review_notes ?? "—" },
        ]}
      />
      <DetailSection title="Uraian usulan">
        <p className="whitespace-pre-wrap">{record.description}</p>
      </DetailSection>

      <DetailSection
        title="Tindakan"
        description="Tombol hanya muncul sesuai status dan izin Anda. Penilaian wajib dilakukan oleh petugas yang berbeda dari pencatat."
      >
        <div className="flex flex-wrap items-end gap-3">
          {record.status === "draft" ? (
            <CanAccess action="manage" resource="waqf_proposals">
              <Button disabled={pending} onClick={() => run("submit")}>
                <Send aria-hidden size={16} /> Ajukan untuk dinilai
              </Button>
            </CanAccess>
          ) : null}
          {record.status === "submitted" ? (
            <CanAccess action="review" resource="waqf_proposals">
              <Button disabled={pending} onClick={() => run("start-review")}>
                <Search aria-hidden size={16} /> Mulai penilaian
              </Button>
            </CanAccess>
          ) : null}
          {["draft", "submitted"].includes(record.status) ? (
            <CanAccess action="manage" resource="waqf_proposals">
              <Button
                disabled={pending}
                variant="outline"
                onClick={() => run("cancel")}
              >
                <XCircle aria-hidden size={16} /> Batalkan
              </Button>
            </CanAccess>
          ) : null}
          {record.status === "under_review" ? (
            <CanAccess action="review" resource="waqf_proposals">
              <div className="auth-field auth-field--wide w-full">
                <Label htmlFor="review-notes">
                  Catatan keputusan (min. 10 karakter)
                </Label>
                <textarea
                  id="review-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <Button
                disabled={pending || notes.trim().length < 10}
                onClick={() => run("decision", { decision: "approved", notes })}
              >
                <CheckCircle2 aria-hidden size={16} /> Setujui
              </Button>
              <Button
                disabled={pending || notes.trim().length < 10}
                variant="outline"
                onClick={() => run("decision", { decision: "rejected", notes })}
              >
                <XCircle aria-hidden size={16} /> Tolak
              </Button>
            </CanAccess>
          ) : null}
          {record.status === "approved" ? (
            <CanAccess action="review" resource="waqf_proposals">
              {record.proposal_type === "benefit_request" ? (
                <div className="auth-field">
                  <Label htmlFor="utilization-type">Bentuk pemanfaatan</Label>
                  <select
                    id="utilization-type"
                    value={utilizationType}
                    onChange={(event) => setUtilizationType(event.target.value)}
                  >
                    <option value="education">Pendidikan</option>
                    <option value="dakwah">Dakwah</option>
                    <option value="health">Kesehatan</option>
                    <option value="economic">Ekonomi</option>
                    <option value="social">Sosial</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              ) : null}
              <Button
                disabled={pending}
                onClick={() =>
                  run("convert", { utilization_type: utilizationType })
                }
              >
                <ArrowRightCircle aria-hidden size={16} />
                {record.proposal_type === "benefit_request"
                  ? "Teruskan menjadi rencana pemanfaatan"
                  : "Teruskan menjadi aset wakaf"}
              </Button>
            </CanAccess>
          ) : null}
          {record.status === "converted" ? (
            <Link
              className="font-semibold"
              to={`/waqf/assets/${record.converted_asset_id ?? record.asset_id}`}
            >
              Buka aset wakaf{" "}
              {record.converted_asset_name ?? record.asset_name ?? ""} →
            </Link>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Riwayat">
        <ol className="space-y-2 text-sm">
          {(record.events ?? []).map((event) => (
            <li key={event.id}>
              <strong>{eventLabels[event.event_type] ?? event.event_type}</strong>{" "}
              · {new Date(event.created_at).toLocaleString("id-ID")}
            </li>
          ))}
        </ol>
      </DetailSection>
    </section>
  );
}
