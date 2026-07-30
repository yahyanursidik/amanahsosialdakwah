import { useCreate, useNavigation, type HttpError } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ProcurementRequest } from "@/features/procurement/types";

type ProcurementForm = {
  currency: string;
  expected_at: string;
  item_name: string;
  item_quantity: string;
  item_unit: string;
  program_id: string;
  purpose: string;
  title: string;
};

const initialForm: ProcurementForm = {
  currency: "IDR",
  expected_at: "",
  item_name: "",
  item_quantity: "1",
  item_unit: "pcs",
  program_id: "",
  purpose: "",
  title: "",
};

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function ProcurementCreatePage() {
  const { list, show } = useNavigation();
  const { mutate: createRequest, mutation } =
    useCreate<ProcurementRequest, HttpError>();
  const [form, setForm] = useState(initialForm);

  const update = (field: keyof ProcurementForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createRequest(
      {
        resource: "procurement",
        values: {
          currency: form.currency,
          expected_at: toIso(form.expected_at),
          items: [
            {
              name: form.item_name,
              quantity: form.item_quantity,
              unit: form.item_unit,
            },
          ],
          program_id: form.program_id || null,
          purpose: form.purpose,
          title: form.title,
        },
      },
      {
        onSuccess: ({ data }) => show("procurement", data.id),
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="procurement-create-title">
      <PageHeader
        eyebrow="Procurement"
        title="Permintaan Pengadaan Baru"
        description="Catat kebutuhan barang atau jasa sebelum dibuatkan purchase order."
        actions={
          <Button variant="outline" onClick={() => list("procurement")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Daftar
          </Button>
        }
      />
      <form onSubmit={submit}>
        <FormSection
          title="Kebutuhan"
          description="Data ini menjadi konteks resmi permintaan dan tidak diedit setelah workflow berjalan."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="title">Judul kebutuhan</Label>
              <input
                id="title"
                required
                minLength={3}
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="program_id">Program ID opsional</Label>
              <input
                id="program_id"
                placeholder="UUID program bila pengadaan terikat program"
                value={form.program_id}
                onChange={(event) => update("program_id", event.target.value)}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="currency">Mata uang</Label>
              <input
                id="currency"
                required
                maxLength={3}
                value={form.currency}
                onChange={(event) => update("currency", event.target.value.toUpperCase())}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="expected_at">Dibutuhkan pada</Label>
              <input
                id="expected_at"
                type="datetime-local"
                value={form.expected_at}
                onChange={(event) => update("expected_at", event.target.value)}
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="purpose">Alasan pengadaan</Label>
              <textarea
                id="purpose"
                required
                minLength={10}
                rows={4}
                value={form.purpose}
                onChange={(event) => update("purpose", event.target.value)}
              />
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Item Awal"
          description="Phase ini mencatat item sebagai JSON terkontrol; normalisasi stok masuk phase inventory."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="item_name">Nama item</Label>
              <input
                id="item_name"
                required
                minLength={3}
                value={form.item_name}
                onChange={(event) => update("item_name", event.target.value)}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="item_quantity">Jumlah</Label>
              <input
                id="item_quantity"
                required
                inputMode="decimal"
                value={form.item_quantity}
                onChange={(event) => update("item_quantity", event.target.value)}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="item_unit">Satuan</Label>
              <input
                id="item_unit"
                required
                value={form.item_unit}
                onChange={(event) => update("item_unit", event.target.value)}
              />
            </div>
          </div>
        </FormSection>
      {mutation.isError ? (
          <p className="form-error">
            {mutation.error?.message ?? "Permintaan pengadaan gagal dibuat."}
          </p>
        ) : null}
        <div className="form-section__footer">
          <Button type="submit" disabled={mutation.isPending}>
            <Save aria-hidden="true" size={16} />
            Simpan Draft
          </Button>
        </div>
      </form>
    </section>
  );
}
