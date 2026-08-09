import {
  useCreate,
  useList,
  useNavigation,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  ErrorState,
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { WaqfAsset, WaqfContactOption } from "@/features/waqf/types";

export function WaqfCreatePage() {
  const { list, show } = useNavigation();
  const contacts = useList<WaqfContactOption>({
    resource: "waqf_contacts",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const { mutate, mutation } = useCreate<WaqfAsset, HttpError>();
  const [form, setForm] = useState({
    acquisition_date: "",
    acquisition_value: "",
    asset_type: "land",
    currency: "IDR",
    description: "",
    donor_contact_id: "",
    location_text: "",
    name: "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutate(
      {
        resource: "waqf_assets",
        values: {
          ...form,
          acquisition_date: form.acquisition_date || undefined,
          acquisition_value: form.acquisition_value || undefined,
          donor_contact_id: form.donor_contact_id || null,
          location_text: form.location_text || undefined,
        },
      },
      { onSuccess: ({ data }) => show("waqf_assets", data.id) },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Wakaf"
        title="Aset Wakaf Baru"
        description="Data awal aset berstatus draft sampai dokumen legal diverifikasi oleh aktor berbeda."
        actions={
          <Button variant="outline" onClick={() => list("waqf_assets")}>
            <ArrowLeft aria-hidden size={16} /> Daftar
          </Button>
        }
      />
      {mutation.isError ? (
        <ErrorState
          title="Aset wakaf tidak dapat disimpan"
          description={
            mutation.error?.message ??
            "Periksa kelengkapan data dan permission wakaf."
          }
        />
      ) : null}
      <form onSubmit={submit}>
        <FormSection
          title="Identitas aset"
          description="Gunakan nama yang mudah ditelusuri oleh pengelola dan auditor."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="waqf-name">Nama aset</Label>
              <input
                id="waqf-name"
                required
                minLength={3}
                value={form.name}
                onChange={(event) =>
                  setForm((value) => ({ ...value, name: event.target.value }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-type">Jenis aset</Label>
              <select
                id="waqf-type"
                value={form.asset_type}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    asset_type: event.target.value,
                  }))
                }
              >
                {[
                  ["land", "Tanah"],
                  ["building", "Bangunan"],
                  ["cash", "Wakaf uang"],
                  ["productive_asset", "Aset produktif"],
                  ["vehicle", "Kendaraan"],
                  ["equipment", "Peralatan"],
                  ["other", "Lainnya"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-donor">Wakif/Pemberi</Label>
              <select
                id="waqf-donor"
                value={form.donor_contact_id}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    donor_contact_id: event.target.value,
                  }))
                }
              >
                <option value="">Belum ditentukan</option>
                {(contacts.result?.data ?? []).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-value">Nilai perolehan</Label>
              <input
                id="waqf-value"
                inputMode="decimal"
                value={form.acquisition_value}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    acquisition_value: event.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-date">Tanggal perolehan</Label>
              <input
                id="waqf-date"
                type="date"
                value={form.acquisition_date}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    acquisition_date: event.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="waqf-location">Lokasi/catatan alamat</Label>
              <textarea
                id="waqf-location"
                rows={3}
                value={form.location_text}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    location_text: event.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="waqf-description">Deskripsi amanah</Label>
              <textarea
                id="waqf-description"
                required
                minLength={10}
                rows={5}
                value={form.description}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </FormSection>
        <div className="form-actions">
          <Button type="submit" disabled={mutation.isPending}>
            <Save aria-hidden size={16} /> Simpan aset wakaf
          </Button>
        </div>
      </form>
    </section>
  );
}
