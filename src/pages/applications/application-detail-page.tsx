import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, CheckCircle2, Send, ShieldCheck } from "lucide-react";
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
  ResourceTable,
  type ApprovalTimelineItem,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WorkflowStatusBadge } from "@/features/applications/components/workflow-status-badge";
import {
  screeningFormSchema,
  type ScreeningFormValues,
} from "@/features/applications/schemas";
import type {
  ApplicationRecord,
  ApplicationScreening,
  CaseRecord,
} from "@/features/applications/types";

function timelineItems(application: ApplicationRecord): ApprovalTimelineItem[] {
  return (application.events ?? []).map((event) => ({
    actor: event.actor_profile_id,
    description: event.note ?? event.event_type.replaceAll("_", " "),
    status:
      event.to_status === "rejected"
        ? "rejected"
        : event.to_status === "accepted" ||
            event.to_status === "converted"
          ? "approved"
          : "pending",
    time: new Date(event.occurred_at).toLocaleString("id-ID"),
    title: event.event_type.replaceAll("_", " "),
  }));
}

const screeningColumns: ResourceTableColumn<ApplicationScreening>[] = [
  {
    header: "Tahap",
    key: "sequence",
    render: (item) => `Screening ${item.sequence_number}`,
  },
  {
    header: "Hasil",
    key: "result",
    render: (item) => <span className="capitalize">{item.result}</span>,
  },
  {
    header: "Catatan",
    key: "notes",
    render: (item) => item.notes,
  },
  {
    header: "Waktu",
    key: "screened_at",
    render: (item) => new Date(item.screened_at).toLocaleString("id-ID"),
  },
];

export function ApplicationDetailPage() {
  const { id = "" } = useParams();
  const { list, show } = useNavigation();
  const applicationQuery = useOne<ApplicationRecord>({
    resource: "applications",
    id,
    queryOptions: { enabled: !!id },
  });
  const application = applicationQuery.result;
  const submitMutation = useCustomMutation<ApplicationRecord, HttpError, {
    note?: string;
  }>();
  const screenMutation = useCustomMutation<
    ApplicationRecord,
    HttpError,
    { notes: string; result: string; risk_flags: string[] }
  >();
  const convertMutation = useCustomMutation<
    CaseRecord,
    HttpError,
    { summary?: string }
  >();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ScreeningFormValues>({
    resolver: zodResolver(screeningFormSchema),
    defaultValues: {
      notes: "",
      result: "review",
      risk_flags_text: "",
    },
  });

  if (applicationQuery.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }

  if (applicationQuery.query.isError || !application) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Pengajuan" eyebrow="Applications & Cases" />
        <ErrorState
          title="Pengajuan tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => applicationQuery.query.refetch()}
        />
      </section>
    );
  }

  const refresh = () => applicationQuery.query.refetch();
  const onScreen: SubmitHandler<ScreeningFormValues> = (values) => {
    screenMutation.mutate(
      {
        method: "post",
        url: `/api/v1/applications/${application.id}/screen`,
        values: {
          notes: values.notes,
          result: values.result,
          risk_flags: (values.risk_flags_text ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          reset();
          void refresh();
        },
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="application-detail-title">
      <PageHeader
        eyebrow={`Pengajuan / ${application.reference_number}`}
        title={application.applicant_name ?? "Pemohon"}
        description={application.program_name ?? "Program bantuan"}
        meta={<WorkflowStatusBadge status={application.status} />}
        actions={
          <>
            <Button variant="outline" onClick={() => list("applications")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {application.status === "draft" ? (
              <ProtectedActionButton
                action="submit"
                resource="applications"
                disabled={submitMutation.mutation.isPending}
                onClick={() =>
                  submitMutation.mutate(
                    {
                      method: "post",
                      url: `/api/v1/applications/${application.id}/submit`,
                      values: {},
                    },
                    { onSuccess: () => void refresh() },
                  )
                }
              >
                <Send aria-hidden="true" size={16} />
                Ajukan
              </ProtectedActionButton>
            ) : null}
            {application.status === "accepted" ? (
              <ProtectedActionButton
                action="convert"
                resource="applications"
                disabled={convertMutation.mutation.isPending}
                onClick={() =>
                  convertMutation.mutate(
                    {
                      method: "post",
                      url: `/api/v1/applications/${application.id}/convert-to-case`,
                      values: { summary: application.requested_support },
                    },
                    {
                      onSuccess: ({ data }) => show("cases", data.id),
                    },
                  )
                }
              >
                <CheckCircle2 aria-hidden="true" size={16} />
                Jadikan Kasus
              </ProtectedActionButton>
            ) : null}
            {application.linked_case_id ? (
              <Button
                onClick={() => show("cases", application.linked_case_id ?? "")}
              >
                Buka Kasus
              </Button>
            ) : null}
          </>
        }
      />

      <div className="workspace-page__grid">
        <DetailSection
          title="Ringkasan Pengajuan"
          items={[
            { label: "Nomor", value: application.reference_number },
            { label: "Program", value: application.program_name ?? "—" },
            { label: "Kanal", value: application.channel },
            { label: "Urgensi", value: application.urgency },
            {
              label: "Dibuat",
              value: new Date(application.created_at).toLocaleString("id-ID"),
            },
            {
              label: "Diajukan",
              value: application.submitted_at
                ? new Date(application.submitted_at).toLocaleString("id-ID")
                : "Belum diajukan",
            },
          ]}
        >
          <div>
            <strong>Kebutuhan</strong>
            <p>{application.requested_support}</p>
          </div>
          {application.notes ? (
            <div>
              <strong>Catatan intake</strong>
              <p>{application.notes}</p>
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Timeline">
          <ApprovalTimeline items={timelineItems(application)} />
        </DetailSection>
      </div>

      {(application.status === "submitted" ||
        application.status === "in_screening") && (
        <form onSubmit={handleSubmit(onScreen)}>
          <FormSection
            title="Screening Independen"
            description="Pembuat pengajuan tidak dapat melakukan screening sendiri."
            footer={
              <ProtectedActionButton
                action="screen"
                resource="applications"
                type="submit"
                disabled={screenMutation.mutation.isPending}
              >
                <ShieldCheck aria-hidden="true" size={16} />
                Simpan Hasil Screening
              </ProtectedActionButton>
            }
          >
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="result">Hasil</Label>
                <select id="result" {...register("result")}>
                  <option value="review">Perlu penelaahan lanjut</option>
                  <option value="pass">Lolos screening</option>
                  <option value="reject">Tolak</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="risk_flags_text">Penanda risiko</Label>
                <input
                  id="risk_flags_text"
                  placeholder="duplikasi, dokumen kurang"
                  {...register("risk_flags_text")}
                />
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="notes">Catatan screening</Label>
                <textarea id="notes" rows={4} {...register("notes")} />
                {errors.notes ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.notes.message}
                  </span>
                ) : null}
              </div>
            </div>
          </FormSection>
        </form>
      )}

      <DetailSection title="Riwayat Screening">
        <ResourceTable
          columns={screeningColumns}
          items={application.screenings ?? []}
          getRowId={(item) => item.id}
        />
      </DetailSection>
    </section>
  );
}
