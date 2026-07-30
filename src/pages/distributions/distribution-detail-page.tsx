import { useCustomMutation, useNavigation, useOne, type HttpError } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Play, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ApprovalTimeline,
  DetailSection,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ApprovalTimelineItem,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  DistributionAssignee,
  DistributionEvidence,
  DistributionPlan,
  DistributionStatus,
} from "@/features/distributions/types";
import { apiFetch } from "@/lib/neon/http";

type Envelope<T> = { data: T };

function statusTone(status: DistributionStatus) {
  if (["completed", "verified", "confirmed"].includes(status)) return "success" as const;
  if (["cancelled", "revision_required"].includes(status)) return "danger" as const;
  if (status === "draft") return "neutral" as const;
  return "info" as const;
}

function timeline(record: DistributionPlan): ApprovalTimelineItem[] {
  return (record.events ?? []).map((event) => ({
    ...(event.actor_name ? { actor: event.actor_name } : {}),
    description: event.notes ?? `Siklus ${event.cycle_number}`,
    status:
      event.to_status === "cancelled" || event.to_status === "revision_required"
        ? "rejected"
        : event.to_status === "completed" || event.to_status === "verified"
          ? "approved"
          : "pending",
    time: new Date(event.occurred_at).toLocaleString("id-ID"),
    title: event.event_type.replaceAll("_", " "),
  }));
}

export function DistributionDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<DistributionPlan>({
    resource: "distributions",
    id,
    queryOptions: { enabled: Boolean(id) },
  });
  const record = query.result;
  const command = useCustomMutation<
    DistributionPlan,
    HttpError,
    Record<string, unknown>
  >();
  const assignees = useQuery({
    enabled: record?.status === "ready" || record?.status === "assigned",
    queryFn: () =>
      apiFetch<Envelope<DistributionAssignee[]>>(
        "/api/v1/distributions/assignees",
      ),
    queryKey: ["distribution-assignees"],
    retry: false,
  });
  const [membershipId, setMembershipId] = useState("");
  const [executionNotes, setExecutionNotes] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [outcome, setOutcome] = useState<"delivered" | "failed">("delivered");
  const [evidenceKind, setEvidenceKind] =
    useState<DistributionEvidence["evidence_kind"]>("field_note");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [confirmationName, setConfirmationName] = useState("");
  const [confirmationMethod, setConfirmationMethod] =
    useState("beneficiary_statement");
  const [verificationDecision, setVerificationDecision] =
    useState("verified");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  if (query.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }
  if (query.query.isError || !record) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Distribusi" eyebrow="Operasional Lapangan" />
        <ErrorState
          title="Distribusi tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const mutate = (
    action: string,
    values: Record<string, unknown> = {},
    onSuccess?: () => void,
  ) => {
    command.mutate(
      {
        config: { headers: { "Idempotency-Key": crypto.randomUUID() } },
        method: "post",
        url: `/api/v1/distributions/${record.id}/${action}`,
        values,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          void query.query.refetch();
        },
      },
    );
  };
  const submit =
    (action: string, values: () => Record<string, unknown>, done?: () => void) =>
    (event: FormEvent) => {
      event.preventDefault();
      mutate(action, values(), done);
    };
  const evidenceColumns: ResourceTableColumn<DistributionEvidence>[] = [
    {
      header: "Siklus",
      key: "cycle",
      render: (item) => `${item.cycle_number}.${item.sequence_number}`,
    },
    {
      header: "Jenis",
      key: "kind",
      render: (item) => item.evidence_kind.replaceAll("_", " "),
    },
    { header: "Keterangan", key: "description", render: (item) => item.description },
    {
      header: "Dicatat",
      key: "captured",
      render: (item) => new Date(item.captured_at).toLocaleString("id-ID"),
    },
    {
      header: "Petugas",
      key: "creator",
      render: (item) => item.creator_name ?? "Petugas",
    },
  ];

  return (
    <section className="workspace-page" aria-labelledby="distribution-detail-title">
      <PageHeader
        eyebrow={`Distribusi / ${record.reference_number}`}
        title={record.beneficiary_name}
        description={`${record.program_name} · ${record.case_reference}`}
        meta={
          <StatusBadge tone={statusTone(record.status)}>
            {record.status.replaceAll("_", " ")}
          </StatusBadge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => list("distributions")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {record.status === "draft" ? (
              <ProtectedActionButton
                action="ready"
                resource="distributions"
                disabled={command.mutation.isPending}
                onClick={() => mutate("ready")}
              >
                <Check aria-hidden="true" size={16} />
                Tandai Siap
              </ProtectedActionButton>
            ) : null}
            {["assigned", "revision_required"].includes(record.status) ? (
              <ProtectedActionButton
                action="execute"
                resource="distributions"
                disabled={command.mutation.isPending}
                onClick={() => mutate("start")}
              >
                <Play aria-hidden="true" size={16} />
                Mulai Siklus
              </ProtectedActionButton>
            ) : null}
            {record.status === "verified" ? (
              <ProtectedActionButton
                action="complete"
                resource="distributions"
                disabled={command.mutation.isPending}
                onClick={() => mutate("complete")}
              >
                <ShieldCheck aria-hidden="true" size={16} />
                Selesaikan
              </ProtectedActionButton>
            ) : null}
          </>
        }
      />

      {command.mutation.isError ? (
        <ErrorState
          title="Command tidak dapat diproses"
          description={
            command.mutation.error?.message ??
            "Server menolak command karena izin atau prasyarat workflow."
          }
        />
      ) : null}

      <DetailSection
        title="Ringkasan Amanah"
        items={[
          {
            label: "Nominal",
            value: <MoneyDisplay amount={record.amount} currency={record.currency} />,
          },
          { label: "Metode", value: record.distribution_method.replaceAll("_", " ") },
          { label: "Pencairan", value: record.disbursement_reference },
          { label: "Alokasi", value: record.allocation_reference ?? record.allocation_id },
          { label: "Jadwal", value: new Date(record.planned_at).toLocaleString("id-ID") },
          { label: "Siklus aktif", value: record.cycle_number },
          {
            label: "Petugas",
            value: record.active_assignment?.assignee_name ?? "Belum ditugaskan",
          },
          {
            label: "Konfirmasi wajib",
            value: record.requires_confirmation ? "Ya" : "Tidak",
          },
        ]}
      >
        <p className="mt-5 text-sm">{record.purpose}</p>
      </DetailSection>

      {["ready", "assigned"].includes(record.status) ? (
        <CanAccess action="assign" resource="distributions">
          <form
            className="form-section"
            onSubmit={submit("assign", () => ({ membership_id: membershipId }))}
          >
            <div className="section-heading">
              <div>
                <h2>Penugasan Petugas</h2>
                <p>Hanya membership aktif pada organisasi ini yang dapat dipilih.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="membership_id">Petugas aktif</Label>
                <select
                  id="membership_id"
                  required
                  value={membershipId}
                  onChange={(event) => setMembershipId(event.target.value)}
                >
                  <option value="">Pilih petugas</option>
                  {(assignees.data?.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name} — {item.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                <UserRoundPlus aria-hidden="true" size={16} />
                {record.status === "assigned" ? "Ganti Petugas" : "Tugaskan"}
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {record.status === "in_progress" ? (
        <CanAccess action="execute" resource="distributions">
          <form
            className="form-section"
            onSubmit={submit("execute", () => ({
              amount: record.amount,
              executed_at: new Date().toISOString(),
              location_notes: locationNotes || undefined,
              notes: executionNotes,
              outcome,
            }))}
          >
            <div className="section-heading">
              <div>
                <h2>Catat Pelaksanaan</h2>
                <p>Nominal mengikuti rencana dan tidak dapat diubah oleh petugas.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="outcome">Hasil</Label>
                <select
                  id="outcome"
                  value={outcome}
                  onChange={(event) =>
                    setOutcome(event.target.value as "delivered" | "failed")
                  }
                >
                  <option value="delivered">Berhasil diserahkan</option>
                  <option value="failed">Gagal / perlu siklus ulang</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="location_notes">Lokasi ringkas</Label>
                <input
                  id="location_notes"
                  value={locationNotes}
                  onChange={(event) => setLocationNotes(event.target.value)}
                />
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="execution_notes">Catatan pelaksanaan</Label>
                <textarea
                  id="execution_notes"
                  required
                  minLength={10}
                  rows={3}
                  value={executionNotes}
                  onChange={(event) => setExecutionNotes(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Simpan Pelaksanaan
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {["in_progress", "executed", "confirmed", "revision_required"].includes(
        record.status,
      ) ? (
        <CanAccess action="manage" resource="distribution_evidence">
          <form
            className="form-section"
            onSubmit={submit(
              "evidence",
              () => ({
                captured_at: new Date().toISOString(),
                description: evidenceDescription,
                evidence_kind: evidenceKind,
              }),
              () => setEvidenceDescription(""),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Tambah Bukti Non-berkas</h2>
                <p>Catatan privat append-only. Unggah foto/dokumen menunggu storage privat Phase 17.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="evidence_kind">Jenis bukti</Label>
                <select
                  id="evidence_kind"
                  value={evidenceKind}
                  onChange={(event) =>
                    setEvidenceKind(
                      event.target.value as DistributionEvidence["evidence_kind"],
                    )
                  }
                >
                  <option value="field_note">Catatan lapangan</option>
                  <option value="beneficiary_statement">Pernyataan penerima</option>
                  <option value="receipt_reference">Referensi tanda terima</option>
                </select>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="evidence_description">Keterangan bukti</Label>
                <textarea
                  id="evidence_description"
                  required
                  minLength={10}
                  rows={3}
                  value={evidenceDescription}
                  onChange={(event) => setEvidenceDescription(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Simpan Bukti
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {record.status === "executed" && record.requires_confirmation ? (
        <CanAccess action="confirm" resource="distributions">
          <form
            className="form-section"
            onSubmit={submit("confirm", () => ({
              confirmation_method: confirmationMethod,
              confirmed_at: new Date().toISOString(),
              confirmed_by_name: confirmationName,
            }))}
          >
            <div className="section-heading">
              <div>
                <h2>Konfirmasi Penerima</h2>
                <p>Catat siapa dan bagaimana penyerahan dikonfirmasi.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="confirmation_method">Metode</Label>
                <select
                  id="confirmation_method"
                  value={confirmationMethod}
                  onChange={(event) => setConfirmationMethod(event.target.value)}
                >
                  <option value="beneficiary_statement">Pernyataan penerima</option>
                  <option value="witness">Saksi</option>
                  <option value="phone_call">Panggilan telepon</option>
                  <option value="otp">OTP</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="confirmation_name">Nama pengonfirmasi</Label>
                <input
                  id="confirmation_name"
                  required
                  minLength={2}
                  value={confirmationName}
                  onChange={(event) => setConfirmationName(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Simpan Konfirmasi
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {(record.status === "confirmed" ||
        (record.status === "executed" && !record.requires_confirmation)) ? (
        <CanAccess action="verify" resource="distributions">
          <form
            className="form-section"
            onSubmit={submit("verify", () => ({
              decision: verificationDecision,
              notes: verificationNotes,
            }))}
          >
            <div className="section-heading">
              <div>
                <h2>Verifikasi Independen</h2>
                <p>Pembuat rencana dan pelaksana tidak dapat memverifikasi pekerjaan sendiri.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="verification_decision">Keputusan</Label>
                <select
                  id="verification_decision"
                  value={verificationDecision}
                  onChange={(event) => setVerificationDecision(event.target.value)}
                >
                  <option value="verified">Terverifikasi</option>
                  <option value="revision_required">Perlu perbaikan</option>
                </select>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="verification_notes">Catatan verifikator</Label>
                <textarea
                  id="verification_notes"
                  required
                  minLength={10}
                  rows={3}
                  value={verificationNotes}
                  onChange={(event) => setVerificationNotes(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Simpan Verifikasi
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {["draft", "ready", "assigned"].includes(record.status) ? (
        <CanAccess action="cancel" resource="distributions">
          <form
            className="form-section"
            onSubmit={submit("cancel", () => ({ reason: cancelReason }))}
          >
            <div className="section-heading">
              <div>
                <h2>Batalkan Rencana</h2>
                <p>Pembatalan permanen dan alasannya masuk audit trail.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="auth-field">
                <Label htmlFor="cancel_reason">Alasan pembatalan</Label>
                <textarea
                  id="cancel_reason"
                  required
                  minLength={10}
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                type="submit"
                disabled={command.mutation.isPending}
              >
                Batalkan Rencana
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      <DetailSection
        title="Bukti Distribusi"
        description="Metadata privat per siklus; seluruh catatan tidak dapat diedit atau dihapus."
      >
        <ResourceTable
          columns={evidenceColumns}
          items={record.evidence ?? []}
          getRowId={(item) => item.id}
          empty={
            <EmptyState
              title="Belum ada bukti"
              description="Minimal satu bukti diperlukan sebelum verifikasi."
            />
          }
        />
      </DetailSection>

      <DetailSection
        title="Jejak Distribusi"
        description="Setiap command bisnis direkam bersama aktor, status, dan waktu."
      >
        <ApprovalTimeline items={timeline(record)} />
      </DetailSection>
    </section>
  );
}
