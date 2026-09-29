import { useQuery } from "@tanstack/react-query";
import { Copy, ListChecks, Pencil, Plus, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  ErrorState,
  FormSection,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import type { FieldSettings } from "@/features/field/checklist-rules";
import type { FieldTaskType } from "@/features/field/types";
import { fieldTaskTypeHints, fieldTaskTypeLabels, optionsOf } from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

type SettingsResponse = FieldSettings & { updated_at: string | null; updated_by_name: string | null };

export type FieldTemplateSummary = {
  description: string | null;
  id: string;
  is_default: boolean;
  item_count: number;
  name: string;
  program_id: string | null;
  program_name: string | null;
  status: "active" | "archived";
  task_type: FieldTaskType;
  updated_at: string;
  usage_count: number;
};

const toggles: Array<{ hint: string; key: keyof FieldSettings; label: string }> = [
  {
    hint: "Setiap tugas otomatis diakhiri langkah “Kirim laporan lapangan”; tugas selesai saat laporan terkirim.",
    key: "require_report_to_complete",
    label: "Tugas wajib diakhiri laporan lapangan",
  },
  {
    hint: "Laporan penyaluran dan pengiriman ditolak bila tanpa koordinat GPS.",
    key: "require_gps_for_handover",
    label: "Serah terima wajib menyertakan lokasi GPS",
  },
  {
    hint: "Bila dimatikan, hanya koordinator yang bisa membatalkan langkah yang sudah dicentang.",
    key: "officer_can_uncheck",
    label: "Petugas boleh membatalkan centang",
  },
  {
    hint: "Laporan kunjungan verifikasi yang disetujui supervisor mengubah status kelayakan penerima.",
    key: "verification_updates_profile",
    label: "Hasil verifikasi memperbarui status kelayakan penerima",
  },
];

function RulesForm({ initial, onSaved }: { initial: SettingsResponse; onSaved: () => void }) {
  const [form, setForm] = useState<FieldSettings>({
    default_due_days: initial.default_due_days,
    handover_min_photos: initial.handover_min_photos,
    officer_can_uncheck: initial.officer_can_uncheck,
    require_gps_for_handover: initial.require_gps_for_handover,
    require_report_to_complete: initial.require_report_to_complete,
    verification_updates_profile: initial.verification_updates_profile,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/api/v1/field/settings", { body: JSON.stringify(form), method: "PUT" });
      setMessage("Aturan tersimpan dan langsung berlaku untuk tugas & laporan berikutnya.");
      onSaved();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "Aturan belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSection
      title="Aturan kerja lapangan"
      description="Berlaku untuk seluruh petugas di organisasi ini. Perubahan tidak mengubah ceklis tugas yang sudah dibuat."
      footer={
        <div className="settings-footer">
          {message ? <span role="status">{message}</span> : initial.updated_at ? (
            <small>Terakhir diubah {new Date(initial.updated_at).toLocaleString("id-ID")}{initial.updated_by_name ? ` oleh ${initial.updated_by_name}` : ""}</small>
          ) : <small>Masih memakai aturan bawaan.</small>}
          <Button disabled={saving} onClick={() => void save()}>
            <Save aria-hidden size={16} /> {saving ? "Menyimpan…" : "Simpan aturan"}
          </Button>
        </div>
      }
    >
      <div className="settings-toggles">
        {toggles.map((toggle) => (
          <label className="settings-toggle" key={toggle.key}>
            <input
              checked={Boolean(form[toggle.key])}
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, [toggle.key]: event.target.checked }))}
            />
            <span>
              <strong>{toggle.label}</strong>
              <small>{toggle.hint}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="form-grid mt-3">
        <div className="auth-field">
          <Label htmlFor="min-photos">Minimal foto pada laporan serah terima</Label>
          <select id="min-photos" value={form.handover_min_photos} onChange={(event) => setForm({ ...form, handover_min_photos: Number(event.target.value) })}>
            {[0, 1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>{count === 0 ? "Tidak wajib" : `${count} foto`}</option>
            ))}
          </select>
          <span className="auth-field__message">Untuk laporan penyaluran dan pengiriman barang.</span>
        </div>
        <div className="auth-field">
          <Label htmlFor="due-days">Tenggat bawaan tugas baru</Label>
          <select id="due-days" value={form.default_due_days} onChange={(event) => setForm({ ...form, default_due_days: Number(event.target.value) })}>
            {[0, 1, 2, 3, 5, 7, 14, 30].map((days) => (
              <option key={days} value={days}>{days === 0 ? "Tanpa tenggat" : days === 1 ? "Besok" : `${days} hari`}</option>
            ))}
          </select>
          <span className="auth-field__message">Terisi otomatis saat koordinator membuat tugas; tetap bisa diubah.</span>
        </div>
      </div>
    </FormSection>
  );
}

export function FieldSettingsPage() {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [showArchived, setShowArchived] = useState(false);
  const settings = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: SettingsResponse }>("/api/v1/field/settings"),
    queryKey: ["field", "settings", organizationId],
  });
  const templates = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: FieldTemplateSummary[] }>("/api/v1/field/templates"),
    queryKey: ["field", "templates", organizationId],
  });
  const all = templates.data?.data ?? [];
  const archived = all.filter((template) => template.status === "archived");

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Lapangan"
        title="Pengaturan lapangan"
        description="Atur cara kerja tim lapangan sesuai kebutuhan lembaga: aturan wajib (foto, GPS, laporan) dan template ceklis/to-do untuk setiap jenis tugas, bisa berbeda per program."
      />

      {settings.isLoading ? <LoadingSkeleton lines={6} /> : null}
      {settings.isError ? <ErrorState title="Aturan belum dapat dimuat" onRetry={() => settings.refetch()} /> : null}
      {settings.data ? (
        <RulesForm initial={settings.data.data} key={settings.data.data.updated_at ?? "default"} onSaved={() => void settings.refetch()} />
      ) : null}

      <FormSection
        title="Template ceklis per jenis tugas"
        description="Template bawaan dipakai otomatis saat membuat tugas. Template khusus program didahulukan untuk program tersebut. Koordinator tetap bisa menambah langkah per tugas."
      >
        {templates.isLoading ? <LoadingSkeleton lines={4} /> : null}
        <div className="template-type-grid">
          {optionsOf(fieldTaskTypeLabels).map((type) => {
            const list = all.filter((template) => template.status === "active" && template.task_type === type.value);
            const hasDefault = list.some((template) => template.is_default && !template.program_id);
            return (
              <article className="template-type-card" key={type.value}>
                <header>
                  <div>
                    <strong><ListChecks aria-hidden className="inline" size={16} /> {type.label}</strong>
                    <small>{fieldTaskTypeHints[type.value]}</small>
                  </div>
                </header>
                {!hasDefault ? (
                  <p className="template-builtin">
                    <ShieldCheck aria-hidden className="inline" size={14} /> Memakai ceklis bawaan sistem.
                    <Link className={buttonVariants({ size: "sm", variant: "ghost" })} to={`/field/settings/templates/new?type=${type.value}&default=1`}>
                      <Copy aria-hidden size={14} /> Salin & sesuaikan
                    </Link>
                  </p>
                ) : null}
                <ul className="template-list">
                  {list.map((template) => (
                    <li key={template.id}>
                      <div>
                        <strong>{template.name}</strong>
                        <small>
                          {template.item_count} langkah
                          {template.program_name ? ` · khusus ${template.program_name}` : ""}
                          {template.usage_count > 0 ? ` · dipakai ${template.usage_count} tugas` : ""}
                        </small>
                      </div>
                      <div className="template-list__actions">
                        {template.is_default ? <StatusBadge tone="success">Bawaan</StatusBadge> : null}
                        <Link className={buttonVariants({ size: "sm", variant: "outline" })} to={`/field/settings/templates/${template.id}`}>
                          <Pencil aria-hidden size={14} /> Ubah
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link className={buttonVariants({ size: "sm", variant: "ghost" })} to={`/field/settings/templates/new?type=${type.value}`}>
                  <Plus aria-hidden size={14} /> Template {type.label.toLowerCase()} baru
                </Link>
              </article>
            );
          })}
        </div>
        {archived.length > 0 ? (
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => setShowArchived((value) => !value)}>
              {showArchived ? "Sembunyikan" : "Tampilkan"} {archived.length} template diarsipkan
            </Button>
            {showArchived ? (
              <ul className="template-list">
                {archived.map((template) => (
                  <li key={template.id}>
                    <div>
                      <strong>{template.name}</strong>
                      <small>{fieldTaskTypeLabels[template.task_type]} · diarsipkan</small>
                    </div>
                    <Link className={buttonVariants({ size: "sm", variant: "outline" })} to={`/field/settings/templates/${template.id}`}>
                      Buka
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </FormSection>
    </section>
  );
}
