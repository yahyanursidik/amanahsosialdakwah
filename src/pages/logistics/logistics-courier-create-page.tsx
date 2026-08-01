import { useCreate, useNavigation, type HttpError } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { LogisticsCourier } from "@/features/logistics/types";

export function LogisticsCourierCreatePage() {
  const { list } = useNavigation();
  const { mutate, mutation } = useCreate<LogisticsCourier, HttpError>();
  const [form, setForm] = useState({
    code: "",
    name: "",
    courier_type: "external",
    contact_name: "",
    contact_phone: "",
    service_notes: "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutate(
      {
        resource: "logistics_couriers",
        values: {
          ...form,
          contact_name: form.contact_name || undefined,
          contact_phone: form.contact_phone || undefined,
          service_notes: form.service_notes || undefined,
        },
      },
      { onSuccess: () => list("logistics_couriers") },
    );
  };
  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Logistik"
        title="Kurir Baru"
        description="Daftarkan pihak yang bertanggung jawab membawa shipment."
        actions={
          <Button variant="outline" onClick={() => list("logistics_couriers")}>
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      <form onSubmit={submit}>
        <FormSection title="Identitas kurir">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="courier-code">Kode</Label>
              <input
                id="courier-code"
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
              <Label htmlFor="courier-name">Nama</Label>
              <input
                id="courier-name"
                required
                minLength={3}
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="courier-type">Tipe</Label>
              <select
                id="courier-type"
                value={form.courier_type}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    courier_type: e.target.value,
                  }))
                }
              >
                <option value="external">Eksternal</option>
                <option value="internal">Internal</option>
                <option value="partner">Mitra</option>
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="courier-contact">Nama kontak</Label>
              <input
                id="courier-contact"
                value={form.contact_name}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    contact_name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="courier-phone">Telepon</Label>
              <input
                id="courier-phone"
                value={form.contact_phone}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    contact_phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="courier-notes">Catatan layanan</Label>
              <textarea
                id="courier-notes"
                rows={3}
                value={form.service_notes}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    service_notes: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </FormSection>
        {mutation.isError ? (
          <p className="form-error">
            {mutation.error?.message ?? "Kurir gagal dibuat."}
          </p>
        ) : null}
        <div className="form-section__footer">
          <Button type="submit" disabled={mutation.isPending}>
            <Save aria-hidden size={16} />
            Simpan Kurir
          </Button>
        </div>
      </form>
    </section>
  );
}
