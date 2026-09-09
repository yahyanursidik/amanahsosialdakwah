import { PackagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ProgramGoodsPlanProduct = {
  base_unit: string;
  category_name: string;
  id: string;
  name: string;
  sku: string;
};

export type ProgramGoodsPlanDraft = {
  clientId: string;
  notes: string;
  productId: string;
  quantity: string;
  unitValue: string;
};

export function createProgramGoodsPlanDraft(): ProgramGoodsPlanDraft {
  return {
    clientId: crypto.randomUUID(),
    notes: "",
    productId: "",
    quantity: "1",
    unitValue: "0",
  };
}

function money(value: number) {
  return `Rp ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

type ProgramGoodsPlanFieldsProps = {
  items: ProgramGoodsPlanDraft[];
  loading: boolean;
  onChange: (items: ProgramGoodsPlanDraft[]) => void;
  products: ProgramGoodsPlanProduct[];
};

export function ProgramGoodsPlanFields({
  items,
  loading,
  onChange,
  products,
}: ProgramGoodsPlanFieldsProps) {
  const update = (
    clientId: string,
    field: keyof Omit<ProgramGoodsPlanDraft, "clientId">,
    value: string,
  ) =>
    onChange(
      items.map((item) =>
        item.clientId === clientId ? { ...item, [field]: value } : item,
      ),
    );

  const total = items.reduce(
    (value, item) =>
      value + (Number(item.quantity) || 0) * (Number(item.unitValue) || 0),
    0,
  );

  return (
    <section className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Rencana barang program</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-xs">
            Pilih dari master Produk Inventory agar rencana dapat diteruskan ke
            pengadaan, gudang, dan distribusi tanpa membuat barang ganda.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, createProgramGoodsPlanDraft()])}
        >
          <PackagePlus className="mr-1 size-4" />
          Tambah barang
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat master produk…</p>
      ) : null}
      {!loading && products.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Belum ada produk aktif. Tambahkan produk dan kategorinya terlebih
          dahulu pada menu{" "}
          <strong>Inventory & Gudang → Produk Inventory</strong>.
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/70 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium">Jumlah</th>
                <th className="px-3 py-2 font-medium">Nilai / unit</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="w-12 px-3 py-2">
                  <span className="sr-only">Hapus</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const product = products.find(
                  (candidate) => candidate.id === item.productId,
                );
                const lineTotal =
                  (Number(item.quantity) || 0) * (Number(item.unitValue) || 0);
                return (
                  <tr className="border-t" key={item.clientId}>
                    <td className="min-w-72 px-3 py-2">
                      <Label
                        className="sr-only"
                        htmlFor={`product-${item.clientId}`}
                      >
                        Produk
                      </Label>
                      <select
                        id={`product-${item.clientId}`}
                        value={item.productId}
                        onChange={(event) =>
                          update(item.clientId, "productId", event.target.value)
                        }
                        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                      >
                        <option value="">-- Pilih produk aktif --</option>
                        {products.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name} · {candidate.sku} ·{" "}
                            {candidate.category_name}
                          </option>
                        ))}
                      </select>
                      {product ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Satuan master: {product.base_unit}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Label
                        className="sr-only"
                        htmlFor={`quantity-${item.clientId}`}
                      >
                        Jumlah
                      </Label>
                      <Input
                        id={`quantity-${item.clientId}`}
                        min="0.0001"
                        step="0.0001"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          update(item.clientId, "quantity", event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Label
                        className="sr-only"
                        htmlFor={`unit-value-${item.clientId}`}
                      >
                        Nilai per unit
                      </Label>
                      <Input
                        id={`unit-value-${item.clientId}`}
                        min="0"
                        step="1"
                        type="number"
                        value={item.unitValue}
                        onChange={(event) =>
                          update(item.clientId, "unitValue", event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {money(lineTotal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        aria-label={`Hapus ${product?.name ?? "barang"}`}
                        onClick={() =>
                          onChange(
                            items.filter(
                              (candidate) =>
                                candidate.clientId !== item.clientId,
                            ),
                          )
                        }
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/40">
              <tr>
                <td className="px-3 py-3 text-right font-medium" colSpan={3}>
                  Total valuasi barang
                </td>
                <td className="px-3 py-3 font-semibold">{money(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </section>
  );
}
