import { useCreate, useList, useNavigation, type HttpError } from "@refinedev/core";
import { ArrowLeft, Save, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ErrorState, FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  optionsOf,
  waqfAssetTypeLabels,
  waqfProposalTypeHints,
  waqfProposalTypeLabels,
} from "@/features/giving/labels";
import type {
  WaqfAsset,
  WaqfContactOption,
  WaqfProposal,
} from "@/features/waqf/types";

export function WaqfProposalCreatePage() {
  const { list, show } = useNavigation();
  const contacts = useList<WaqfContactOption>({
    resource: "waqf_contacts",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const assets = useList<WaqfAsset>({
    resource: "waqf_assets",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const { mutate, mutation } = useCreate<WaqfProposal, HttpError>();
  const [form, setForm] = useState({
    asset_id: "",
    beneficiary_estimate: "",
    description: "",
    location_text: "",
    proposal_type: "waqf_project",
    proposed_asset_type: "building",
    proposer_contact_id: "",
    requested_amount: "",
    title: "",
  });
  const set = (patch: Partial<typeof form>) =>
    setForm((value) => ({ ...value, ...patch }));
  const isBenefit = form.proposal_type === "benefit_request";
  const proposer = (contacts.result?.data ?? []).find(
    (contact) => contact.id === form.proposer_contact_id,
  );

  const save = (submitNow: boolean) => (event?: FormEvent) => {
    event?.preventDefault();
    mutate(
      {
        resource: "waqf_proposals",
        values: {
          asset_id: isBenefit ? form.asset_id || null : null,
          beneficiary_estimate: form.beneficiary_estimate
            ? Number(form.beneficiary_estimate)
            : null,
          description: form.description,
          location_text: form.location_text || undefined,
          proposal_type: form.proposal_type,
          proposed_asset_type: isBenefit ? null : form.proposed_asset_type,
          proposer_contact_id: form.proposer_contact_id,
          requested_amount: form.requested_amount || null,
          submit_now: submitNow,
          title: form.title,
        },
      },
      { onSuccess: ({ data }) => show("waqf_proposals", data.id) },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Wakaf · Pengajuan"
        title="Pengajuan program wakaf baru"
        description="Catat usulan dari individu atau lembaga. Pengaju harus terdaftar di Semua kontak (tipe orang atau lembaga)."
        actions={
          <Button variant="outline" onClick={() => list("waqf_proposals")}>
            <ArrowLeft aria-hidden size={16} /> Daftar
          </Button>
        }
      />
      {mutation.isError ? (
        <ErrorState
          title="Pengajuan belum tersimpan"
          description={mutation.error?.message ?? "Periksa kelengkapan data."}
        />
      ) : null}
      <form onSubmit={save(false)}>
        <FormSection
          title="1. Jenis pengajuan"
          description={waqfProposalTypeHints[form.proposal_type]}
        >
          <div className="choice-grid" role="radiogroup" aria-label="Jenis pengajuan">
            {optionsOf(waqfProposalTypeLabels).map((option) => (
              <label
                className="choice-card"
                data-selected={form.proposal_type === option.value}
                key={option.value}
              >
                <input
                  checked={form.proposal_type === option.value}
                  name="proposal_type"
                  type="radio"
                  value={option.value}
                  onChange={() => set({ proposal_type: option.value })}
                />
                <strong>{option.label}</strong>
                <small>{waqfProposalTypeHints[option.value]}</small>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="2. Pengaju">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="proposer">Individu / lembaga pengaju</Label>
              <select
                id="proposer"
                required
                value={form.proposer_contact_id}
                onChange={(event) =>
                  set({ proposer_contact_id: event.target.value })
                }
              >
                <option value="">Pilih kontak</option>
                {(contacts.result?.data ?? []).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.display_name} —{" "}
                    {contact.contact_type === "institution" ? "Lembaga" : "Individu"}
                  </option>
                ))}
              </select>
              <span className="auth-field__message">
                {proposer
                  ? `Tercatat sebagai pengaju ${proposer.contact_type === "institution" ? "lembaga" : "individu"}.`
                  : "Belum ada? Tambahkan lebih dulu di Semua kontak."}
              </span>
            </div>
          </div>
        </FormSection>

        <FormSection title="3. Rincian usulan">
          <div className="form-grid">
            <div className="auth-field auth-field--wide">
              <Label htmlFor="title">Judul</Label>
              <input
                id="title"
                minLength={5}
                required
                placeholder={
                  isBenefit
                    ? "Mis. Beasiswa santri dari hasil wakaf kebun"
                    : "Mis. Pembangunan Masjid Al-Ikhlas Desa Sukamaju"
                }
                value={form.title}
                onChange={(event) => set({ title: event.target.value })}
              />
            </div>
            {isBenefit ? (
              <div className="auth-field">
                <Label htmlFor="asset">Aset wakaf sumber manfaat</Label>
                <select
                  id="asset"
                  required
                  value={form.asset_id}
                  onChange={(event) => set({ asset_id: event.target.value })}
                >
                  <option value="">Pilih aset aktif</option>
                  {(assets.result?.data ?? []).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.reference_number})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="auth-field">
                <Label htmlFor="asset_type">Jenis aset yang diusulkan</Label>
                <select
                  id="asset_type"
                  value={form.proposed_asset_type}
                  onChange={(event) =>
                    set({ proposed_asset_type: event.target.value })
                  }
                >
                  {optionsOf(waqfAssetTypeLabels).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="auth-field">
              <Label htmlFor="amount">
                {form.proposal_type === "asset_offer"
                  ? "Perkiraan nilai aset (Rp, opsional)"
                  : "Nilai kebutuhan (Rp, opsional)"}
              </Label>
              <input
                id="amount"
                inputMode="decimal"
                value={form.requested_amount}
                onChange={(event) =>
                  set({ requested_amount: event.target.value })
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="beneficiaries">Perkiraan penerima manfaat</Label>
              <input
                id="beneficiaries"
                inputMode="numeric"
                value={form.beneficiary_estimate}
                onChange={(event) =>
                  set({ beneficiary_estimate: event.target.value })
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="location">Lokasi</Label>
              <textarea
                id="location"
                rows={2}
                value={form.location_text}
                onChange={(event) => set({ location_text: event.target.value })}
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="description">
                Latar belakang, manfaat, dan rencana (min. 20 karakter)
              </Label>
              <textarea
                id="description"
                minLength={20}
                required
                rows={6}
                value={form.description}
                onChange={(event) => set({ description: event.target.value })}
              />
            </div>
          </div>
        </FormSection>

        <div className="form-actions">
          <Button type="submit" variant="outline" disabled={mutation.isPending}>
            <Save aria-hidden size={16} /> Simpan draft
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={(event) => {
              const formElement = event.currentTarget.form;
              if (formElement && !formElement.reportValidity()) return;
              save(true)();
            }}
          >
            <Send aria-hidden size={16} /> Simpan & ajukan untuk dinilai
          </Button>
        </div>
      </form>
    </section>
  );
}
