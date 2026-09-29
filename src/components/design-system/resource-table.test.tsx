import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResourceTable, TablePagination, type ResourceTableColumn } from ".";

type Row = { id: string; name: string };

const columns: ResourceTableColumn<Row>[] = [
  { header: "Nama", key: "name", render: (item) => item.name },
];

const rows = Array.from({ length: 12 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `Donatur ${index + 1}`,
}));

describe("ResourceTable pagination", () => {
  it("memecah baris panjang menjadi halaman", () => {
    render(<ResourceTable columns={columns} getRowId={(item) => item.id} items={rows} pageSize={5} />);
    expect(screen.getByText("Donatur 1")).toBeInTheDocument();
    expect(screen.queryByText("Donatur 6")).not.toBeInTheDocument();
    expect(screen.getByText("1–5 dari 12 data")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    expect(screen.getByText("Donatur 6")).toBeInTheDocument();
    expect(screen.queryByText("Donatur 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByText("Donatur 12")).toBeInTheDocument();
  });

  it("tidak menampilkan navigasi halaman untuk data sedikit", () => {
    render(<ResourceTable columns={columns} getRowId={(item) => item.id} items={rows.slice(0, 3)} />);
    expect(screen.queryByRole("navigation", { name: "Halaman tabel" })).not.toBeInTheDocument();
  });

  it("pagination server menampilkan ringkasan dan halaman aktif", () => {
    render(<TablePagination itemLabel="donatur" page={2} pageSize={25} total={80} onPageChange={() => {}} />);
    expect(screen.getByText("26–50 dari 80 donatur")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
  });
});
