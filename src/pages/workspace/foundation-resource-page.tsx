import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  FilterBar,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";

type FoundationResourcePageProps = {
  resource: string;
  title: string;
};

type FoundationRow = {
  id: string;
  name: string;
  status: "draft";
};

const columns: ResourceTableColumn<FoundationRow>[] = [
  {
    header: "Nama",
    key: "name",
    render: (item) => item.name,
  },
  {
    header: "Status",
    key: "status",
    render: () => <StatusBadge tone="neutral">Belum ada data</StatusBadge>,
  },
];

export function FoundationResourcePage({
  resource,
  title,
}: FoundationResourcePageProps) {
  return (
    <section className="workspace-page" aria-labelledby={`${resource}-title`}>
      <PageHeader
        eyebrow="Fondasi"
        title={title}
        description="Halaman ini disiapkan untuk route dan kontrol akses fondasi."
        actions={
          <ProtectedActionButton action="manage" resource={resource}>
            Tambah
          </ProtectedActionButton>
        }
      />
      <FilterBar searchPlaceholder={`Cari ${title.toLowerCase()}`} />
      <ResourceTable
        columns={columns}
        empty={
          <EmptyState
            title={`${title} belum tersedia`}
            description="Data permanen belum dibuat pada tahap fondasi ini."
          />
        }
        getRowId={(item) => item.id}
        items={[]}
      />
    </section>
  );
}
