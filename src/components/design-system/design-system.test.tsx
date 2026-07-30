import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

import {
  EmptyState,
  ErrorState,
  EvidenceGallery,
  MoneyDisplay,
  PageHeader,
  QuantityDisplay,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from ".";

type Row = {
  amount: number;
  id: string;
  name: string;
};

const columns: ResourceTableColumn<Row>[] = [
  {
    header: "Nama",
    key: "name",
    render: (item) => item.name,
  },
  {
    align: "right",
    header: "Nilai",
    key: "amount",
    render: (item) => <MoneyDisplay amount={item.amount} />,
  },
];

function normalizeCurrency(text: string) {
  return text.replace(/\u00a0/g, " ");
}

describe("design-system components", () => {
  it("menampilkan page header dengan action", () => {
    render(
      <PageHeader
        title="Distribusi"
        description="Pantau amanah yang sedang disalurkan."
        actions={<Button>Tambah</Button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Distribusi" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambah" })).toBeInTheDocument();
  });

  it("menampilkan tabel resource padat ketika data tersedia", () => {
    render(
      <ResourceTable
        columns={columns}
        getRowId={(item) => item.id}
        items={[{ amount: 1250000, id: "row-a", name: "Amanah A" }]}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Nama" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Amanah A")).toBeInTheDocument();
    expect(
      screen.getByText((text) => normalizeCurrency(text) === "Rp 1.250.000"),
    ).toBeInTheDocument();
  });

  it("menampilkan empty dan loading state tabel", () => {
    const { rerender } = render(
      <ResourceTable
        columns={columns}
        getRowId={(item) => item.id}
        items={[]}
      />,
    );

    expect(screen.getByText("Data belum tersedia")).toBeInTheDocument();

    rerender(
      <ResourceTable
        columns={columns}
        getRowId={(item) => item.id}
        isLoading
        items={[]}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Memuat data" }),
    ).toBeInTheDocument();
  });

  it("memformat angka operasional", () => {
    render(
      <>
        <MoneyDisplay amount={0} />
        <QuantityDisplay value={12.5} unit="kg" />
      </>,
    );

    expect(
      screen.getByText((text) => normalizeCurrency(text) === "Rp 0"),
    ).toBeInTheDocument();
    expect(screen.getByText("12,5")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
  });

  it("menampilkan state, error, dan evidence secara aksesibel", () => {
    const retry = vi.fn();

    render(
      <>
        <StatusBadge tone="success">Aktif</StatusBadge>
        <EmptyState title="Kosong" />
        <ErrorState onRetry={retry} />
        <EvidenceGallery
          items={[
            {
              href: "/evidence/a",
              id: "evidence-a",
              kind: "document",
              title: "Nota pengadaan",
            },
          ]}
        />
      </>,
    );

    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kosong" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Nota pengadaan" }),
    ).toBeInTheDocument();
  });
});
