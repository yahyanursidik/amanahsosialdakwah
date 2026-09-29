import { useCustomMutation, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";

import {
  ErrorState,
  FormSection,
  MoneyDisplay,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  donorTypeLabels,
  givingTypeLabels,
  itemConditionLabels,
  optionsOf,
} from "@/features/giving/labels";
import type {
  InKindDonation,
  InventoryProductOption,
  InventoryWarehouseOption,
} from "@/features/in-kind-donations/types";
import type { WaqfAsset } from "@/features/waqf/types";
import type {
  CrmContactsDocument,
  ProgramsDocument,
} from "@/generated/neon/models";

type ItemRow = {
  batch_number: string;
  expires_at: string;
  item_condition: string;
  key: string;
  product_id: string;
  quantity: string;
  unit_value: string;
};

function nowLocal() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

const emptyItem = (): ItemRow => ({
  batch_number: "",
  expires_at: "",
  item_condition: "new",
  key: crypto.randomUUID(),
  product_id: "",
  quantity: "",
  unit_value: "",
});

export function InKindDonationCreatePage() {
  const { list, show } = useNavigation();
  const idempotencyKey = useRef(crypto.randomUUID());
  const products = useList<InventoryProductOption>({
    resource: "inventory_products",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const warehouses = useList<InventoryWarehouseOption>({
    resource: "inventory_warehouses",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const contacts = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const programs = useList<ProgramsDocument>({
    resource: "programs",
    filters: [{ field: "is_archived", operator: "eq", value: false }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const waqfAssets = useList<WaqfAsset>({
    resource: "waqf_assets",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { retry: false },
  });
  const mutation = useCustomMutation<InKindDonation>();
  const [form, setForm] = useState({
    donor_contact_id: "",
    donor_name: "",
    donor_type: "individual",
    giving_type: "sedekah",
    notes: "",
    program_id: "",
    received_at: nowLocal(),
    warehouse_id: "",
    waqf_asset_id: "",
  });
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const productById = useMemo(
    () =>
      new Map(
        (products.result?.data ?? []).map((product) => [product.id, product]),
      ),
    [products.result?.data],
  );
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unit_value) || 0),
    0,
  );
  const update = (key: string, patch: Partial<ItemRow>) =>
    setItems((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate(
      {
        url: "/api/v1/in-kind-donations",
        method: "post",
        config: { headers: { "Idempotency-Key": idempotencyKey.current } },
        values: {
          donor_contact_id:
            form.donor_type === "anonymous"
              ? null
              : form.donor_contact_id || null,
          donor_name: form.donor_name || undefined,
          donor_type: form.donor_type,
          giving_type: form.giving_type,
          items: items.map((item) => ({
            batch_number: item.batch_number || undefined,
            expires_at: item.expires_at || undefined,
            item_condition: item.item_condition,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_value: item.unit_value || "0",
          })),
          notes: form.notes || undefined,
          program_id: form.program_id || null,
          received_at: new Date(form.received_at).toISOString(),
          warehouse_id: form.warehouse_id,
          waqf_asset_id:
            form.giving_type === "waqf" ? form.waqf_asset_id || null : null,
        },
      },
      {
        onError: () => {
          idempotencyKey.current = crypto.randomUUID();
        },
        onSuccess: ({ data }) => show("in_kind_donations", data.id),
      },
    );
  };

  const donorOptions = (contacts.result?.data ?? []).filter((contact) =>
    form.donor_type === "institution"
      ? contact.contact_type === "institution"
      : contact.contact_type !== "institution",
  );

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Penghimpunan · Donasi barang"
        title="Terima donasi barang"
        description="Setelah disimpan, barang otomatis menambah stok gudang dan tanda terima siap dicetak untuk donatur. Koreksi selanjutnya dilakukan melalui adjustment inventory."
        actions={
          <Button variant="outline" onClick={() => list("in_kind_donations")}>
            <ArrowLeft aria-hidden size={16} /> Daftar
          </Button>
        }
      />
      {mutation.mutation.isError ? (
        <ErrorState
          title="Donasi barang belum tersimpan"
          description={
            mutation.mutation.error?.message ??
            "Periksa kelengkapan data dan izin penerimaan barang."
          }
        />
      ) : null}
      <form onSubmit={submit}>
        <FormSection
          title="1. Donatur & jenis amanah"
          description="Jenis amanah menentukan pelaporan: zakat, infaq, sedekah, wakaf benda, hibah, atau CSR."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="donor_type">Tipe donatur</Label>
              <select
                id="donor_type"
                value={form.donor_type}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    donor_contact_id: "",
                    donor_type: event.target.value,
                  }))
                }
              >
                {optionsOf(donorTypeLabels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {form.donor_type !== "anonymous" ? (
              <>
                <div className="auth-field">
                  <Label htmlFor="donor_contact_id">
                    Donatur terdaftar (opsional)
                  </Label>
                  <select
                    id="donor_contact_id"
                    value={form.donor_contact_id}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        donor_contact_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Belum terdaftar — isi nama manual</option>
                    {donorOptions.map((contact) => (
                      <option key={contact.$id} value={contact.$id}>
                        {contact.display_name}
                      </option>
                    ))}
                  </select>
                  <span className="auth-field__message">
                    Donatur terdaftar akan memiliki riwayat & laporan pribadi.
                  </span>
                </div>
                <div className="auth-field">
                  <Label htmlFor="donor_name">Nama pada tanda terima</Label>
                  <input
                    id="donor_name"
                    placeholder="Kosongkan untuk memakai nama kontak"
                    required={!form.donor_contact_id}
                    value={form.donor_name}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        donor_name: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : null}
            <div className="auth-field">
              <Label htmlFor="giving_type">Jenis amanah</Label>
              <select
                id="giving_type"
                value={form.giving_type}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    giving_type: event.target.value,
                  }))
                }
              >
                {optionsOf(givingTypeLabels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {form.giving_type === "waqf" ? (
              <div className="auth-field">
                <Label htmlFor="waqf_asset_id">Untuk aset/proyek wakaf</Label>
                <select
                  id="waqf_asset_id"
                  value={form.waqf_asset_id}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      waqf_asset_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Belum ditautkan</option>
                  {(waqfAssets.result?.data ?? []).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="auth-field">
              <Label htmlFor="program_id">Program tujuan (opsional)</Label>
              <select
                id="program_id"
                value={form.program_id}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    program_id: event.target.value,
                  }))
                }
              >
                <option value="">Umum — dialokasikan kemudian</option>
                {(programs.result?.data ?? []).map((program) => (
                  <option key={program.$id} value={program.$id}>
                    {program.code} — {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="2. Penerimaan di gudang"
          description="Gudang menentukan lokasi stok. Tanggal diterima dipakai pada tanda terima dan laporan periode."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="warehouse_id">Gudang penerima</Label>
              <select
                id="warehouse_id"
                required
                value={form.warehouse_id}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    warehouse_id: event.target.value,
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
              <Label htmlFor="received_at">Diterima pada</Label>
              <input
                id="received_at"
                required
                type="datetime-local"
                value={form.received_at}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    received_at: event.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Mis. diantar langsung oleh donatur, kondisi kemasan, pesan donatur."
                value={form.notes}
                onChange={(event) =>
                  setForm((value) => ({ ...value, notes: event.target.value }))
                }
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="3. Rincian barang"
          description="Nilai per unit adalah estimasi wajar untuk pelaporan; boleh 0 bila belum diketahui. Produk yang belum ada harus dibuat dulu di menu Inventory."
          footer={
            <>
              <span className="mr-auto text-sm">
                Estimasi total: <MoneyDisplay amount={total} currency="IDR" />
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItems((rows) => [...rows, emptyItem()])}
              >
                <Plus aria-hidden size={16} /> Tambah barang
              </Button>
              <Button type="submit" disabled={mutation.mutation.isPending}>
                <Save aria-hidden size={16} />
                {mutation.mutation.isPending
                  ? "Menyimpan…"
                  : "Simpan & masukkan ke stok"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {items.map((item, index) => {
              const product = productById.get(item.product_id);
              return (
                <div
                  className="form-grid rounded-2xl border p-3"
                  key={item.key}
                >
                  <div className="auth-field">
                    <Label htmlFor={`product-${item.key}`}>
                      Barang #{index + 1}
                    </Label>
                    <select
                      id={`product-${item.key}`}
                      required
                      value={item.product_id}
                      onChange={(event) =>
                        update(item.key, { product_id: event.target.value })
                      }
                    >
                      <option value="">Pilih produk</option>
                      {(products.result?.data ?? []).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="auth-field">
                    <Label htmlFor={`qty-${item.key}`}>
                      Jumlah {product ? `(${product.base_unit})` : ""}
                    </Label>
                    <input
                      id={`qty-${item.key}`}
                      inputMode="decimal"
                      required
                      value={item.quantity}
                      onChange={(event) =>
                        update(item.key, { quantity: event.target.value })
                      }
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor={`value-${item.key}`}>
                      Estimasi nilai per unit (Rp)
                    </Label>
                    <input
                      id={`value-${item.key}`}
                      inputMode="decimal"
                      value={item.unit_value}
                      onChange={(event) =>
                        update(item.key, { unit_value: event.target.value })
                      }
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor={`condition-${item.key}`}>Kondisi</Label>
                    <select
                      id={`condition-${item.key}`}
                      value={item.item_condition}
                      onChange={(event) =>
                        update(item.key, { item_condition: event.target.value })
                      }
                    >
                      {optionsOf(itemConditionLabels).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="auth-field">
                    <Label htmlFor={`batch-${item.key}`}>
                      No. batch (bila dilacak)
                    </Label>
                    <input
                      id={`batch-${item.key}`}
                      value={item.batch_number}
                      onChange={(event) =>
                        update(item.key, { batch_number: event.target.value })
                      }
                    />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor={`expiry-${item.key}`}>
                      Kedaluwarsa (bila ada)
                    </Label>
                    <input
                      id={`expiry-${item.key}`}
                      type="date"
                      value={item.expires_at}
                      onChange={(event) =>
                        update(item.key, { expires_at: event.target.value })
                      }
                    />
                  </div>
                  {items.length > 1 ? (
                    <div className="auth-field">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setItems((rows) =>
                            rows.filter((row) => row.key !== item.key),
                          )
                        }
                      >
                        <Trash2 aria-hidden size={16} /> Hapus baris
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </FormSection>
      </form>
    </section>
  );
}
