import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Plus, UploadCloud } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { AssessmentStatusBadge } from "@/features/assessments/components/assessment-status-badge";
import type {
  AssessmentQuestion,
  AssessmentTemplateRecord,
  AssessmentTemplateVersion,
} from "@/features/assessments/types";

const questionColumns: ResourceTableColumn<AssessmentQuestion>[] = [
  {
    header: "Kode",
    key: "code",
    render: (item) => <span className="font-mono text-xs">{item.code}</span>,
  },
  { header: "Pertanyaan", key: "prompt", render: (item) => item.prompt },
  {
    header: "Tipe",
    key: "type",
    render: (item) => item.question_type.replaceAll("_", " "),
  },
  {
    header: "Skor",
    key: "score",
    render: (item) => item.max_score,
  },
];

export function AssessmentTemplateDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const navigate = useNavigate();
  const templateQuery = useOne<AssessmentTemplateRecord>({
    resource: "assessment_templates",
    id,
    queryOptions: { enabled: Boolean(id) },
  });
  const publishMutation = useCustomMutation<
    AssessmentTemplateVersion,
    HttpError,
    { note?: string }
  >();
  const template = templateQuery.result;

  if (templateQuery.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }

  if (templateQuery.query.isError || !template) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Template" eyebrow="Assessment Engine" />
        <ErrorState
          title="Template tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => templateQuery.query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="template-detail-title">
      <PageHeader
        eyebrow={`Template / ${template.code}`}
        title={template.name}
        description={template.description ?? "Instrumen asesmen berversi."}
        meta={<AssessmentStatusBadge status={template.status} />}
        actions={
          <>
            <Button variant="outline" onClick={() => list("assessment_templates")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            <ProtectedActionButton
              action="manage"
              resource="assessment_templates"
              onClick={() =>
                navigate(`/assessment-templates/${template.id}/versions/new`)
              }
            >
              <Plus aria-hidden="true" size={16} />
              Versi Baru
            </ProtectedActionButton>
          </>
        }
      />

      {(template.versions ?? []).map((version) => (
        <DetailSection
          key={version.id}
          title={`Versi ${version.version_number}`}
          actions={
            <div className="flex items-center gap-2">
              <AssessmentStatusBadge status={version.status} />
              {version.status === "draft" ? (
                <ProtectedActionButton
                  action="publish"
                  resource="assessment_templates"
                  disabled={publishMutation.mutation.isPending}
                  onClick={() =>
                    publishMutation.mutate(
                      {
                        method: "post",
                        url: `/api/v1/assessment-templates/${template.id}/versions/${version.id}/publish`,
                        values: {},
                      },
                      {
                        onSuccess: () => void templateQuery.query.refetch(),
                      },
                    )
                  }
                >
                  <UploadCloud aria-hidden="true" size={16} />
                  Publish
                </ProtectedActionButton>
              ) : null}
            </div>
          }
        >
          <p className="text-muted-foreground text-sm">
            Ambang {version.passing_score} dari maksimum {version.max_score}.
          </p>
          {version.sections.map((section) => (
            <div className="form-section" key={section.id}>
              <div>
                <strong>{section.title}</strong>
                {section.description ? <p>{section.description}</p> : null}
              </div>
              <ResourceTable
                columns={questionColumns}
                items={section.questions}
                getRowId={(item) => item.id}
              />
            </div>
          ))}
        </DetailSection>
      ))}
    </section>
  );
}
