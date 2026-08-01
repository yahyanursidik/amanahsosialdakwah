import {
  useCreate,
  useList,
  useNavigation,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  AidPackagePacking,
  AidPackageTemplate,
} from "@/features/aid-packages/types";
import type { InventoryWarehouse } from "@/features/inventory/types";

export function AidPackagePackingCreatePage() {
  const { list, show } = useNavigation();
  const templates = useList<AidPackageTemplate>({
    resource: "aid_package_templates",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const warehouses = useList<InventoryWarehouse>({
    resource: "inventory_warehouses",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const { mutate, mutation } = useCreate<AidPackagePacking, HttpError>();
  const [form, setForm] = useState({
    template_id: "",
    warehouse_id: "",
    package_count: "1",
    recipient_label: "",
    notes: "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutate(
      {
        resource: "aid_package_packings",
        values: {
          ...form,
          package_count: Number(form.package_count),
          recipient_label: form.recipient_label || undefined,
          notes: form.notes || undefined,
        },
      },
      { onSuccess: ({ data }) => show("aid_package_packings", data.id) },
    );
  };
  return (
    <section className="workspace-page" aria-labelledby="packing-create-title">
      <PageHeader
        eyebrow="Paket Bantuan"
        title="Rencana Packing"
        description="Pilih template aktif dan gudang sumber. Stok baru berkurang saat command packing dijalankan."
        actions={
          <Button
            variant="outline"
            onClick={() => list("aid_package_packings")}
          >
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      <form onSubmit={submit}>
        <FormSection title="Konteks packing">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="packing-template">Template</Label>
              <select
                id="packing-template"
                required
                value={form.template_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    template_id: e.target.value,
                  }))
                }
              >
                <option value="">Pilih template aktif</option>
                {(templates.result?.data ?? []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.code} — {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="packing-warehouse">Gudang sumber</Label>
              <select
                id="packing-warehouse"
                required
                value={form.warehouse_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    warehouse_id: e.target.value,
                  }))
                }
              >
                <option value="">Pilih gudang</option>
                {(warehouses.result?.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} — {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="package-count">Jumlah paket</Label>
              <input
                id="package-count"
                required
                min={1}
                max={100000}
                type="number"
                value={form.package_count}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    package_count: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="recipient-label">Label penerima / tujuan</Label>
              <input
                id="recipient-label"
                value={form.recipient_label}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    recipient_label: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="packing-notes">Catatan</Label>
              <textarea
                id="packing-notes"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({ ...current, notes: e.target.value }))
                }
              />
            </div>
          </div>
        </FormSection>
        {mutation.isError ? (
          <p className="form-error">
            {mutation.error?.message ?? "Rencana packing gagal dibuat."}
          </p>
        ) : null}
        <div className="form-section__footer">
          <Button type="submit" disabled={mutation.isPending}>
            <Save aria-hidden size={16} />
            Simpan Rencana
          </Button>
        </div>
      </form>
    </section>
  );
}
