import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { useSearchParams } from "react-router";

import {
  EmptyState,
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  approvalRequestFormSchema,
  type ApprovalRequestFormValues,
} from "@/features/approvals/schemas";
import type {
  ApprovalRequestRecord,
  ApprovalWorkflowRecord,
} from "@/features/approvals/types";
import type { CaseRecord } from "@/features/applications/types";
import type { AssessmentRecord } from "@/features/assessments/types";
import type { FundAllocation } from "@/features/funds/types";

export function ApprovalRequestCreatePage() {
  const [searchParams] = useSearchParams();
  const requestedSubjectType = searchParams.get("subject_type");
  const requestedSubjectId = searchParams.get("subject_id") ?? "";
  const { list, show } = useNavigation();
  const { mutate, mutation } = useCreate<ApprovalRequestRecord>();
  const workflowQuery = useList<ApprovalWorkflowRecord>({
    resource: "approval_workflows",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const caseQuery = useList<CaseRecord>({
    resource: "cases",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const assessmentQuery = useList<AssessmentRecord>({
    resource: "assessments",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const allocationQuery = useList<FundAllocation>({
    resource: "fund_allocations",
    filters: [{ field: "status", operator: "eq", value: "draft" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<ApprovalRequestFormValues>({
    resolver: zodResolver(approvalRequestFormSchema),
    defaultValues: {
      subject_id: requestedSubjectId,
      subject_type:
        requestedSubjectType === "fund_allocation"
          ? "fund_allocation"
          : requestedSubjectType === "case"
            ? "case"
            : "assessment",
      title: "",
      workflow_version_id: "",
    },
  });
  const selectedVersionId = useWatch({ control, name: "workflow_version_id" });
  const workflows = useMemo(
    () =>
      (workflowQuery.result?.data ?? []).filter(
        (workflow) => workflow.published_version_id,
      ),
    [workflowQuery.result?.data],
  );
  const selectedWorkflow = workflows.find(
    (workflow) => workflow.published_version_id === selectedVersionId,
  );
  const subjects =
    selectedWorkflow?.resource_type === "case"
      ? (caseQuery.result?.data ?? []).map((item) => ({
          id: item.id,
          label: `${item.reference_number} — ${item.beneficiary_name ?? "Penerima"}`,
        }))
      : selectedWorkflow?.resource_type === "fund_allocation"
        ? (allocationQuery.result?.data ?? []).map((item) => ({
            id: item.id,
            label: `${item.reference_number} — ${item.program_name} (${item.amount} ${item.currency})`,
          }))
      : (assessmentQuery.result?.data ?? []).map((item) => ({
          id: item.id,
          label: `${item.reference_number} — ${item.beneficiary_name ?? "Penerima"}`,
        }));

  const onSubmit: SubmitHandler<ApprovalRequestFormValues> = (values) => {
    mutate(
      { resource: "approval_requests", values },
      { onSuccess: ({ data }) => show("approval_requests", data.id) },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Approval Engine"
        title="Buat Permintaan Approval"
        description="Subjek akan disnapshot oleh server ketika draft dibuat."
        actions={
          <Button variant="outline" onClick={() => list("approval_requests")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />
      {workflows.length === 0 && !workflowQuery.query.isLoading ? (
        <EmptyState
          title="Belum ada workflow aktif"
          description="Buat dan publish workflow approval terlebih dahulu."
        />
      ) : (
        <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
          <FormSection
            title="Subjek dan Workflow"
            footer={
              <Button type="submit" disabled={mutation.isPending}>
                <Save aria-hidden="true" size={16} />
                {mutation.isPending ? "Menyimpan..." : "Simpan Draft"}
              </Button>
            }
          >
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="workflow_version_id">Workflow aktif</Label>
                <select
                  id="workflow_version_id"
                  {...register("workflow_version_id", {
                    onChange: (event) => {
                      const workflow = workflows.find(
                        (item) =>
                          item.published_version_id === event.target.value,
                      );
                      if (workflow) {
                        setValue("subject_type", workflow.resource_type);
                        setValue(
                          "subject_id",
                          workflow.resource_type === requestedSubjectType
                            ? requestedSubjectId
                            : "",
                        );
                      }
                    },
                  })}
                >
                  <option value="">Pilih workflow</option>
                  {workflows.map((workflow) => (
                    <option
                      key={workflow.id}
                      value={workflow.published_version_id ?? ""}
                    >
                      {workflow.name} v{workflow.published_version_number}
                    </option>
                  ))}
                </select>
                {errors.workflow_version_id ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.workflow_version_id.message}
                  </span>
                ) : null}
              </div>
              <input type="hidden" {...register("subject_type")} />
              <div className="auth-field">
                <Label htmlFor="subject_id">
                  Subjek {selectedWorkflow?.resource_type ?? ""}
                </Label>
                <select
                  id="subject_id"
                  {...register("subject_id")}
                  disabled={!selectedWorkflow}
                >
                  <option value="">Pilih subjek</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </select>
                {errors.subject_id ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.subject_id.message}
                  </span>
                ) : null}
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="title">Judul permintaan</Label>
                <input id="title" {...register("title")} />
                {errors.title ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.title.message}
                  </span>
                ) : null}
              </div>
            </div>
          </FormSection>
        </form>
      )}
    </section>
  );
}
