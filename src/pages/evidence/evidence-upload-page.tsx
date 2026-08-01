import { useNavigation } from "@refinedev/core";
import { ArrowLeft, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  ErrorState,
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  EvidenceFile,
  EvidenceUploadIntent,
} from "@/features/evidence/types";
import { apiFetch } from "@/lib/neon/http";

type Envelope<T> = { data: T };

async function sha256(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function EvidenceUploadPage() {
  const { list, show } = useNavigation();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    entity_type: "logistics_shipment",
    entity_id: "",
    classification: "internal",
    purpose: "",
    previous_file_id: "",
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const intent = await apiFetch<Envelope<EvidenceUploadIntent>>(
        "/api/v1/evidence/upload-intents",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            previous_file_id: form.previous_file_id || undefined,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          }),
        },
      );
      const uploaded = await fetch(intent.data.upload.url, {
        method: "PUT",
        headers: intent.data.upload.headers,
        body: file,
      });
      if (!uploaded.ok) throw new Error("Object storage menolak upload file.");
      const confirmed = await apiFetch<Envelope<EvidenceFile>>(
        `/api/v1/evidence/files/${intent.data.evidence.id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ checksum_sha256: await sha256(file) }),
        },
      );
      show("evidence_files", confirmed.data.id);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Upload bukti gagal.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Evidence Service"
        title="Upload Bukti"
        description="Browser hanya menerima signed URL berumur pendek; credential storage tetap server-side."
        actions={
          <Button variant="outline" onClick={() => list("evidence_files")}>
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      {error ? (
        <ErrorState title="Upload bukti gagal" description={error} />
      ) : null}
      <form onSubmit={submit}>
        <FormSection title="Klasifikasi dan tujuan">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="evidence-entity-type">Jenis entitas</Label>
              <select
                id="evidence-entity-type"
                value={form.entity_type}
                onChange={(e) =>
                  setForm((v) => ({ ...v, entity_type: e.target.value }))
                }
              >
                <option value="logistics_shipment">Shipment</option>
                <option value="logistics_incident">Insiden logistik</option>
                <option value="distribution">Distribusi</option>
                <option value="assessment">Asesmen</option>
                <option value="case">Kasus</option>
                <option value="application">Pengajuan</option>
                <option value="procurement">Pengadaan</option>
                <option value="inventory_adjustment">
                  Adjustment inventory
                </option>
                <option value="aid_package_packing">Packing paket</option>
                <option value="crm_contact">Contact CRM</option>
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="evidence-entity-id">ID entitas</Label>
              <input
                id="evidence-entity-id"
                required
                pattern="[0-9a-fA-F-]{36}"
                value={form.entity_id}
                onChange={(e) =>
                  setForm((v) => ({ ...v, entity_id: e.target.value }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="evidence-classification">Klasifikasi</Label>
              <select
                id="evidence-classification"
                value={form.classification}
                onChange={(e) =>
                  setForm((v) => ({ ...v, classification: e.target.value }))
                }
              >
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="evidence-purpose">Tujuan bukti</Label>
              <input
                id="evidence-purpose"
                required
                minLength={3}
                value={form.purpose}
                onChange={(e) =>
                  setForm((v) => ({ ...v, purpose: e.target.value }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="evidence-previous">ID versi sebelumnya</Label>
              <input
                id="evidence-previous"
                value={form.previous_file_id}
                onChange={(e) =>
                  setForm((v) => ({ ...v, previous_file_id: e.target.value }))
                }
              />
              <small>Kosongkan untuk file baru.</small>
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="evidence-file">File privat</Label>
              <input
                id="evidence-file"
                required
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <small>Maksimal 25 MB. PDF, JPEG, PNG, WebP, atau MP4.</small>
            </div>
          </div>
        </FormSection>
        <div className="form-section__footer">
          <Button type="submit" disabled={!file || pending}>
            <Upload aria-hidden size={16} />
            {pending ? "Mengunggah…" : "Upload & Konfirmasi"}
          </Button>
        </div>
      </form>
    </section>
  );
}
