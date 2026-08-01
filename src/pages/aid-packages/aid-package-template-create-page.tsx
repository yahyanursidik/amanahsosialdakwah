import {
  useCreate,
  useList,
  useNavigation,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AidPackageTemplate } from "@/features/aid-packages/types";
import type { InventoryProduct } from "@/features/inventory/types";

type ItemForm = {
  product_id: string;
  quantity: string;
  unit: string;
  allow_substitution: boolean;
  substitution_notes: string;
};
const emptyItem = (): ItemForm => ({
  product_id: "",
  quantity: "1",
  unit: "",
  allow_substitution: false,
  substitution_notes: "",
});

export function AidPackageTemplateCreatePage() {
  const { list, show } = useNavigation();
  const products = useList<InventoryProduct>({
    resource: "inventory_products",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const { mutate, mutation } = useCreate<AidPackageTemplate, HttpError>();
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const updateItem = (index: number, patch: Partial<ItemForm>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutate(
      {
        resource: "aid_package_templates",
        values: {
          ...form,
          description: form.description || undefined,
          items: items.map((item) => ({
            ...item,
            substitution_notes: item.substitution_notes || undefined,
          })),
        },
      },
      { onSuccess: ({ data }) => show("aid_package_templates", data.id) },
    );
  };
  return (
    <section
      className="workspace-page"
      aria-labelledby="package-template-create-title"
    >
      <PageHeader
        eyebrow="Paket Bantuan"
        title="Template Paket Baru"
        description="Tentukan kuantitas komponen untuk satu paket."
        actions={
          <Button
            variant="outline"
            onClick={() => list("aid_package_templates")}
          >
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      <form onSubmit={submit}>
        <FormSection title="Identitas template">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="package-code">Kode</Label>
              <input
                id="package-code"
                required
                minLength={2}
                value={form.code}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    code: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="package-name">Nama template</Label>
              <input
                id="package-name"
                required
                minLength={3}
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="package-description">Deskripsi</Label>
              <textarea
                id="package-description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Komponen per paket"
          description="Satuan otomatis mengikuti satuan dasar produk."
        >
          <div className="space-y-4">
            {items.map((item, index) => (
              <div className="form-grid rounded-xl border p-4" key={index}>
                <div className="auth-field">
                  <Label htmlFor={`product-${index}`}>Produk</Label>
                  <select
                    id={`product-${index}`}
                    required
                    value={item.product_id}
                    onChange={(e) => {
                      const product = (products.result?.data ?? []).find(
                        (candidate) => candidate.id === e.target.value,
                      );
                      updateItem(index, {
                        product_id: e.target.value,
                        unit: product?.base_unit ?? "",
                      });
                    }}
                  >
                    <option value="">Pilih produk</option>
                    {(products.result?.data ?? []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="auth-field">
                  <Label htmlFor={`quantity-${index}`}>Kuantitas</Label>
                  <input
                    id={`quantity-${index}`}
                    required
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, { quantity: e.target.value })
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor={`unit-${index}`}>Satuan</Label>
                  <input id={`unit-${index}`} readOnly value={item.unit} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.allow_substitution}
                    onChange={(e) =>
                      updateItem(index, {
                        allow_substitution: e.target.checked,
                      })
                    }
                  />
                  Izinkan substitusi setara
                </label>
                <div className="auth-field auth-field--wide">
                  <Label htmlFor={`substitution-${index}`}>
                    Ketentuan substitusi
                  </Label>
                  <input
                    id={`substitution-${index}`}
                    disabled={!item.allow_substitution}
                    value={item.substitution_notes}
                    onChange={(e) =>
                      updateItem(index, { substitution_notes: e.target.value })
                    }
                  />
                </div>
                {items.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 aria-hidden size={16} />
                    Hapus
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((current) => [...current, emptyItem()])}
          >
            <Plus aria-hidden size={16} />
            Tambah komponen
          </Button>
        </FormSection>
        {mutation.isError ? (
          <p className="form-error">
            {mutation.error?.message ?? "Template gagal dibuat."}
          </p>
        ) : null}
        <div className="form-section__footer">
          <Button type="submit" disabled={mutation.isPending}>
            <Save aria-hidden size={16} />
            Simpan Draft
          </Button>
        </div>
      </form>
    </section>
  );
}
