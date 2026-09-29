import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, MapPin, Save, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { ErrorState, FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import {
  captureGps,
  compressPhoto,
  formatGps,
  newClientReference,
  type CompressedPhoto,
  type GpsReading,
} from "@/features/field/device";
import { handoverReportIssues, type FieldSettings } from "@/features/field/checklist-rules";
import { submitFieldReport } from "@/features/field/outbox";
import {
  fieldReportTypeHints,
  fieldReportTypeLabels,
  optionsOf,
  severityLabels,
  verificationCheckLabels,
  verificationResultLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type { BeneficiaryListItem } from "@/features/beneficiaries/types";
import { apiFetch } from "@/lib/neon/http";

const nowLocal = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const numberOrNull = (value: string) => (value === "" ? null : Number(value));

export function FieldReportFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const clientReference = useRef(newClientReference());
  const taskId = params.get("task");
  const [type, setType] = useState(params.get("type") ?? "situation");
  const [form, setForm] = useState({
    amount_distributed: params.get("amount") ?? "",
    beneficiaries_reached:
      taskId && params.get("beneficiary") && params.get("type") === "distribution" ? "1" : "",
    beneficiary_contact_id: params.get("beneficiary") ?? "",
    follow_up_needed: false,
    household_size_observed: "",
    issues: "",
    location_text: "",
    occurred_at: nowLocal(),
    packages_delivered: params.get("packages") ?? "",
    severity: "medium",
    summary: "",
    title: params.get("title") ?? "",
    verification_result: "eligible",
  });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [gps, setGps] = useState<GpsReading | null>(null);
  const [gpsState, setGpsState] = useState({ busy: false, error: "" });
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));

  const settings = useQuery({
    enabled: Boolean(organizationId) && navigator.onLine,
    queryFn: () => apiFetch<{ data: FieldSettings }>("/api/v1/field/settings"),
    queryKey: ["field", "settings", organizationId],
    staleTime: 5 * 60_000,
  });
  const rules = settings.data?.data;
  const isHandover = ["distribution", "delivery"].includes(type);
  const handoverRules = rules && isHandover
    ? [
        rules.handover_min_photos > 0 ? `minimal ${rules.handover_min_photos} foto` : null,
        rules.require_gps_for_handover ? "lokasi GPS" : null,
      ].filter(Boolean)
    : [];

  const needsBeneficiary = ["verification_visit", "monitoring", "distribution"].includes(type);
  const beneficiaries = useList<BeneficiaryListItem>({
    resource: "beneficiaries",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: needsBeneficiary && navigator.onLine },
  });
  const beneficiaryOptions = beneficiaries.result?.data ?? [];
  const presetName = params.get("name");

  const takeGps = () => {
    setGpsState({ busy: true, error: "" });
    captureGps()
      .then((reading) => {
        setGps(reading);
        setGpsState({ busy: false, error: "" });
      })
      .catch((failure: Error) => setGpsState({ busy: false, error: failure.message }));
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setPhotoError("");
    const room = 4 - photos.length;
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const compressed = await compressPhoto(file);
        setPhotos((current) => [...current, compressed].slice(0, 4));
      } catch (failure) {
        setPhotoError(failure instanceof Error ? failure.message : "Foto gagal diproses.");
      }
    }
    if (files.length > room) setPhotoError("Maksimal 4 foto per laporan.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (rules) {
      const issues = handoverReportIssues(rules, { hasGps: Boolean(gps), photoCount: photos.length, reportType: type });
      if (issues.length > 0) {
        setError(issues.join(" "));
        return;
      }
    }
    setSubmitting(true);
    setError("");
    const payload = {
      amount_distributed: form.amount_distributed || null,
      application_id: params.get("application"),
      beneficiaries_reached: numberOrNull(form.beneficiaries_reached),
      beneficiary_contact_id: form.beneficiary_contact_id || null,
      case_id: params.get("case"),
      client_reference: clientReference.current,
      distribution_plan_id: params.get("distribution"),
      follow_up_needed: form.follow_up_needed,
      household_size_observed: numberOrNull(form.household_size_observed),
      issues: form.issues || undefined,
      latitude: gps?.latitude ?? null,
      location_accuracy_m: gps?.accuracy ?? null,
      location_text: form.location_text || undefined,
      longitude: gps?.longitude ?? null,
      occurred_at: new Date(form.occurred_at).toISOString(),
      packages_delivered: numberOrNull(form.packages_delivered),
      photos,
      program_id: params.get("program"),
      report_type: type,
      severity: type === "incident" ? form.severity : null,
      shipment_id: params.get("shipment"),
      summary: form.summary,
      task_id: taskId,
      title: form.title,
      verification_checks: type === "verification_visit" ? checks : {},
      verification_result: type === "verification_visit" ? form.verification_result : null,
      waqf_asset_id: params.get("waqf"),
    };
    try {
      const result = await submitFieldReport(organizationId, payload);
      if (result.status === "queued") {
        window.alert("Tidak ada sinyal: laporan disimpan di perangkat dan akan dikirim otomatis saat online.");
        navigate(taskId ? `/field/tasks/${taskId}` : "/field");
      } else {
        navigate(taskId ? `/field/tasks/${taskId}` : `/field/reports/${result.id}`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Laporan belum terkirim.");
      setSubmitting(false);
    }
  };

  return (
    <section className="workspace-page field-page">
      <PageHeader
        eyebrow="Lapangan"
        title="Laporan lapangan"
        description="Lengkapi dari lokasi. Tanpa sinyal? Laporan tetap tersimpan di perangkat dan dikirim otomatis saat online."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} to={taskId ? `/field/tasks/${taskId}` : "/field"}>
            <ArrowLeft aria-hidden size={16} /> Tugas
          </Link>
        }
      />
      {error ? <ErrorState title="Laporan belum terkirim" description={error} /> : null}
      {taskId ? (
        <div className="field-notice" role="note">
          Laporan ini terhubung ke tugas Anda. Setelah terkirim, ceklis &ldquo;Kirim laporan&rdquo; tercentang dan tugas selesai bila langkah wajib lain sudah beres.
        </div>
      ) : null}
      <form onSubmit={submit}>
        <FormSection title="1. Jenis laporan" description={fieldReportTypeHints[type]}>
          <div className="choice-grid choice-grid--compact">
            {optionsOf(fieldReportTypeLabels).map((option) => (
              <label className="choice-card" data-selected={type === option.value} key={option.value}>
                <input checked={type === option.value} name="report_type" type="radio" onChange={() => setType(option.value)} />
                <strong>{option.label}</strong>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="2. Apa yang terjadi">
          <div className="form-grid">
            <div className="auth-field auth-field--wide">
              <Label htmlFor="title">Judul</Label>
              <input id="title" minLength={5} required value={form.title} onChange={(event) => set({ title: event.target.value })} placeholder="Mis. Penyaluran paket pangan RW 05" />
            </div>
            <div className="auth-field">
              <Label htmlFor="occurred_at">Waktu kejadian</Label>
              <input id="occurred_at" required type="datetime-local" value={form.occurred_at} onChange={(event) => set({ occurred_at: event.target.value })} />
            </div>
            {needsBeneficiary ? (
              <div className="auth-field">
                <Label htmlFor="beneficiary">Penerima{type === "verification_visit" ? " *" : ""}</Label>
                <select id="beneficiary" required={type === "verification_visit"} value={form.beneficiary_contact_id} onChange={(event) => set({ beneficiary_contact_id: event.target.value })}>
                  <option value="">{beneficiaryOptions.length === 0 && presetName ? presetName : "Pilih penerima"}</option>
                  {form.beneficiary_contact_id && presetName && !beneficiaryOptions.some((item) => item.id === form.beneficiary_contact_id) ? (
                    <option value={form.beneficiary_contact_id}>{presetName}</option>
                  ) : null}
                  {beneficiaryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name}
                      {item.city ? ` — ${item.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {type === "incident" ? (
              <div className="auth-field">
                <Label htmlFor="severity">Tingkat keparahan *</Label>
                <select id="severity" value={form.severity} onChange={(event) => set({ severity: event.target.value })}>
                  {optionsOf(severityLabels).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="auth-field auth-field--wide">
              <Label htmlFor="summary">Ringkasan (min. 10 karakter)</Label>
              <textarea id="summary" minLength={10} required rows={4} value={form.summary} onChange={(event) => set({ summary: event.target.value })} />
            </div>
          </div>
        </FormSection>

        {type === "verification_visit" ? (
          <FormSection title="3. Hasil verifikasi" description="Hasil ini direview supervisor, lalu otomatis memperbarui status kelayakan penerima.">
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="verification_result">Kesimpulan</Label>
                <select id="verification_result" value={form.verification_result} onChange={(event) => set({ verification_result: event.target.value })}>
                  {optionsOf(verificationResultLabels).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="household">Jumlah anggota keluarga (diamati)</Label>
                <input id="household" inputMode="numeric" min={1} type="number" value={form.household_size_observed} onChange={(event) => set({ household_size_observed: event.target.value })} />
              </div>
              <div className="auth-field auth-field--wide">
                <Label>Ceklis kunjungan</Label>
                <div className="field-checklist">
                  {optionsOf(verificationCheckLabels).map((option) => (
                    <label key={option.value}>
                      <input checked={Boolean(checks[option.value])} type="checkbox" onChange={(event) => setChecks((current) => ({ ...current, [option.value]: event.target.checked }))} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>
        ) : null}

        {["distribution", "delivery", "monitoring"].includes(type) ? (
          <FormSection title="3. Capaian">
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="reached">Penerima terlayani</Label>
                <input id="reached" inputMode="numeric" min={0} type="number" value={form.beneficiaries_reached} onChange={(event) => set({ beneficiaries_reached: event.target.value })} />
              </div>
              <div className="auth-field">
                <Label htmlFor="packages">Paket diserahkan</Label>
                <input id="packages" inputMode="numeric" min={0} type="number" value={form.packages_delivered} onChange={(event) => set({ packages_delivered: event.target.value })} />
              </div>
              {type === "distribution" ? (
                <div className="auth-field">
                  <Label htmlFor="amount">Dana disalurkan (Rp)</Label>
                  <input id="amount" inputMode="decimal" value={form.amount_distributed} onChange={(event) => set({ amount_distributed: event.target.value })} />
                </div>
              ) : null}
            </div>
          </FormSection>
        ) : null}

        <FormSection
          title="Lokasi & foto"
          description={
            handoverRules.length > 0
              ? `Wajib untuk serah terima: ${handoverRules.join(" dan ")}. Foto dikompres otomatis (maks. 4).`
              : "Foto dikompres otomatis (maks. 4). GPS membantu supervisor memastikan kunjungan."
          }
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label>GPS</Label>
              <Button disabled={gpsState.busy} type="button" variant="outline" onClick={takeGps}>
                <MapPin aria-hidden size={16} />
                {gpsState.busy ? "Mencari lokasi…" : gps ? "Perbarui lokasi" : "Ambil lokasi GPS"}
              </Button>
              <span className="auth-field__message" data-tone={gpsState.error ? "error" : undefined}>
                {gpsState.error || (gps ? formatGps(gps) : "Belum diambil.")}
              </span>
            </div>
            <div className="auth-field">
              <Label htmlFor="location_text">Keterangan lokasi</Label>
              <input id="location_text" placeholder="Mis. RT 04/07, dekat masjid" value={form.location_text} onChange={(event) => set({ location_text: event.target.value })} />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="photos">Foto ({photos.length}/4)</Label>
              <label className={buttonVariants({ variant: "outline" })} data-disabled={photos.length >= 4}>
                <Camera aria-hidden size={16} /> Ambil / pilih foto
                <input accept="image/*" capture="environment" className="sr-only" disabled={photos.length >= 4} id="photos" multiple type="file" onChange={(event) => { void addPhotos(event.target.files); event.target.value = ""; }} />
              </label>
              {photoError ? <span className="auth-field__message" data-tone="error">{photoError}</span> : null}
              {photos.length > 0 ? (
                <div className="field-photos">
                  {photos.map((photo, index) => (
                    <figure key={photo.data_url.slice(-24) + index}>
                      <img alt={`Foto ${index + 1}`} src={photo.data_url} />
                      <input
                        aria-label={`Keterangan foto ${index + 1}`}
                        placeholder="Keterangan"
                        value={photo.caption ?? ""}
                        onChange={(event) => setPhotos((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, caption: event.target.value } : item)))}
                      />
                      <button aria-label={`Hapus foto ${index + 1}`} type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 aria-hidden size={14} />
                      </button>
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </FormSection>

        <FormSection title="Kendala & tindak lanjut">
          <div className="form-grid">
            <div className="auth-field auth-field--wide">
              <Label htmlFor="issues">Kendala (opsional)</Label>
              <textarea id="issues" rows={2} value={form.issues} onChange={(event) => set({ issues: event.target.value })} />
            </div>
            <div className="auth-field">
              <Label>
                <input checked={form.follow_up_needed} className="mr-2" type="checkbox" onChange={(event) => set({ follow_up_needed: event.target.checked })} />
                Perlu tindak lanjut dari kantor
              </Label>
            </div>
          </div>
        </FormSection>

        <div className="form-actions field-submit">
          <Button disabled={submitting || !organizationId} type="submit">
            <Save aria-hidden size={16} />
            {submitting ? "Mengirim…" : navigator.onLine ? "Kirim laporan" : "Simpan (kirim saat online)"}
          </Button>
        </div>
      </form>
    </section>
  );
}
