import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCustomMutation,
  useList,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, ClipboardCheck, UserRoundCheck } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";

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
import { WorkflowStatusBadge } from "@/features/applications/components/workflow-status-badge";
import {
  assignmentFormSchema,
  type AssignmentFormValues,
} from "@/features/applications/schemas";
import type { CaseRecord } from "@/features/applications/types";
import type { ProfilesDocument } from "@/generated/neon/models";

function caseTimeline(caseRecord: CaseRecord): ApprovalTimelineItem[] {
  return (caseRecord.events ?? []).map((event) => ({
    actor: event.actor_profile_id,
    description: event.note ?? event.event_type.replaceAll("_", " "),
    status:
      event.to_status === "cancelled"
        ? "rejected"
        : event.to_status === "eligible" ||
            event.to_status === "verified" ||
            event.to_status === "closed"
          ? "approved"
          : "pending",
    time: new Date(event.occurred_at).toLocaleString("id-ID"),
    title: event.event_type.replaceAll("_", " "),
  }));
}

export function CaseDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const navigate = useNavigate();
  const caseQuery = useOne<CaseRecord>({
    resource: "cases",
    id,
    queryOptions: { enabled: !!id },
  });
  const caseRecord = caseQuery.result;
  const profileQuery = useList<ProfilesDocument>({
    resource: "profiles",
    pagination: { currentPage: 1, pageSize: 200, mode: "server" },
  });
  const assignMutation = useCustomMutation<
    CaseRecord,
    HttpError,
    { assigned_to: string; note?: string }
  >();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    values: {
      assigned_to: caseRecord?.assigned_to ?? "",
      note: "",
    },
  });

  if (caseQuery.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }

  if (caseQuery.query.isError || !caseRecord) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Kasus" eyebrow="Applications & Cases" />
        <ErrorState
          title="Kasus tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => caseQuery.query.refetch()}
        />
      </section>
    );
  }

  const onAssign: SubmitHandler<AssignmentFormValues> = (values) => {
    assignMutation.mutate(
      {
        method: "post",
        url: `/api/v1/cases/${caseRecord.id}/assign`,
        values: {
          assigned_to: values.assigned_to,
          ...(values.note ? { note: values.note } : {}),
        },
      },
      { onSuccess: () => void caseQuery.query.refetch() },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="case-detail-title">
      <PageHeader
        eyebrow={`Kasus / ${caseRecord.reference_number}`}
        title={caseRecord.beneficiary_name ?? "Penerima manfaat"}
        description={caseRecord.program_name ?? "Program bantuan"}
        meta={<WorkflowStatusBadge status={caseRecord.status} />}
        actions={
          <>
            <Button variant="outline" onClick={() => list("cases")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {["open", "assigned", "assessment"].includes(caseRecord.status) ? (
              <ProtectedActionButton
                action="manage"
                resource="assessments"
                onClick={() =>
                  navigate(`/assessments/new?caseId=${caseRecord.id}`)
                }
              >
                <ClipboardCheck aria-hidden="true" size={16} />
                Mulai Asesmen
              </ProtectedActionButton>
            ) : null}
          </>
        }
      />

      <div className="workspace-page__grid">
        <DetailSection
          title="Informasi Kasus"
          items={[
            { label: "Nomor", value: caseRecord.reference_number },
            { label: "Program", value: caseRecord.program_name ?? "—" },
            {
              label: "Penanggung jawab",
              value: caseRecord.assignee_name ?? "Belum ditugaskan",
            },
            {
              label: "Dibuka",
              value: new Date(caseRecord.opened_at).toLocaleString("id-ID"),
            },
            {
              label: "Pengajuan asal",
              value: (
                <Link to={`/applications/${caseRecord.application_id}`}>
                  Buka pengajuan
                </Link>
              ),
            },
          ]}
        >
          <div>
            <strong>Ringkasan</strong>
            <p>{caseRecord.summary ?? "Belum ada ringkasan."}</p>
          </div>
        </DetailSection>

        <DetailSection title="Timeline Kasus">
          <ApprovalTimeline items={caseTimeline(caseRecord)} />
        </DetailSection>
      </div>

      {["open", "assigned", "assessment"].includes(caseRecord.status) ? (
        <form onSubmit={handleSubmit(onAssign)}>
          <FormSection
            title="Penugasan Kasus"
            description="Penanggung jawab wajib memiliki membership aktif di organisasi ini."
            footer={
              <ProtectedActionButton
                action="assign"
                resource="cases"
                type="submit"
                disabled={assignMutation.mutation.isPending}
              >
                <UserRoundCheck aria-hidden="true" size={16} />
                Simpan Penugasan
              </ProtectedActionButton>
            }
          >
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="assigned_to">Penanggung jawab</Label>
                <select id="assigned_to" {...register("assigned_to")}>
                  <option value="">Pilih anggota</option>
                  {(profileQuery.result?.data ?? []).map((profile) => (
                    <option key={profile.$id} value={profile.$id}>
                      {profile.display_name}
                    </option>
                  ))}
                </select>
                {errors.assigned_to ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.assigned_to.message}
                  </span>
                ) : null}
              </div>
              <div className="auth-field">
                <Label htmlFor="note">Catatan penugasan</Label>
                <textarea id="note" rows={3} {...register("note")} />
              </div>
            </div>
          </FormSection>
        </form>
      ) : null}
    </section>
  );
}
