import { useState, type ReactNode } from "react";
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
} from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ErrorState,
  MoneyDisplay,
  PageHeader,
  QuantityDisplay,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/features/organizations/organization-context";
import { ProgramControlledEditDialog } from "@/features/programs/components/program-controlled-edit-dialog";
import { ProgramBeneficiaryJourney } from "@/features/programs/components/program-beneficiary-journey";
import { ProgramOperationsPanel } from "@/features/programs/components/program-operations-panel";
import { ProgramPublicLinkPanel } from "@/features/programs/components/program-public-link-panel";
import { ProgramRevisionHistory } from "@/features/programs/components/program-revision-history";
import { ProgramStatusBadge } from "@/features/programs/components/program-status-badge";
import {
  canArchiveProgram,
  canFreeEditProgram,
  canPerformControlledEdit,
  validateStatusTransition,
  buildControlledEditDiff,
} from "@/features/programs/program-service";
import {
  programSupportModeLabels,
  resolveProgramSupportModes,
} from "@/features/programs/schemas";
import type { ControlledEditFormValues } from "@/features/programs/schemas";
import type {
  ProgramsDocument,
  ProgramRevisionsDocument,
} from "@/generated/neon/models";

type ProgramInformationRow = {
  field: string;
  value: ReactNode;
};

type ProgramBudgetRow = {
  budget: ReactNode;
  component: string;
  realization: ReactNode;
  remaining: ReactNode;
};

type ProgramDetailTab =
  | "data"
  | "budget"
  | "beneficiaries"
  | "operations"
  | "publication"
  | "history";

const programDetailTabs: Array<{ id: ProgramDetailTab; label: string }> = [
  { id: "data", label: "Data program" },
  { id: "budget", label: "Anggaran" },
  { id: "beneficiaries", label: "Penerima" },
  { id: "operations", label: "Penyaluran" },
  { id: "publication", label: "Publikasi" },
  { id: "history", label: "Riwayat" },
];

export function ProgramShowPage() {
  const { id } = useParams<{ id: string }>();
  const { list, edit } = useNavigation();
  const { activeOrganization, user } = useOrganization();
  const activeOrgId = activeOrganization?.organization.$id;

  const [isControlledDialogOpen, setIsControlledDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProgramDetailTab>("data");

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
  const supportModes = resolveProgramSupportModes(program.support_modes);
  const remainingCashAmount = Math.max(
    program.cash_budget_amount - program.disbursed_amount,
    0,
  );
  const periodLabel = getProgramPeriodLabel(program);
  const informationColumns: ResourceTableColumn<ProgramInformationRow>[] = [
    {
      header: "Data",
      key: "field",
      render: (item) => item.field,
      width: "15rem",
    },
    { header: "Nilai", key: "value", render: (item) => item.value },
  ];
  const budgetColumns: ResourceTableColumn<ProgramBudgetRow>[] = [
    { header: "Komponen", key: "component", render: (item) => item.component },
    {
      header: "Rencana",
      key: "budget",
      align: "right",
      render: (item) => item.budget,
    },
    {
      header: "Realisasi",
      key: "realization",
      align: "right",
      render: (item) => item.realization,
    },
    {
      header: "Sisa",
      key: "remaining",
      align: "right",
      render: (item) => item.remaining,
    },
  ];
  const programInformation: ProgramInformationRow[] = [
    {
      field: "Kode program",
      value: (
        <span className="text-primary font-mono font-semibold">
          {program.code}
        </span>
      ),
    },
    {
      field: "Status",
      value: (
        <ProgramStatusBadge
          status={program.status}
          isArchived={program.is_archived}
        />
      ),
    },
    {
      field: "Jenis dana",
      value: <span className="capitalize">{program.fund_type}</span>,
    },
    {
      field: "Bentuk dukungan",
      value: supportModes
        .map((mode) => programSupportModeLabels[mode])
        .join(", "),
    },
    {
      field: "Tipe penerima",
      value: (
        <span className="capitalize">{program.target_beneficiary_type}</span>
      ),
    },
    {
      field: "Target penerima",
      value: (
        <QuantityDisplay
          value={program.target_beneficiary_count ?? 0}
          unit="penerima"
        />
      ),
    },
    { field: "Periode", value: periodLabel },
    {
      field: "Dibuat",
      value: new Date(program.$createdAt).toLocaleString("id-ID"),
    },
  ];
  const budgetRows: ProgramBudgetRow[] = [
    {
      component: "Dana kas",
      budget: <MoneyDisplay amount={program.cash_budget_amount} />,
      realization: <MoneyDisplay amount={program.disbursed_amount} />,
      remaining: <MoneyDisplay amount={remainingCashAmount} />,
    },
    {
      component: "Barang",
      budget: <MoneyDisplay amount={program.goods_budget_amount} />,
      realization: <span className="text-muted-foreground">—</span>,
      remaining: <span className="text-muted-foreground">—</span>,
    },
    {
      component: "Logistik",
      budget: <MoneyDisplay amount={program.logistics_budget_amount} />,
      realization: <span className="text-muted-foreground">—</span>,
      remaining: <span className="text-muted-foreground">—</span>,
    },
    {
      component: "Total rencana",
      budget: <MoneyDisplay amount={program.budget_amount} />,
      realization: <MoneyDisplay amount={program.disbursed_amount} />,
      remaining: (
        <MoneyDisplay
          amount={Math.max(program.budget_amount - program.disbursed_amount, 0)}
        />
      ),
    },
  ];

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
    if (
      isArchiving &&
      !window.confirm(
        "Arsipkan program ini? Program tidak akan dihapus permanen dan riwayatnya tetap tersimpan.",
      )
    ) {
      return;
    }
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
    <section
      className="workspace-page program-detail"
      aria-label="Detail program"
    >
      <PageHeader
        eyebrow="Program"
        title={program.name}
        description="Administrasi, anggaran, penyaluran, dan riwayat program."
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
          </div>
        }
      />

      <section
        className="program-detail__command-bar"
        aria-label="Kelola program"
      >
        <div>
          <p className="program-detail__command-label">Kelola program</p>
          <p className="program-detail__command-context">
            {program.code} ·{" "}
            <span className="capitalize">{program.fund_type}</span>
          </p>
        </div>
        <div className="program-detail__actions">
          {canFreeEditProgram(program) && (
            <ProtectedActionButton
              action="manage"
              resource="programs"
              onClick={() => edit("programs", program.$id)}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </ProtectedActionButton>
          )}

          {canPerformControlledEdit(program) && (
            <ProtectedActionButton
              action="manage"
              resource="programs"
              variant="outline"
              onClick={() => setIsControlledDialogOpen(true)}
            >
              <ShieldAlert className="mr-1 h-4 w-4 text-amber-500" />
              Penyesuaian
            </ProtectedActionButton>
          )}

          {program.status === "draft" && !program.is_archived && (
            <ProtectedActionButton
              action="manage"
              resource="programs"
              disabled={isUpdating}
              onClick={() => handleStatusChange("active", "Aktifkan Program")}
            >
              <Play className="mr-1 h-4 w-4" />
              Aktifkan
            </ProtectedActionButton>
          )}

          {program.status === "active" && !program.is_archived && (
            <>
              <ProtectedActionButton
                action="manage"
                resource="programs"
                variant="outline"
                disabled={isUpdating}
                onClick={() => handleStatusChange("paused", "Tunda Sementara")}
              >
                <Pause className="mr-1 h-4 w-4" />
                Tunda
              </ProtectedActionButton>
              <ProtectedActionButton
                action="manage"
                resource="programs"
                variant="outline"
                disabled={isUpdating}
                onClick={() =>
                  handleStatusChange("completed", "Selesaikan Program")
                }
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Selesaikan
              </ProtectedActionButton>
            </>
          )}

          {program.status === "paused" && !program.is_archived && (
            <ProtectedActionButton
              action="manage"
              resource="programs"
              disabled={isUpdating}
              onClick={() => handleStatusChange("active", "Lanjutkan Program")}
            >
              <Play className="mr-1 h-4 w-4" />
              Lanjutkan
            </ProtectedActionButton>
          )}

          {canArchiveProgram(program) && (
            <ProtectedActionButton
              action="manage"
              resource="programs"
              variant="outline"
              disabled={isUpdating}
              onClick={() => handleStatusChange("archived", "Arsipkan Program")}
            >
              <Archive className="mr-1 h-4 w-4" />
              Arsipkan
            </ProtectedActionButton>
          )}
        </div>
      </section>

      <nav
        className="program-detail__nav"
        aria-label="Bagian detail program"
        role="tablist"
      >
        {programDetailTabs.map((tab) => (
          <button
            aria-controls={`program-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            data-active={activeTab === tab.id || undefined}
            id={`program-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="program-detail__main">
        {activeTab === "data" && (
          <section
            aria-labelledby="program-tab-data"
            className="program-detail__stage"
            id="program-panel-data"
            role="tabpanel"
          >
            <header className="program-detail__section-heading">
              <div>
                <h2>Data program</h2>
                <p>Identitas dan parameter utama program.</p>
              </div>
            </header>
            <ResourceTable
              columns={informationColumns}
              getRowId={(item) => item.field}
              items={programInformation}
            />
            <header className="program-detail__section-heading">
              <div>
                <h2>Uraian program</h2>
                <p>Tujuan dan deskripsi kerja program.</p>
              </div>
            </header>
            <ResourceTable
              columns={informationColumns}
              getRowId={(item) => item.field}
              items={[
                {
                  field: "Tujuan",
                  value: program.objective || "Belum dicatat",
                },
                {
                  field: "Deskripsi",
                  value: program.description || "Belum dicatat",
                },
              ]}
            />
          </section>
        )}

        {activeTab === "budget" && (
          <section
            aria-labelledby="program-tab-budget"
            className="program-detail__stage"
            id="program-panel-budget"
            role="tabpanel"
          >
            <header className="program-detail__section-heading">
              <div>
                <h2>Anggaran program</h2>
                <p>Rencana dan realisasi dana tercatat per komponen.</p>
              </div>
            </header>
            <ResourceTable
              columns={budgetColumns}
              getRowId={(item) => item.component}
              items={budgetRows}
            />
          </section>
        )}

        {activeTab === "beneficiaries" && (
          <section
            aria-labelledby="program-tab-beneficiaries"
            className="program-detail__stage"
            id="program-panel-beneficiaries"
            role="tabpanel"
          >
            <h2>Penerima &amp; distribusi</h2>
            <ProgramBeneficiaryJourney programId={program.$id} />
          </section>
        )}

        {activeTab === "operations" && (
          <section
            aria-labelledby="program-tab-operations"
            className="program-detail__stage"
            id="program-panel-operations"
            role="tabpanel"
          >
            <h2>Area &amp; mitra penyaluran</h2>
            <ProgramOperationsPanel programId={program.$id} />
          </section>
        )}

        {activeTab === "publication" && (
          <section
            aria-labelledby="program-tab-publication"
            className="program-detail__stage"
            id="program-panel-publication"
            role="tabpanel"
          >
            <h2>Halaman publik</h2>
            <ProgramPublicLinkPanel
              programId={program.$id}
              programStatus={program.status}
            />
          </section>
        )}

        {activeTab === "history" && (
          <section
            aria-labelledby="program-tab-history"
            className="program-detail__stage"
            id="program-panel-history"
            role="tabpanel"
          >
            <h2>Riwayat</h2>
            <ProgramRevisionHistory
              revisions={revisions}
              isLoading={revisionsQuery.isLoading}
            />
          </section>
        )}
      </main>

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

function getProgramPeriodLabel(program: ProgramsDocument) {
  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString("id-ID") : undefined;
  const startsAt = formatDate(program.starts_at);
  const endsAt = formatDate(program.ends_at);

  if (!startsAt && !endsAt) return "Tidak dibatasi";
  return `${startsAt ?? "Awal"} s/d ${endsAt ?? "Selesai"}`;
}
