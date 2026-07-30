import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  InventoryAdjustment,
  InventoryProduct,
  InventoryWarehouse,
} from "@/features/inventory/types";

export function InventoryAdjustmentCreatePage() {
  const { list, show } = useNavigation();
  const { mutate: createAdjustment, mutation } =
    useCreate<InventoryAdjustment>();
  const products = useList<InventoryProduct>({
    resource: "inventory_products",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const warehouses = useList<InventoryWarehouse>({
    resource: "inventory_warehouses",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const [form, setForm] = useState({
    adjustment_type: "correction",
    batch_number: "",
    expected_delta: "",
    expires_at: "",
    notes: "",
    product_id: "",
    warehouse_id: "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createAdjustment(
      {
        resource: "inventory_adjustments",
        values: {
          ...form,
          batch_number: form.batch_number || undefined,
          expires_at: form.expires_at || undefined,
        },
      },
      { onSuccess: ({ data }) => show("inventory_adjustments", data.id) },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="inventory-adjustment-create-title">
      <PageHeader
        eyebrow="Inventory"
        title="Buat Adjustment Stok"
        description="Adjustment disimpan sebagai draft, lalu harus disubmit, disetujui independen, dan diposting."
        actions={
          <Button variant="outline" onClick={() => list("inventory_products")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />

      <form className="crm-form" onSubmit={submit}>
        <FormSection
          title="Konteks Adjustment"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => list("inventory_products")}
              >
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                <Save aria-hidden="true" size={16} />
                {mutation.isPending ? "Menyimpan..." : "Simpan Draft"}
              </Button>
            </>
          }
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="product_id">Produk</Label>
              <select
                id="product_id"
                required
                value={form.product_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    product_id: event.target.value,
                  }))
                }
              >
                <option value="">Pilih produk</option>
                {(products.result?.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="warehouse_id">Gudang</Label>
              <select
                id="warehouse_id"
                required
                value={form.warehouse_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    warehouse_id: event.target.value,
                  }))
                }
              >
                <option value="">Pilih gudang</option>
                {(warehouses.result?.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="adjustment_type">Jenis adjustment</Label>
              <select
                id="adjustment_type"
                value={form.adjustment_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adjustment_type: event.target.value,
                  }))
                }
              >
                <option value="correction">Koreksi</option>
                <option value="stocktake_gain">Selisih opname positif</option>
                <option value="stocktake_loss">Selisih opname negatif</option>
                <option value="damage">Rusak</option>
                <option value="loss">Hilang</option>
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="expected_delta">Delta stok</Label>
              <input
                id="expected_delta"
                inputMode="decimal"
                required
                value={form.expected_delta}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expected_delta: event.target.value,
                  }))
                }
              />
              <span className="auth-field__message">
                Gunakan nilai negatif untuk pengurangan stok.
              </span>
            </div>
            <div className="auth-field">
              <Label htmlFor="batch_number">Nomor batch</Label>
              <input
                id="batch_number"
                value={form.batch_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    batch_number: event.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="expires_at">Tanggal expiry</Label>
              <input
                id="expires_at"
                type="date"
                value={form.expires_at}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expires_at: event.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="notes">Alasan adjustment</Label>
              <textarea
                id="notes"
                minLength={10}
                required
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </FormSection>
      </form>
    </section>
  );
}
