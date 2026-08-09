import { useCreate, type HttpError } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Kind = "complaint" | "corrective-action" | "incident" | "risk";
const resourceByKind = { complaint: "complaints", "corrective-action": "corrective_actions", incident: "governance_incidents", risk: "risk_flags" } as const;
const titleByKind = { complaint: "Catat pengaduan", "corrective-action": "Buat corrective action", incident: "Laporkan insiden", risk: "Catat risk flag" } as const;
function nowLocal(days = 0) { const date = new Date(Date.now() + days * 86_400_000); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }

export function GovernanceCreatePage({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const { mutate, mutation } = useCreate<Record<string, unknown>, HttpError>();
  const [form, setForm] = useState({
    category: kind === "complaint" ? "service" : "operational",
    channel: "web", classification: "confidential", description: "", due_at: nowLocal(7),
    is_anonymous: false, occurred_at: nowLocal(), received_at: nowLocal(), risk_type: "operational",
    severity: "medium", source_id: "", source_type: "risk_flag", subject_type: "organization", title: "",
  });
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    let values: Record<string, unknown>;
    if (kind === "risk") values = { description: form.description, risk_type: form.risk_type, severity: form.severity, subject_type: form.subject_type, title: form.title };
    else if (kind === "incident") values = { category: form.category, description: form.description, occurred_at: new Date(form.occurred_at).toISOString(), severity: form.severity, title: form.title };
    else if (kind === "complaint") values = { category: form.category, channel: form.channel, classification: form.classification, description: form.description, is_anonymous: form.is_anonymous, received_at: new Date(form.received_at).toISOString(), title: form.title };
    else values = { description: form.description, due_at: new Date(form.due_at).toISOString(), source_id: form.source_id, source_type: form.source_type, title: form.title };
    mutate({ resource: resourceByKind[kind], values }, { onSuccess: () => navigate("/governance") });
  };
  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Audit & Risk" title={titleByKind[kind]} description="SLA dihitung server-side dan seluruh perubahan status dicatat pada audit trail." actions={<Button variant="outline" onClick={() => navigate("/governance")}><ArrowLeft size={16} /> Kembali</Button>} />
      <form onSubmit={submit}>
        <FormSection title="Konteks laporan">
          <div className="form-grid">
            <Field label="Judul"><input required minLength={5} value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
            {kind === "risk" ? <><Field label="Jenis risiko"><select value={form.risk_type} onChange={(e) => set("risk_type", e.target.value)}>{["financial","fraud","operational","safeguarding","privacy","legal","reputation","compliance","other"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Subjek"><input required value={form.subject_type} onChange={(e) => set("subject_type", e.target.value)} /></Field></> : null}
            {kind === "incident" ? <><Field label="Kategori"><select value={form.category} onChange={(e) => set("category", e.target.value)}>{["security","financial","safeguarding","fraud","privacy","operational","legal","reputation","other"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Terjadi"><input type="datetime-local" value={form.occurred_at} onChange={(e) => set("occurred_at", e.target.value)} /></Field></> : null}
            {kind === "complaint" ? <><Field label="Kategori"><select value={form.category} onChange={(e) => set("category", e.target.value)}>{["service","distribution","staff_conduct","fraud","safeguarding","privacy","discrimination","other"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Kanal"><select value={form.channel} onChange={(e) => set("channel", e.target.value)}>{["web","email","phone","whatsapp","letter","in_person","referral","other"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Klasifikasi"><select value={form.classification} onChange={(e) => set("classification", e.target.value)}>{["internal","confidential","restricted"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Diterima"><input type="datetime-local" value={form.received_at} onChange={(e) => set("received_at", e.target.value)} /></Field><label className="governance-check"><input type="checkbox" checked={form.is_anonymous} onChange={(e) => set("is_anonymous", e.target.checked)} /> Pengaduan anonim</label></> : null}
            {kind === "corrective-action" ? <><Field label="Jenis sumber"><select value={form.source_type} onChange={(e) => set("source_type", e.target.value)}>{["risk_flag","incident","complaint","audit_event"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="ID sumber"><input required pattern="[0-9a-fA-F-]{36}" value={form.source_id} onChange={(e) => set("source_id", e.target.value)} /></Field><Field label="Jatuh tempo"><input type="datetime-local" value={form.due_at} onChange={(e) => set("due_at", e.target.value)} /></Field></> : null}
            {["risk", "incident"].includes(kind) ? <Field label="Severity"><select value={form.severity} onChange={(e) => set("severity", e.target.value)}>{["low","medium","high","critical"].map((v) => <option key={v}>{v}</option>)}</select></Field> : null}
            <Field label="Uraian" wide><textarea required minLength={10} rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          </div>
        </FormSection>
        {mutation.isError ? <p className="form-error">{mutation.error?.message ?? "Record gagal disimpan."}</p> : null}
        <div className="form-section__footer"><Button disabled={mutation.isPending} type="submit"><Save size={16} /> Simpan</Button></div>
      </form>
    </section>
  );
}

function Field({ children, label, wide = false }: { children: React.ReactNode; label: string; wide?: boolean }) {
  return <div className={`auth-field${wide ? " auth-field--wide" : ""}`}><Label>{label}</Label>{children}</div>;
}
