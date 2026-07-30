import { EmptyState } from "./empty-state";
import { LoadingSkeleton } from "./loading-skeleton";

type ResourceTableColumn<TItem> = {
  align?: "left" | "right" | "center";
  header: string;
  key: string;
  render: (item: TItem) => React.ReactNode;
  width?: string;
};

type ResourceTableProps<TItem> = {
  columns: ResourceTableColumn<TItem>[];
  empty?: React.ReactNode;
  getRowId: (item: TItem) => string;
  isLoading?: boolean;
  items: TItem[];
  rowActions?: (item: TItem) => React.ReactNode;
};

export function ResourceTable<TItem>({
  columns,
  empty = <EmptyState />,
  getRowId,
  isLoading = false,
  items,
  rowActions,
}: ResourceTableProps<TItem>) {
  if (isLoading) {
    return <LoadingSkeleton lines={6} variant="table" />;
  }

  if (items.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className="resource-table" role="region" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                data-align={column.align}
              >
                {column.header}
              </th>
            ))}
            {rowActions ? <th aria-label="Aksi" /> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={getRowId(item)}>
              {columns.map((column) => (
                <td key={column.key} data-align={column.align}>
                  {column.render(item)}
                </td>
              ))}
              {rowActions ? (
                <td data-align="right" className="resource-table__actions">
                  {rowActions(item)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { ResourceTableColumn };
