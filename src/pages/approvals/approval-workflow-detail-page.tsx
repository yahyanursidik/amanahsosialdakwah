import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, GitBranchPlus, Send } from "lucide-react";
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
import { ApprovalStatusBadge } from "@/features/approvals/components/approval-status-badge";
import type {
  ApprovalWorkflowRecord,
  ApprovalWorkflowVersion,
} from "@/features/approvals/types";

export function ApprovalWorkflowDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const navigate = useNavigate();
  const query = useOne<ApprovalWorkflowRecord>({
    resource: "approval_workflows",
    id,
    queryOptions: { enabled: Boolean(id) },
  });
  const publishMutation = useCustomMutation<
    ApprovalWorkflowRecord,
    HttpError,
    Record<string, never>
  >();

  if (query.query.isLoading) {
    return <LoadingSkeleton lines={10} />;
  }
  if (query.query.isError || !query.result) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Workflow" eyebrow="Approval Engine" />
        <ErrorState
          title="Workflow tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const record = query.result;
  const columns: ResourceTableColumn<ApprovalWorkflowVersion>[] = [
    {
      header: "Versi",
      key: "version",
      render: (version) => `v${version.version_number}`,
    },
    {
      header: "Langkah",
      key: "steps",
      render: (version) => `${version.steps.length} langkah`,
    },
    {
      header: "Status",
      key: "status",
      render: (version) => <ApprovalStatusBadge status={version.status} />,
    },
    {
      header: "Published",
      key: "published",
      render: (version) =>
        version.published_at
          ? new Date(version.published_at).toLocaleString("id-ID")
          : "—",
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Approval Engine / ${record.code}`}
        title={record.name}
        description={
          record.description ??
          `Workflow approval untuk ${record.resource_type}.`
        }
        meta={<ApprovalStatusBadge status={record.status} />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => list("approval_workflows")}
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            <ProtectedActionButton
              action="manage"
              resource="approval_workflows"
              onClick={() =>
                navigate(`/approval-workflows/${record.id}/versions/new`)
              }
            >
              <GitBranchPlus aria-hidden="true" size={16} />
              Versi Baru
            </ProtectedActionButton>
          </>
        }
      />
      <DetailSection
        title="Konfigurasi"
        items={[
          { label: "Sumber daya", value: record.resource_type },
          { label: "Kode", value: record.code },
          {
            label: "Status",
            value: <ApprovalStatusBadge status={record.status} />,
          },
        ]}
      />
      <DetailSection title="Riwayat Versi">
        <ResourceTable
          columns={columns}
          items={record.versions ?? []}
          getRowId={(version) => version.id}
          rowActions={(version) =>
            version.status === "draft" ? (
              <ProtectedActionButton
                action="publish"
                resource="approval_workflows"
                variant="ghost"
                size="sm"
                disabled={publishMutation.mutation.isPending}
                onClick={() =>
                  publishMutation.mutate(
                    {
                      method: "post",
                      url: `/api/v1/approval-workflows/${record.id}/versions/${version.id}/publish`,
                      values: {},
                    },
                    { onSuccess: () => void query.query.refetch() },
                  )
                }
              >
                <Send aria-hidden="true" size={16} />
                Publish
              </ProtectedActionButton>
            ) : null
          }
        />
      </DetailSection>
      {(record.versions ?? []).map((version) => (
        <DetailSection
          key={version.id}
          title={`Langkah v${version.version_number}`}
        >
          <p className="text-muted-foreground mb-3 text-sm">
            Snapshot langkah ini akan disalin ke setiap request.
          </p>
          <ol className="space-y-3">
            {version.steps.map((step) => (
              <li className="rounded-xl border p-4" key={step.id}>
                <strong>
                  {step.position}. {step.name}
                </strong>
                <p className="text-muted-foreground text-sm">
                  {step.required_permission} · kuorum {step.minimum_approvals}
                </p>
              </li>
            ))}
          </ol>
        </DetailSection>
      ))}
    </section>
  );
}
