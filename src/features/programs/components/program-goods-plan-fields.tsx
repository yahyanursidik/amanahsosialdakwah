import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/neon/http";

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

function createProgramGoodsPlanDraft(productId = "", unitValue = "0"): ProgramGoodsPlanDraft {
  return {
    clientId: crypto.randomUUID(),
    notes: "",
    productId,
    quantity: "1",
    unitValue,
  };
}

const commonUnits = ["paket", "pcs", "kg", "liter", "botol", "dus", "karung", "set", "eksemplar", "lembar"];

/** SKU otomatis dari nama produk agar admin tidak perlu memikirkan kode. */
function skuFromName(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `${base || "PRODUK"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function NewProductForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (product: ProgramGoodsPlanProduct, unitValue: string) => void;
}) {
  const [form, setForm] = useState({ category: "", name: "", unit: "paket", unitValue: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (form.name.trim().length < 3) {
      setError("Nama produk minimal 3 karakter.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch<{ data: ProgramGoodsPlanProduct & { category: string | null } }>(
        "/api/v1/inventory/products",
        {
          body: JSON.stringify({
            base_unit: form.unit.trim() || "pcs",
            category: form.category.trim() || undefined,
            name: form.name.trim(),
            sku: skuFromName(form.name),
          }),
          method: "POST",
        },
      );
      onCreated(
        { ...response.data, category_name: response.data.category ?? form.category },
        form.unitValue || "0",
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Produk belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-primary/40 bg-background space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Produk baru</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="new-product-name">Nama produk *</Label>
          <Input id="new-product-name" placeholder="Mis. Beras premium 5 kg" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-product-unit">Satuan</Label>
          <Input id="new-product-unit" list="program-product-units" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
          <datalist id="program-product-units">
            {commonUnits.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-product-value">Nilai / unit (Rp)</Label>
          <Input id="new-product-value" min="0" type="number" value={form.unitValue} onChange={(event) => setForm({ ...form, unitValue: event.target.value })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="new-product-category">Kelompok barang (opsional)</Label>
          <Input id="new-product-category" placeholder="Mis. pangan, sandang, pendidikan" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        </div>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <p className="text-muted-foreground text-xs">
        Produk tersimpan ke master Inventory (kode SKU dibuat otomatis) dan langsung masuk ke rencana barang.
      </p>
      <div className="flex gap-2">
        <Button disabled={saving} size="sm" type="button" onClick={() => void save()}>
          {saving ? "Menyimpan…" : "Simpan & tambahkan"}
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function money(value: number) {
  return `Rp ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

type ProgramGoodsPlanFieldsProps = {
  items: ProgramGoodsPlanDraft[];
  loading: boolean;
  onChange: (items: ProgramGoodsPlanDraft[]) => void;
  /** Dipanggil setelah produk baru dibuat agar daftar produk dimuat ulang. */
  onProductCreated?: () => void;
  products: ProgramGoodsPlanProduct[];
};

export function ProgramGoodsPlanFields({
  items,
  loading,
  onChange,
  onProductCreated,
  products,
}: ProgramGoodsPlanFieldsProps) {
  const [creating, setCreating] = useState(false);
  const [extraProducts, setExtraProducts] = useState<ProgramGoodsPlanProduct[]>([]);
  const allProducts = [
    ...products,
    ...extraProducts.filter((extra) => !products.some((product) => product.id === extra.id)),
  ];
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange([...items, createProgramGoodsPlanDraft()])}
          >
            <PackagePlus className="mr-1 size-4" />
            Tambah barang
          </Button>
          <CanAccess action="manage" resource="inventory_products">
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(true)}>
              <Plus className="mr-1 size-4" />
              Produk baru
            </Button>
          </CanAccess>
        </div>
      </div>

      {creating ? (
        <NewProductForm
          onCancel={() => setCreating(false)}
          onCreated={(product, unitValue) => {
            setExtraProducts((current) => [...current, product]);
            onChange([...items, createProgramGoodsPlanDraft(product.id, unitValue)]);
            setCreating(false);
            onProductCreated?.();
          }}
        />
      ) : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat master produk…</p>
      ) : null}
      {!loading && allProducts.length === 0 && !creating ? (
        <div className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Belum ada produk. Klik <strong>Produk baru</strong> untuk menambahkan
          barang langsung dari sini.
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
                const product = allProducts.find(
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
                        {allProducts.map((candidate) => (
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
