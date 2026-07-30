import { useState } from "react";
import {
  useCreate,
  useList,
  useNavigation,
  useOne,
  useUpdate,
} from "@refinedev/core";
import { useParams } from "react-router";
import {
  Archive,
  ArrowLeft,
  CheckCircle,
  Edit,
  Pause,
  Play,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  DetailSection,
  ErrorState,
  MoneyDisplay,
  PageHeader,
  QuantityDisplay,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/features/organizations/organization-context";
import { ProgramControlledEditDialog } from "@/features/programs/components/program-controlled-edit-dialog";
import { ProgramRevisionHistory } from "@/features/programs/components/program-revision-history";
import { ProgramStatusBadge } from "@/features/programs/components/program-status-badge";
import {
  canArchiveProgram,
  canFreeEditProgram,
  canPerformControlledEdit,
  validateStatusTransition,
  buildControlledEditDiff,
} from "@/features/programs/program-service";
import type { ControlledEditFormValues } from "@/features/programs/schemas";
import type {
  ProgramsDocument,
  ProgramRevisionsDocument,
} from "@/generated/neon/models";

export function ProgramShowPage() {
  const { id } = useParams<{ id: string }>();
  const { list, edit } = useNavigation();
  const { activeOrganization, user } = useOrganization();
  const activeOrgId = activeOrganization?.organization.$id;

  const [isControlledDialogOpen, setIsControlledDialogOpen] = useState(false);

  const { query, result: program } = useOne<ProgramsDocument>({
    resource: "programs",
    id: id!,
    queryOptions: {
      enabled: !!id,
    },
  });

  const { result: revisionsResult, query: revisionsQuery } =
    useList<ProgramRevisionsDocument>({
      resource: "program_revisions",
      filters: id ? [{ field: "program_id", operator: "eq", value: id }] : [],
      sorters: [{ field: "$createdAt", order: "desc" }],
      queryOptions: {
        enabled: !!id,
      },
    });

  const revisions = revisionsResult?.data ?? [];

  const { mutate: updateProgram, mutation: updateMutation } =
    useUpdate<ProgramsDocument>();
  const { mutate: createRevision } = useCreate<ProgramRevisionsDocument>();

  if (query.isLoading) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Modul Program" title="Detail Program" />
        <div className="text-muted-foreground p-8 text-center text-sm">
          Memuat data program...
        </div>
      </section>
    );
  }

  if (query.isError || !program) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Modul Program" title="Detail Program" />
        <ErrorState
          title="Program Tidak Ditemukan"
          description="Gagal memuat rincian data program."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  const isUpdating = updateMutation?.isPending ?? false;

  const handleStatusChange = (
    newStatus: "active" | "paused" | "completed" | "archived",
    actionLabel: string,
  ) => {
    if (!id || !activeOrgId) return;

    const validation = validateStatusTransition(
      program.status,
      newStatus,
      program.is_archived,
    );
    if (!validation.allowed) {
      alert(validation.reason);
      return;
    }

    const isArchiving = newStatus === "archived";
    const updateValues: Partial<ProgramsDocument> = {
      status: newStatus,
    };

    if (isArchiving) {
      updateValues.is_archived = true;
      updateValues.archived_at = new Date().toISOString();
      updateValues.archived_by = user?.$id ?? "user";
    }

    updateProgram(
      {
        resource: "programs",
        id,
        values: updateValues,
      },
      {
        onSuccess: () => {
          createRevision({
            resource: "program_revisions",
            values: {
              organization_id: activeOrgId,
              program_id: id,
              action_type: isArchiving
                ? "archived"
                : newStatus === "active"
                  ? "activated"
                  : newStatus === "paused"
                    ? "paused"
                    : "completed",
              change_summary: `Status program diubah menjadi ${newStatus.toUpperCase()} (${actionLabel})`,
              performed_by: user?.$id ?? "user",
              performed_at: new Date().toISOString(),
            },
          });
          query.refetch();
          revisionsQuery.refetch();
        },
      },
    );
  };

  const handleControlledSubmit = async (values: ControlledEditFormValues) => {
    if (!id || !activeOrgId || !program) return;

    const diff = buildControlledEditDiff(program, {
      reason: values.reason,
      description: values.description,
      objective: values.objective,
      target_beneficiary_count: values.target_beneficiary_count,
      ends_at: values.ends_at,
    });

    updateProgram(
      {
        resource: "programs",
        id,
        values: {
          description: values.description,
          objective: values.objective,
          target_beneficiary_count: values.target_beneficiary_count,
          ends_at: values.ends_at || program.ends_at,
        },
      },
      {
        onSuccess: () => {
          createRevision({
            resource: "program_revisions",
            values: {
              organization_id: activeOrgId,
              program_id: id,
              action_type: "controlled_edit",
              change_summary: diff.changeSummary,
              reason: values.reason,
              previous_values: JSON.stringify(diff.previousValues),
              new_values: JSON.stringify(diff.newValues),
              performed_by: user?.$id ?? "user",
              performed_at: new Date().toISOString(),
            },
          });
          query.refetch();
          revisionsQuery.refetch();
        },
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="program-show-title">
      <PageHeader
        eyebrow={`Program / ${program.code}`}
        title={program.name}
        meta={
          <ProgramStatusBadge
            status={program.status}
            isArchived={program.is_archived}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => list("programs")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Kembali
            </Button>

            {canFreeEditProgram(program) && (
              <ProtectedActionButton
                action="manage"
                resource="programs"
                onClick={() => edit("programs", program.$id)}
              >
                <Edit className="mr-1 h-4 w-4" />
                Edit Draft
              </ProtectedActionButton>
            )}

            {canPerformControlledEdit(program) && (
              <ProtectedActionButton
                action="controlled_edit"
                resource="programs"
                variant="outline"
                onClick={() => setIsControlledDialogOpen(true)}
              >
                <ShieldAlert className="mr-1 h-4 w-4 text-amber-500" />
                Aksi Terkontrol
              </ProtectedActionButton>
            )}

            {program.status === "draft" && !program.is_archived && (
              <ProtectedActionButton
                action="manage"
                resource="programs"
                variant="default"
                disabled={isUpdating}
                onClick={() => handleStatusChange("active", "Aktifkan Program")}
              >
                <Play className="mr-1 h-4 w-4" />
                Aktifkan Program
              </ProtectedActionButton>
            )}

            {program.status === "active" && !program.is_archived && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    handleStatusChange("paused", "Tunda Sementara")
                  }
                >
                  <Pause className="mr-1 h-4 w-4" />
                  Tunda
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    handleStatusChange("completed", "Selesaikan Program")
                  }
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Selesai
                </Button>
              </>
            )}

            {program.status === "paused" && !program.is_archived && (
              <Button
                variant="default"
                size="sm"
                disabled={isUpdating}
                onClick={() =>
                  handleStatusChange("active", "Lanjutkan Program")
                }
              >
                <Play className="mr-1 h-4 w-4" />
                Lanjutkan Program
              </Button>
            )}

            {canArchiveProgram(program) && (
              <ProtectedActionButton
                action="archive"
                resource="programs"
                variant="outline"
                disabled={isUpdating}
                onClick={() =>
                  handleStatusChange("archived", "Arsipkan Program")
                }
              >
                <Archive className="mr-1 h-4 w-4" />
                Arsipkan
              </ProtectedActionButton>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled
              title="Hard delete tidak diizinkan. Gunakan Arsipkan (Soft Delete)."
              className="cursor-not-allowed opacity-50"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Hapus (Diblokir)
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <DetailSection
            title="Ringkasan Indikator & Finansial"
            items={[
              {
                label: "Target Anggaran",
                value: <MoneyDisplay amount={program.budget_amount} />,
              },
              {
                label: "Alokasi Dana",
                value: <MoneyDisplay amount={program.allocated_amount} />,
              },
              {
                label: "Dana Tersalurkan",
                value: <MoneyDisplay amount={program.disbursed_amount} />,
              },
              {
                label: "Sisa Target Anggaran",
                value: (
                  <MoneyDisplay
                    amount={Math.max(
                      program.budget_amount - program.disbursed_amount,
                      0,
                    )}
                  />
                ),
              },
            ]}
          />

          <DetailSection
            title="Deskripsi & Tujuan Program"
            items={[
              {
                label: "Deskripsi",
                value: program.description || "Belum ada deskripsi.",
              },
              {
                label: "Tujuan Dampak",
                value: program.objective || "Belum ada tujuan khusus.",
              },
            ]}
          />

          <ProgramRevisionHistory
            revisions={revisions}
            isLoading={revisionsQuery.isLoading}
          />
        </div>

        <div className="space-y-6">
          <DetailSection
            title="Metadata Program"
            items={[
              {
                label: "Kode Program",
                value: (
                  <span className="text-primary font-mono font-semibold">
                    {program.code}
                  </span>
                ),
              },
              {
                label: "Jenis Dana",
                value: (
                  <span className="font-medium capitalize">
                    {program.fund_type}
                  </span>
                ),
              },
              {
                label: "Tipe Penerima",
                value: (
                  <span className="capitalize">
                    {program.target_beneficiary_type}
                  </span>
                ),
              },
              {
                label: "Target Penerima",
                value: (
                  <QuantityDisplay
                    value={program.target_beneficiary_count ?? 0}
                    unit="penerima"
                  />
                ),
              },
              {
                label: "Periode Pelaksanaan",
                value:
                  program.starts_at || program.ends_at
                    ? `${program.starts_at ? new Date(program.starts_at).toLocaleDateString("id-ID") : "Awal"} s/d ${program.ends_at ? new Date(program.ends_at).toLocaleDateString("id-ID") : "Selesai"}`
                    : "Tidak dibatasi",
              },
              {
                label: "Tanggal Dibuat",
                value: new Date(program.$createdAt).toLocaleString("id-ID"),
              },
            ]}
          />
        </div>
      </div>

      {program && (
        <ProgramControlledEditDialog
          isOpen={isControlledDialogOpen}
          program={program}
          onClose={() => setIsControlledDialogOpen(false)}
          onSubmit={handleControlledSubmit}
          isLoading={isUpdating}
        />
      )}
    </section>
  );
}
