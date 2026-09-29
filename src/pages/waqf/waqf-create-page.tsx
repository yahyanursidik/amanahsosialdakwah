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
import {
  optionsOf,
  waqfAssetTypeLabels,
  waqfDurationLabels,
  waqfPurposeLabels,
  waqfSchemeHints,
  waqfSchemeLabels,
} from "@/features/giving/labels";
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
    collection_scheme: "direct_asset",
    currency: "IDR",
    description: "",
    designation: "",
    donor_contact_id: "",
    duration_end_date: "",
    fundraising_target: "",
    location_text: "",
    name: "",
    pledge_date: "",
    waqf_duration: "permanent",
    waqf_purpose: "khairi",
  });
  const set = (patch: Partial<typeof form>) =>
    setForm((value) => ({ ...value, ...patch }));

  const chooseScheme = (scheme: string) =>
    set({
      asset_type:
        scheme === "cash_waqf"
          ? "cash"
          : form.asset_type === "cash"
            ? "land"
            : form.asset_type,
      collection_scheme: scheme,
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
          designation: form.designation || undefined,
          donor_contact_id: form.donor_contact_id || null,
          duration_end_date:
            form.waqf_duration === "temporary"
              ? form.duration_end_date || null
              : null,
          fundraising_target:
            form.collection_scheme === "cash_for_asset"
              ? form.fundraising_target || null
              : null,
          location_text: form.location_text || undefined,
          pledge_date: form.pledge_date || null,
        },
      },
      { onSuccess: ({ data }) => show("waqf_assets", data.id) },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Wakaf"
        title="Aset / Proyek Wakaf Baru"
        description="Data awal berstatus draft sampai dokumen legal diverifikasi oleh petugas berbeda. Untuk wakaf melalui uang (patungan), setoran wakif sudah bisa dicatat sejak draft."
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
          title="1. Skema wakaf"
          description={waqfSchemeHints[form.collection_scheme]}
        >
          <div className="choice-grid" role="radiogroup" aria-label="Skema wakaf">
            {optionsOf(waqfSchemeLabels).map((option) => (
              <label
                className="choice-card"
                data-selected={form.collection_scheme === option.value}
                key={option.value}
              >
                <input
                  checked={form.collection_scheme === option.value}
                  name="collection_scheme"
                  type="radio"
                  value={option.value}
                  onChange={() => chooseScheme(option.value)}
                />
                <strong>{option.label}</strong>
                <small>{waqfSchemeHints[option.value]}</small>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="2. Identitas aset"
          description="Gunakan nama yang mudah ditelusuri oleh pengelola, wakif, dan auditor."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="waqf-name">Nama aset / proyek</Label>
              <input
                id="waqf-name"
                required
                minLength={3}
                placeholder="Mis. Tanah wakaf Masjid Al-Ikhlas"
                value={form.name}
                onChange={(event) => set({ name: event.target.value })}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-type">Jenis harta benda wakaf</Label>
              <select
                id="waqf-type"
                disabled={form.collection_scheme === "cash_waqf"}
                value={form.asset_type}
                onChange={(event) => set({ asset_type: event.target.value })}
              >
                {optionsOf(waqfAssetTypeLabels)
                  .filter(
                    (option) =>
                      form.collection_scheme === "cash_waqf" ||
                      option.value !== "cash",
                  )
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-designation">Peruntukan</Label>
              <input
                id="waqf-designation"
                placeholder="Mis. masjid, sekolah, kebun produktif, beasiswa"
                value={form.designation}
                onChange={(event) => set({ designation: event.target.value })}
              />
            </div>
            {form.collection_scheme === "cash_for_asset" ? (
              <div className="auth-field">
                <Label htmlFor="waqf-target">Target penghimpunan (Rp)</Label>
                <input
                  id="waqf-target"
                  inputMode="decimal"
                  required
                  value={form.fundraising_target}
                  onChange={(event) =>
                    set({ fundraising_target: event.target.value })
                  }
                />
              </div>
            ) : null}
            <div className="auth-field auth-field--wide">
              <Label htmlFor="waqf-location">Lokasi/catatan alamat</Label>
              <textarea
                id="waqf-location"
                rows={2}
                value={form.location_text}
                onChange={(event) => set({ location_text: event.target.value })}
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="waqf-description">Deskripsi amanah</Label>
              <textarea
                id="waqf-description"
                required
                minLength={10}
                rows={4}
                value={form.description}
                onChange={(event) => set({ description: event.target.value })}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="3. Ikrar & jenis wakaf"
          description="Wakaf khairi untuk kepentingan umum; wakaf ahli untuk keluarga/keturunan tertentu. Wakaf berjangka (muaqqat) wajib memiliki tanggal berakhir."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="waqf-donor">Wakif utama (opsional)</Label>
              <select
                id="waqf-donor"
                value={form.donor_contact_id}
                onChange={(event) =>
                  set({ donor_contact_id: event.target.value })
                }
              >
                <option value="">Belum/lebih dari satu wakif</option>
                {(contacts.result?.data ?? []).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.display_name}
                  </option>
                ))}
              </select>
              <span className="auth-field__message">
                Wakif kolektif dicatat sebagai setoran pada halaman detail.
              </span>
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-purpose">Peruntukan hukum</Label>
              <select
                id="waqf-purpose"
                value={form.waqf_purpose}
                onChange={(event) => set({ waqf_purpose: event.target.value })}
              >
                {optionsOf(waqfPurposeLabels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-duration">Jangka waktu</Label>
              <select
                id="waqf-duration"
                value={form.waqf_duration}
                onChange={(event) => set({ waqf_duration: event.target.value })}
              >
                {optionsOf(waqfDurationLabels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {form.waqf_duration === "temporary" ? (
              <div className="auth-field">
                <Label htmlFor="waqf-end">Berakhir pada</Label>
                <input
                  id="waqf-end"
                  required
                  type="date"
                  value={form.duration_end_date}
                  onChange={(event) =>
                    set({ duration_end_date: event.target.value })
                  }
                />
              </div>
            ) : null}
            <div className="auth-field">
              <Label htmlFor="waqf-pledge">Tanggal ikrar (bila sudah)</Label>
              <input
                id="waqf-pledge"
                type="date"
                value={form.pledge_date}
                onChange={(event) => set({ pledge_date: event.target.value })}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="waqf-value">Nilai perolehan (Rp)</Label>
              <input
                id="waqf-value"
                inputMode="decimal"
                value={form.acquisition_value}
                onChange={(event) =>
                  set({ acquisition_value: event.target.value })
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
                  set({ acquisition_date: event.target.value })
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
