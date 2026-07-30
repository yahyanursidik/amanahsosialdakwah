import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useSearchParams } from "react-router";

import {
  EmptyState,
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createAssessmentFormSchema,
  type CreateAssessmentFormValues,
} from "@/features/assessments/schemas";
import type {
  AssessmentRecord,
  AssessmentTemplateRecord,
} from "@/features/assessments/types";
import type { CaseRecord } from "@/features/applications/types";

export function AssessmentCreatePage() {
  const [searchParams] = useSearchParams();
  const { list, show } = useNavigation();
  const { mutate, mutation } = useCreate<AssessmentRecord>();
  const caseQuery = useList<CaseRecord>({
    resource: "cases",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const templateQuery = useList<AssessmentTemplateRecord>({
    resource: "assessment_templates",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const templates = (templateQuery.result?.data ?? []).filter(
    (template) => template.published_version_id,
  );
  const cases = (caseQuery.result?.data ?? []).filter((caseRecord) =>
    ["open", "assigned", "assessment"].includes(caseRecord.status),
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateAssessmentFormValues>({
    resolver: zodResolver(createAssessmentFormSchema),
    defaultValues: {
      case_id: searchParams.get("caseId") ?? "",
      template_version_id: "",
    },
  });

  const onSubmit: SubmitHandler<CreateAssessmentFormValues> = (values) => {
    mutate(
      { resource: "assessments", values },
      { onSuccess: ({ data }) => show("assessments", data.id) },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="assessment-create-title">
      <PageHeader
        eyebrow="Assessment Engine"
        title="Mulai Asesmen"
        description="Asesmen memakai snapshot versi template yang sudah published."
        actions={
          <Button variant="outline" onClick={() => list("assessments")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title="Belum ada template aktif"
          description="Buat dan publish template asesmen sebelum memulai asesmen kasus."
        />
      ) : (
        <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
          <FormSection
            title="Kasus dan Instrumen"
            footer={
              <Button type="submit" disabled={mutation.isPending}>
                <Save aria-hidden="true" size={16} />
                {mutation.isPending ? "Membuat..." : "Buat Asesmen"}
              </Button>
            }
          >
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="case_id">Kasus aktif</Label>
                <select id="case_id" {...register("case_id")}>
                  <option value="">Pilih kasus</option>
                  {cases.map((caseRecord) => (
                    <option key={caseRecord.id} value={caseRecord.id}>
                      {caseRecord.reference_number} —{" "}
                      {caseRecord.beneficiary_name ?? "Penerima"}
                    </option>
                  ))}
                </select>
                {errors.case_id ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.case_id.message}
                  </span>
                ) : null}
              </div>
              <div className="auth-field">
                <Label htmlFor="template_version_id">Template published</Label>
                <select
                  id="template_version_id"
                  {...register("template_version_id")}
                >
                  <option value="">Pilih template</option>
                  {templates.map((template) => (
                    <option
                      key={template.id}
                      value={template.published_version_id ?? ""}
                    >
                      {template.name} v{template.published_version_number}
                    </option>
                  ))}
                </select>
                {errors.template_version_id ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.template_version_id.message}
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
