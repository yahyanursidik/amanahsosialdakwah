import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Edit, Eye, Grid2X2, List, Plus, Settings2, ShieldAlert } from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/features/organizations/organization-context";
import { ProgramStatusBadge } from "@/features/programs/components/program-status-badge";
import {
  canFreeEditProgram,
  canPerformControlledEdit,
} from "@/features/programs/program-service";
import {
  programSupportModeLabels,
  resolveProgramSupportModes,
} from "@/features/programs/schemas";
import type { ProgramsDocument } from "@/generated/neon/models";

function supportModeSummary(program: ProgramsDocument): string {
  return resolveProgramSupportModes(program.support_modes)
    .map((mode) => programSupportModeLabels[mode])
    .join(", ");
}

export function ProgramListPage() {
  const { activeOrganization } = useOrganization();
  const { create, edit, show } = useNavigation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const activeOrgId = activeOrganization?.organization.$id;

  const filters: CrudFilters = [];
  if (activeOrgId) {
    filters.push({
      field: "organization_id",
      operator: "eq",
      value: activeOrgId,
    });
  }
  if (statusFilter !== "all") {
    filters.push({ field: "status", operator: "eq", value: statusFilter });
  }

  const { query, result } = useList<ProgramsDocument>({
    resource: "programs",
    pagination: {
      currentPage: page,
      pageSize,
      mode: "server",
    },
    filters,
    sorters: [{ field: "$createdAt", order: "desc" }],
    queryOptions: {
      enabled: !!activeOrgId,
    },
  });

  const rawItems = result?.data ?? [];
  const totalCount = result?.total ?? 0;

  const items = rawItems.filter((item: ProgramsDocument) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    );
  });

  const columns: ResourceTableColumn<ProgramsDocument>[] = [
    {
      header: "Kode Program",
      key: "code",
      render: (item: ProgramsDocument) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.code}
        </span>
      ),
    },
    {
      header: "Nama Program",
      key: "name",
      render: (item: ProgramsDocument) => (
        <div className="space-y-0.5">
          <div className="text-foreground font-medium">{item.name}</div>
          {item.objective && (
            <div className="text-muted-foreground line-clamp-1 text-xs">
              {item.objective}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Bentuk Dukungan",
      key: "support_modes",
      render: (item: ProgramsDocument) => (
        <div className="space-y-1">
          <span className="bg-muted rounded-sm px-2 py-0.5 text-xs font-medium">
            {supportModeSummary(item)}
          </span>
          <p className="text-muted-foreground text-xs capitalize">{item.fund_type}</p>
        </div>
      ),
    },
    {
      header: "Rencana Dukungan",
      key: "budget_amount",
      render: (item: ProgramsDocument) => (
        <MoneyDisplay amount={item.budget_amount} />
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (item: ProgramsDocument) => (
        <ProgramStatusBadge
          status={item.status}
          isArchived={item.is_archived}
        />
      ),
    },
    {
      header: "Aksi",
      key: "actions",
      render: (item: ProgramsDocument) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("programs", item.$id)}
            title="Lihat Detail"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {canFreeEditProgram(item) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => edit("programs", item.$id)}
              title="Edit Draft"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}

          {canPerformControlledEdit(item) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => show("programs", item.$id)}
              title="Aksi Terkontrol (Program Aktif)"
            >
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            </Button>
          )}

          <ProtectedActionButton
            action="manage"
            resource="programs"
            variant="outline"
            size="sm"
            onClick={() => show("programs", item.$id)}
            title="Kelola Program"
          >
            <Settings2 className="h-4 w-4" />
            <span className="sr-only xl:not-sr-only">Kelola</span>
          </ProtectedActionButton>
        </div>
      ),
    },
  ];

  if (query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="Kelola Amanah"
          title="Modul Program"
          description="Daftar dan status program sosial-dakwah."
        />
        <ErrorState
          title="Gagal Memuat Data Program"
          description="Terjadi kesalahan saat mengambil daftar program dari server."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <section className="workspace-page" aria-labelledby="program-list-title">
      <PageHeader
        eyebrow="Kelola Amanah"
        title="Daftar Program"
        description="Pengelolaan seluruh program sosial-dakwah, alokasi anggaran, dan pemantauan status."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="programs"
            onClick={() => create("programs")}
          >
            <Plus className="mr-1 h-4 w-4" />
            Buat Program Baru
          </ProtectedActionButton>
        }
      />

      <FilterBar
        searchPlaceholder="Cari berdasarkan nama atau kode program..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <div
            className="border-border bg-background inline-flex rounded-md border p-0.5"
            aria-label="Pilih tampilan daftar program"
          >
            <Button
              aria-label="Tampilkan sebagai tabel"
              aria-pressed={viewMode === "table"}
              className="min-h-8 px-2"
              onClick={() => setViewMode("table")}
              size="sm"
              title="Tampilan tabel"
              variant={viewMode === "table" ? "default" : "ghost"}
            >
              <List aria-hidden="true" className="h-4 w-4" />
              <span className="hidden lg:inline">Tabel</span>
            </Button>
            <Button
              aria-label="Tampilkan sebagai kartu"
              aria-pressed={viewMode === "cards"}
              className="min-h-8 px-2"
              onClick={() => setViewMode("cards")}
              size="sm"
              title="Tampilan kartu"
              variant={viewMode === "cards" ? "default" : "ghost"}
            >
              <Grid2X2 aria-hidden="true" className="h-4 w-4" />
              <span className="hidden lg:inline">Kartu</span>
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-xs shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
            aria-label="Filter Berdasarkan Status"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="active">Aktif</option>
            <option value="paused">Ditunda</option>
            <option value="completed">Selesai</option>
            <option value="archived">Diarsipkan</option>
          </select>
        </div>
      </FilterBar>

      {viewMode === "table" ? (
        <ResourceTable
          columns={columns}
          items={items}
          getRowId={(item: ProgramsDocument) => item.$id}
          isLoading={query.isLoading}
          empty={
            <EmptyState
              title="Belum ada program"
              description={
                search || statusFilter !== "all"
                  ? "Tidak ada program yang sesuai dengan kriteria pencarian Anda."
                  : "Mulai buat program sosial-dakwah pertama Anda."
              }
              action={
                !search && statusFilter === "all" ? (
                  <ProtectedActionButton
                    action="manage"
                    resource="programs"
                    onClick={() => create("programs")}
                  >
                    Buat Program
                  </ProtectedActionButton>
                ) : undefined
              }
            />
          }
        />
      ) : null}

      {viewMode === "cards" ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {query.isLoading ? (
          <div className="text-muted-foreground col-span-full p-6 text-center text-sm">
            Memuat daftar program...
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="Belum ada program"
              description="Tidak ada program ditemukan."
            />
          </div>
        ) : (
          items.map((item: ProgramsDocument) => (
            <div
              key={item.$id}
              className="border-border bg-card flex min-h-72 flex-col space-y-4 rounded-xl border p-5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-primary font-mono text-xs font-semibold">
                    {item.code}
                  </span>
                  <h3 className="text-foreground text-sm leading-tight font-medium">
                    {item.name}
                  </h3>
                </div>
                <ProgramStatusBadge
                  status={item.status}
                  isArchived={item.is_archived}
                />
              </div>

              {item.objective ? (
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {item.objective}
                </p>
              ) : null}

              <div className="border-border/50 grid grid-cols-2 gap-3 border-y py-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">
                    Bentuk dukungan:
                  </span>
                  <span className="font-medium">
                    {supportModeSummary(item)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Total rencana:</span>
                  <MoneyDisplay amount={item.budget_amount} />
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => show("programs", item.$id)}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  Detail
                </Button>
                <ProtectedActionButton
                  action="manage"
                  resource="programs"
                  variant="default"
                  size="sm"
                  onClick={() => show("programs", item.$id)}
                >
                  <Settings2 className="mr-1 h-4 w-4" />
                  Kelola program
                </ProtectedActionButton>
              </div>
            </div>
          ))
        )}
      </div>
      ) : null}

      {totalPages > 1 && (
        <div className="border-border flex items-center justify-between border-t pt-4 text-xs">
          <div className="text-muted-foreground">
            Menampilkan halaman {page} dari {totalPages} ({totalCount} total
            program)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
