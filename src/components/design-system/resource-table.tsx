import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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
  actionHeader?: string;
  actionWidth?: string;
  ariaLabel?: string;
  columns: ResourceTableColumn<TItem>[];
  empty?: React.ReactNode;
  getRowId: (item: TItem) => string;
  isLoading?: boolean;
  items: TItem[];
  /**
   * Jumlah baris per halaman untuk pagination di sisi klien. Tabel yang
   * datanya sudah dipaginasi server cukup mengirim halaman aktif; pagination
   * klien hanya muncul bila baris melebihi pageSize.
   */
  pageSize?: number;
  rowActions?: (item: TItem) => React.ReactNode;
};

type TablePaginationProps = {
  itemLabel?: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
};

/** Navigasi halaman tabel: ringkasan jumlah data dan tombol sebelumnya/berikutnya. */
export function TablePagination({
  itemLabel = "data",
  onPageChange,
  page,
  pageSize,
  total,
}: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const around = [page - 1, page, page + 1].filter((value) => value >= 1 && value <= pages);
  const numbers = [...new Set([1, ...around, pages])].sort((left, right) => left - right);

  return (
    <nav aria-label="Halaman tabel" className="table-pagination">
      <span>
        {first}–{last} dari {total} {itemLabel}
      </span>
      <div className="table-pagination__controls">
        <button aria-label="Halaman sebelumnya" disabled={page <= 1} type="button" onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden size={16} />
        </button>
        {numbers.map((value, index) => (
          <span className="table-pagination__group" key={value}>
            {index > 0 && value - (numbers[index - 1] ?? value) > 1 ? <span aria-hidden>…</span> : null}
            <button aria-current={value === page ? "page" : undefined} type="button" onClick={() => onPageChange(value)}>
              {value}
            </button>
          </span>
        ))}
        <button aria-label="Halaman berikutnya" disabled={page >= pages} type="button" onClick={() => onPageChange(page + 1)}>
          <ChevronRight aria-hidden size={16} />
        </button>
      </div>
    </nav>
  );
}

export function ResourceTable<TItem>({
  actionHeader = "Aksi",
  actionWidth,
  ariaLabel,
  columns,
  empty = <EmptyState />,
  getRowId,
  isLoading = false,
  items,
  pageSize = 25,
  rowActions,
}: ResourceTableProps<TItem>) {
  const [requestedPage, setPage] = useState(1);

  if (isLoading) {
    return <LoadingSkeleton lines={6} variant="table" />;
  }

  if (items.length === 0) {
    return <>{empty}</>;
  }

  // Halaman disesuaikan bila jumlah data berkurang (mis. setelah filter).
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pages);
  const visible = items.length > pageSize ? items.slice((page - 1) * pageSize, page * pageSize) : items;

  return (
    <div className="resource-table-wrap">
      <div
        aria-label={ariaLabel}
        className="resource-table"
        role="region"
        tabIndex={0}
      >
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
              {rowActions ? (
                <th
                  data-align="right"
                  style={actionWidth ? { width: actionWidth } : undefined}
                >
                  {actionHeader}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
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
      <TablePagination page={page} pageSize={pageSize} total={items.length} onPageChange={setPage} />
    </div>
  );
}

export type { ResourceTableColumn };
