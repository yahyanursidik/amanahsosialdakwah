import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Ban, Send, ShieldCheck } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useParams } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ApprovalTimeline,
  DetailSection,
  ErrorState,
  FormSection,
  LoadingSkeleton,
  PageHeader,
  type ApprovalTimelineItem,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApprovalStatusBadge } from "@/features/approvals/components/approval-status-badge";
import {
  approvalDecisionFormSchema,
  type ApprovalDecisionFormValues,
} from "@/features/approvals/schemas";
import type { ApprovalRequestRecord } from "@/features/approvals/types";

function timeline(record: ApprovalRequestRecord): ApprovalTimelineItem[] {
  return (record.actions ?? []).map((action) => ({
    actor: action.actor_name,
    description: action.comment ?? `Siklus ${action.cycle_number}`,
    status:
      action.action === "approved"
        ? "approved"
        : ["rejected", "revision_requested", "cancelled"].includes(
              action.action,
            )
          ? "rejected"
          : "pending",
    time: new Date(action.occurred_at).toLocaleString("id-ID"),
    title: action.action.replaceAll("_", " "),
  }));
}

export function ApprovalRequestDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<ApprovalRequestRecord>({
    resource: "approval_requests",
    id,
    queryOptions: { enabled: Boolean(id) },
  });
  const commandMutation = useCustomMutation<
    ApprovalRequestRecord,
    HttpError,
    { comment?: string }
  >();
  const decisionMutation = useCustomMutation<
    ApprovalRequestRecord,
    HttpError,
    ApprovalDecisionFormValues
  >();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ApprovalDecisionFormValues>({
    resolver: zodResolver(approvalDecisionFormSchema),
    defaultValues: { comment: "", decision: "approved" },
  });

  if (query.query.isLoading) return <LoadingSkeleton lines={10} />;
  if (query.query.isError || !query.result) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Permintaan" eyebrow="Approval Engine" />
        <ErrorState
          title="Permintaan tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const record = query.result;
  const refresh = () => query.query.refetch();
  const onDecision: SubmitHandler<ApprovalDecisionFormValues> = (values) => {
    decisionMutation.mutate(
      {
        method: "post",
        url: `/api/v1/approval-requests/${record.id}/decision`,
        values,
      },
      {
        onSuccess: () => {
          reset();
          void refresh();
        },
      },
    );
  };
  const submit = () =>
    commandMutation.mutate(
      {
        method: "post",
        url: `/api/v1/approval-requests/${record.id}/submit`,
        values: {},
      },
      { onSuccess: () => void refresh() },
    );
  const cancel = () =>
    commandMutation.mutate(
      {
        method: "post",
        url: `/api/v1/approval-requests/${record.id}/cancel`,
        values: { comment: "Dibatalkan melalui halaman detail." },
      },
      { onSuccess: () => void refresh() },
    );
  const canSubmit =
    record.status === "draft" || record.status === "revision_requested";
  const canCancel = ["draft", "in_progress", "revision_requested"].includes(
    record.status,
  );

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Approval / ${record.reference_number}`}
        title={record.title}
        description={`${record.workflow_name} v${record.workflow_version_number} · siklus ${record.cycle_number}`}
        meta={<ApprovalStatusBadge status={record.status} />}
        actions={
          <>
            <Button variant="outline" onClick={() => list("approval_requests")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {canSubmit ? (
              <ProtectedActionButton
                action="submit"
                resource="approval_requests"
                disabled={commandMutation.mutation.isPending}
                onClick={submit}
              >
                <Send aria-hidden="true" size={16} />
                {record.status === "revision_requested"
                  ? "Kirim Ulang"
                  : "Kirim"}
              </ProtectedActionButton>
            ) : null}
            {canCancel ? (
              <ProtectedActionButton
                action="cancel"
                resource="approval_requests"
                variant="outline"
                disabled={commandMutation.mutation.isPending}
                onClick={cancel}
              >
                <Ban aria-hidden="true" size={16} />
                Batalkan
              </ProtectedActionButton>
            ) : null}
          </>
        }
      />
      <div className="workspace-page__grid">
        <DetailSection
          title="Ringkasan"
          items={[
            { label: "Pemohon", value: record.requester_name },
            {
              label: "Subjek",
              value: `${record.subject_type} · ${record.subject_id}`,
            },
            {
              label: "Langkah aktif",
              value: record.current_step_position
                ? `Langkah ${record.current_step_position}`
                : "—",
            },
            {
              label: "Status",
              value: <ApprovalStatusBadge status={record.status} />,
            },
          ]}
        />
        <DetailSection title="Snapshot Subjek">
          <pre className="bg-muted overflow-auto rounded-xl p-4 text-xs">
            {JSON.stringify(record.subject_snapshot, null, 2)}
          </pre>
        </DetailSection>
      </div>
      <DetailSection title="Tahapan Approval">
        <ol className="space-y-3">
          {(record.steps ?? []).map((step) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              key={step.id}
            >
              <div>
                <strong>
                  {step.position}. {step.name}
                </strong>
                <p className="text-muted-foreground text-sm">
                  {step.required_permission}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  {step.approval_count}/{step.minimum_approvals}
                </span>
                <ApprovalStatusBadge status={step.status} />
              </div>
            </li>
          ))}
        </ol>
      </DetailSection>
      <DetailSection title="Jejak Keputusan">
        <ApprovalTimeline items={timeline(record)} />
      </DetailSection>
      {record.status === "in_progress" ? (
        <form onSubmit={handleSubmit(onDecision)}>
          <FormSection
            title="Keputusan Approver"
            description="Server memeriksa permission langkah aktif dan melarang maker menyetujui request sendiri."
            footer={
              <ProtectedActionButton
                action="act"
                resource="approval_requests"
                type="submit"
                disabled={decisionMutation.mutation.isPending}
              >
                <ShieldCheck aria-hidden="true" size={16} />
                Simpan Keputusan
              </ProtectedActionButton>
            }
          >
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="decision">Keputusan</Label>
                <select id="decision" {...register("decision")}>
                  <option value="approved">Setujui</option>
                  <option value="revision_requested">Minta revisi</option>
                  <option value="rejected">Tolak</option>
                </select>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="comment">Catatan keputusan</Label>
                <textarea id="comment" rows={4} {...register("comment")} />
                {errors.comment ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.comment.message}
                  </span>
                ) : null}
              </div>
            </div>
          </FormSection>
        </form>
      ) : null}
    </section>
  );
}
