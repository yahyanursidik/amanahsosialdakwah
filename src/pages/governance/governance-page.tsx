import { useList } from "@refinedev/core";
import { ClipboardPlus, Plus, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  DetailSection,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type {
  AuditEventSummary,
  Complaint,
  CorrectiveAction,
  GovernanceBaseRecord,
  GovernanceIncident,
  RiskFlag,
} from "@/features/governance/types";
import { apiFetch } from "@/lib/neon/http";

function tone(status: string, severity?: string) {
  if (["critical", "high"].includes(severity ?? "")) return "danger" as const;
  if (["closed", "resolved", "verified", "mitigated"].includes(status)) return "success" as const;
  if (["accepted", "contained", "completed", "monitoring"].includes(status)) return "info" as const;
  return "warning" as const;
}

function isOverdue(record: { resolution_due_at?: string; status: string }) {
  return Boolean(record.resolution_due_at && new Date(record.resolution_due_at) < new Date() && !["closed", "resolved", "verified"].includes(record.status));
}

function transitionOptions(type: "complaint" | "corrective" | "incident" | "risk", status: string) {
  const options = {
    complaint: { received: ["triaged", "rejected"], triaged: ["in_progress", "resolved", "rejected"], in_progress: ["resolved"], resolved: ["closed"] },
    corrective: { open: ["in_progress", "completed", "cancelled"], in_progress: ["completed", "cancelled"], completed: ["verified"] },
    incident: { reported: ["investigating", "contained", "resolved"], investigating: ["contained", "resolved"], contained: ["resolved"], resolved: ["closed"] },
    risk: { open: ["monitoring", "mitigated", "accepted", "closed"], monitoring: ["mitigated", "accepted", "closed"], mitigated: ["closed"], accepted: ["closed"] },
  } as const;
  return (options[type] as Record<string, readonly string[]>)[status] ?? [];
}

function TransitionControl({
  id,
  onSuccess,
  path,
  statuses,
}: {
  id: string;
  onSuccess: () => void;
  path: string;
  statuses: string[];
}) {
  const [status, setStatus] = useState(statuses[0] ?? "");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await apiFetch(`/api/v1/governance/${path}/${id}/transition`, {
        body: JSON.stringify({ notes, status }),
        method: "POST",
      });
      setNotes("");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Perubahan status ditolak.");
    } finally {
      setPending(false);
    }
  };
  if (statuses.length === 0) return null;
  return (
    <details className="governance-transition">
      <summary>Proses</summary>
      <form onSubmit={submit}>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
        <textarea aria-label="Catatan transisi" minLength={10} required rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Catatan keputusan minimal 10 karakter" />
        {error ? <small className="form-error">{error}</small> : null}
        <Button disabled={pending || notes.length < 10} size="sm" type="submit">Simpan</Button>
      </form>
    </details>
  );
}

const titleColumn = <T extends GovernanceBaseRecord>(): ResourceTableColumn<T> => ({
  header: "Record",
  key: "record",
  render: (item) => <div className="crm-contact-cell"><strong>{item.title}</strong><small>{item.reference_number}</small></div>,
});

export function GovernancePage() {
  const navigate = useNavigate();
  const listOptions = { pagination: { currentPage: 1, pageSize: 20, mode: "server" as const } };
  const risks = useList<RiskFlag>({ resource: "risk_flags", ...listOptions });
  const incidents = useList<GovernanceIncident>({ resource: "governance_incidents", ...listOptions });
  const complaints = useList<Complaint>({ resource: "complaints", ...listOptions });
  const actions = useList<CorrectiveAction>({ resource: "corrective_actions", ...listOptions });
  const audits = useList<AuditEventSummary>({ resource: "audit_events", ...listOptions });
  const hasError = [risks, incidents, complaints, actions, audits].some((item) => item.query.isError);

  return (
    <section className="workspace-page governance-page">
      <PageHeader
        eyebrow="Tata kelola"
        title="Audit, risiko & tindak lanjut"
        description="Register organisasi untuk risiko, insiden, pengaduan, corrective action, SLA, dan audit trail yang tidak dapat dihapus."
        actions={<>
          <ProtectedActionButton action="manage" resource="risk_flags" onClick={() => navigate("/governance/new/risk")}><Plus size={16} /> Risiko</ProtectedActionButton>
          <ProtectedActionButton action="report" resource="governance_incidents" onClick={() => navigate("/governance/new/incident")}><ShieldAlert size={16} /> Insiden</ProtectedActionButton>
          <ProtectedActionButton action="record" resource="complaints" onClick={() => navigate("/governance/new/complaint")}><ClipboardPlus size={16} /> Pengaduan</ProtectedActionButton>
        </>}
      />
      {hasError ? <ErrorState title="Sebagian register tidak dapat dimuat" description="Setiap register memiliki permission baca yang terpisah." /> : null}

      <CanAccess action="read" resource="risk_flags">
        <DetailSection title="Risk flags" description="Risiko terbuka dan mitigasi yang harus dijaga sampai ditutup secara formal.">
          <ResourceTable
            items={risks.result?.data ?? []} isLoading={risks.query.isLoading} getRowId={(item) => item.id}
            columns={[titleColumn<RiskFlag>(), { header: "Risiko", key: "risk", render: (item) => `${item.risk_type} / ${item.severity}` }, { header: "SLA", key: "sla", render: (item) => isOverdue(item) ? <StatusBadge tone="danger">terlambat</StatusBadge> : new Date(item.resolution_due_at!).toLocaleDateString("id-ID") }, { header: "Status", key: "status", render: (item) => <StatusBadge tone={tone(item.status, item.severity)}>{item.status}</StatusBadge> }]}
            rowActions={(item) => <CanAccess action={item.status === "open" || item.status === "monitoring" ? "manage" : "resolve"} resource="risk_flags"><TransitionControl id={item.id} path="risks" statuses={[...transitionOptions("risk", item.status)]} onSuccess={() => void risks.query.refetch()} /></CanAccess>}
          />
        </DetailSection>
      </CanAccess>

      <CanAccess action="read" resource="governance_incidents">
        <DetailSection title="Insiden" description="Insiden keamanan, keuangan, safeguarding, privasi, dan operasional.">
          <ResourceTable
            items={incidents.result?.data ?? []} isLoading={incidents.query.isLoading} getRowId={(item) => item.id}
            columns={[titleColumn<GovernanceIncident>(), { header: "Kategori", key: "category", render: (item) => `${item.category} / ${item.severity}` }, { header: "Terjadi", key: "date", render: (item) => new Date(item.occurred_at).toLocaleString("id-ID") }, { header: "Status", key: "status", render: (item) => <StatusBadge tone={tone(item.status, item.severity)}>{item.status}</StatusBadge> }]}
            rowActions={(item) => <CanAccess action="manage" resource="governance_incidents"><TransitionControl id={item.id} path="incidents" statuses={[...transitionOptions("incident", item.status)]} onSuccess={() => void incidents.query.refetch()} /></CanAccess>}
          />
        </DetailSection>
      </CanAccess>

      <CanAccess action="read" resource="complaints">
        <DetailSection title="Pengaduan" description="Daftar umum tidak mengirim uraian dan identitas pelapor.">
          <ResourceTable
            items={complaints.result?.data ?? []} isLoading={complaints.query.isLoading} getRowId={(item) => item.id}
            columns={[titleColumn<Complaint>(), { header: "Kanal", key: "channel", render: (item) => `${item.channel} / ${item.category}` }, { header: "Klasifikasi", key: "classification", render: (item) => <StatusBadge tone={item.classification === "restricted" ? "danger" : "neutral"}>{item.classification}</StatusBadge> }, { header: "Status", key: "status", render: (item) => <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge> }]}
            rowActions={(item) => <CanAccess action="manage" resource="complaints"><TransitionControl id={item.id} path="complaints" statuses={[...transitionOptions("complaint", item.status)]} onSuccess={() => void complaints.query.refetch()} /></CanAccess>}
          />
        </DetailSection>
      </CanAccess>

      <CanAccess action="read" resource="corrective_actions">
        <DetailSection title="Corrective actions" description="Perbaikan harus selesai dan diverifikasi oleh aktor berbeda.">
          <div className="section-heading"><span /><ProtectedActionButton action="manage" resource="corrective_actions" variant="outline" onClick={() => navigate("/governance/new/corrective-action")}><Plus size={16} /> Corrective action</ProtectedActionButton></div>
          <ResourceTable
            items={actions.result?.data ?? []} isLoading={actions.query.isLoading} getRowId={(item) => item.id}
            columns={[titleColumn<CorrectiveAction>(), { header: "Sumber", key: "source", render: (item) => item.source_type.replaceAll("_", " ") }, { header: "Jatuh tempo", key: "due", render: (item) => new Date(item.due_at).toLocaleString("id-ID") }, { header: "Status", key: "status", render: (item) => <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge> }]}
            rowActions={(item) => <CanAccess action={item.status === "completed" ? "verify" : "manage"} resource="corrective_actions"><TransitionControl id={item.id} path="corrective-actions" statuses={[...transitionOptions("corrective", item.status)]} onSuccess={() => void actions.query.refetch()} /></CanAccess>}
          />
        </DetailSection>
      </CanAccess>

      <CanAccess action="read" resource="audit">
        <DetailSection title="Audit trail" description="Ringkasan peristiwa lintas modul; payload before/after tidak dikirim pada daftar.">
          <ResourceTable
            items={audits.result?.data ?? []} isLoading={audits.query.isLoading} getRowId={(item) => item.id}
            columns={[{ header: "Aksi", key: "action", render: (item) => <div className="crm-contact-cell"><strong>{item.action}</strong><small>{item.request_id}</small></div> }, { header: "Entitas", key: "entity", render: (item) => `${item.entity_type} / ${item.entity_id.slice(0, 8)}` }, { header: "Waktu", key: "time", render: (item) => new Date(item.occurred_at).toLocaleString("id-ID") }]}
          />
        </DetailSection>
      </CanAccess>
    </section>
  );
}
