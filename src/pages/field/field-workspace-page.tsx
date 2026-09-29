import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FilePlus2,
  HandHeart,
  ListChecks,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Send,
  Truck,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";

import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { captureGps, formatGps, type GpsReading } from "@/features/field/device";
import {
  discardOutboxEntry,
  flushOutbox,
  listOutbox,
  onOutboxChange,
  type OutboxEntry,
} from "@/features/field/outbox";
import { TaskCard } from "@/features/field/task-card";
import type {
  FieldDelivery,
  FieldDistribution,
  FieldWorkspace,
} from "@/features/field/types";
import {
  caseStatusLabels,
  distributionStatusLabels,
  fieldReportStatusLabels,
  fieldReportTypeLabels,
  labelOf,
  shipmentStatusLabels,
  toneOf,
  verificationResultLabels,
  vulnerabilityLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

type Tab = "deliver" | "distribute" | "reports" | "todo" | "verify";

const nowLocal = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

async function command(url: string, body: Record<string, unknown>) {
  if (!navigator.onLine) {
    throw new Error("Perangkat sedang offline. Aksi ini perlu sinyal; laporan tetap bisa disimpan offline.");
  }
  return apiFetch(url, {
    body: JSON.stringify(body),
    headers: { "Idempotency-Key": crypto.randomUUID() },
    method: "POST",
  });
}

function reportLink(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `/field/reports/new?${search.toString()}`;
}

function GpsButton({
  onReading,
  reading,
}: {
  onReading: (reading: GpsReading) => void;
  reading: GpsReading | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="auth-field">
      <Label>Lokasi</Label>
      <Button
        disabled={busy}
        type="button"
        variant="outline"
        onClick={() => {
          setBusy(true);
          setError("");
          captureGps()
            .then(onReading)
            .catch((failure: Error) => setError(failure.message))
            .finally(() => setBusy(false));
        }}
      >
        <MapPin aria-hidden size={16} />
        {busy ? "Mencari lokasi…" : reading ? "Perbarui lokasi GPS" : "Ambil lokasi GPS"}
      </Button>
      <span className="auth-field__message" data-tone={error ? "error" : undefined}>
        {error || (reading ? formatGps(reading) : "Opsional, membantu verifikasi.")}
      </span>
    </div>
  );
}

function ActionSheet({
  children,
  onCancel,
  onSubmit,
  pending,
  submitLabel,
  title,
}: {
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  pending: boolean;
  submitLabel: string;
  title: string;
}) {
  return (
    <form
      className="field-sheet"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <strong>{title}</strong>
      <div className="field-sheet__body">{children}</div>
      <div className="field-sheet__actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? "Mengirim…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ContactLine({
  address,
  phone,
}: {
  address: string | null;
  phone: string | null;
}) {
  return (
    <div className="field-card__contact">
      {address ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          rel="noreferrer"
          target="_blank"
        >
          <Navigation aria-hidden size={14} /> {address}
        </a>
      ) : null}
      {phone ? (
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
          <Phone aria-hidden size={14} /> {phone}
        </a>
      ) : null}
    </div>
  );
}

function DeliveryCard({
  delivery,
  onDone,
}: {
  delivery: FieldDelivery;
  onDone: (message: string) => void;
}) {
  const [mode, setMode] = useState<"" | "deliver" | "dispatch" | "incident" | "track">("");
  const [gps, setGps] = useState<GpsReading | null>(null);
  const [form, setForm] = useState({
    event_type: "in_transit",
    incident_type: "delay",
    notes: "",
    recipient_name: delivery.destination_name,
    relationship: "",
    severity: "medium",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/v1/logistics/shipments/${delivery.id}`;
  const location = gps ? formatGps(gps) : undefined;

  const run = (url: string, body: Record<string, unknown>, message: string, plain = false) => {
    setPending(true);
    setError("");
    const request = plain
      ? apiFetch(url, { body: JSON.stringify(body), method: "POST" })
      : command(url, body);
    request
      .then(() => {
        setMode("");
        onDone(message);
      })
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setPending(false));
  };

  const active = ["dispatched", "in_transit"].includes(delivery.status);
  return (
    <article className="field-card">
      <header>
        <div>
          <strong>{delivery.destination_name}</strong>
          <small>
            {delivery.reference_number} · {delivery.packing_reference ?? "paket"}
            {delivery.package_count ? ` · ${delivery.package_count} paket` : ""} · {delivery.courier_name}
          </small>
        </div>
        <StatusBadge tone={toneOf(delivery.status)}>
          {labelOf(shipmentStatusLabels, delivery.status)}
        </StatusBadge>
      </header>
      <ContactLine address={delivery.destination_address} phone={delivery.destination_phone} />
      {error ? <p className="field-card__error">{error}</p> : null}
      {mode === "" ? (
        <div className="field-card__actions">
          {delivery.status === "draft" ? (
            <Button onClick={() => setMode("dispatch")}>
              <Truck aria-hidden size={16} /> Berangkat
            </Button>
          ) : null}
          {active ? (
            <>
              <Button variant="outline" onClick={() => setMode("track")}>
                <MapPin aria-hidden size={16} /> Update posisi
              </Button>
              <Button onClick={() => setMode("deliver")}>
                <CheckCircle2 aria-hidden size={16} /> Serah terima
              </Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={() => setMode("incident")}>
            Laporkan kendala
          </Button>
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            to={reportLink({ shipment: delivery.id, title: `Pengiriman ${delivery.reference_number}`, type: "delivery" })}
          >
            <FilePlus2 aria-hidden size={16} /> Laporan
          </Link>
        </div>
      ) : null}
      {mode === "dispatch" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Catat berangkat"
          title="Berangkat mengirim"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run(`${base}/dispatch`, { dispatched_at: new Date().toISOString(), notes: form.notes || location || undefined }, "Pengiriman berangkat tercatat.")
          }
        >
          <GpsButton reading={gps} onReading={setGps} />
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`dispatch-${delivery.id}`}>Catatan (opsional)</Label>
            <input id={`dispatch-${delivery.id}`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
      {mode === "track" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Kirim posisi"
          title="Update posisi pengiriman"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run(`${base}/tracking`, { event_at: new Date().toISOString(), event_type: form.event_type, location, notes: form.notes || undefined }, "Posisi pengiriman diperbarui.")
          }
        >
          <div className="auth-field">
            <Label htmlFor={`event-${delivery.id}`}>Status</Label>
            <select id={`event-${delivery.id}`} value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value })}>
              <option value="in_transit">Dalam perjalanan</option>
              <option value="arrived_hub">Tiba di titik transit / posko</option>
              <option value="out_for_delivery">Menuju penerima</option>
              <option value="delivery_attempt">Penerima tidak di tempat</option>
              <option value="note">Catatan lain</option>
            </select>
          </div>
          <GpsButton reading={gps} onReading={setGps} />
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`track-notes-${delivery.id}`}>Catatan</Label>
            <input id={`track-notes-${delivery.id}`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
      {mode === "deliver" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Konfirmasi diterima"
          title="Serah terima barang"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run(`${base}/deliver`, {
              confirmation_method: "field_confirmation",
              notes: [form.notes, location ? `Lokasi: ${location}` : ""].filter(Boolean).join(" · ") || undefined,
              received_at: new Date().toISOString(),
              recipient_name: form.recipient_name,
              relationship_to_recipient: form.relationship || undefined,
            }, "Serah terima tercatat. Jangan lupa buat laporan dengan foto.")
          }
        >
          <div className="auth-field">
            <Label htmlFor={`recipient-${delivery.id}`}>Diterima oleh</Label>
            <input id={`recipient-${delivery.id}`} minLength={2} required value={form.recipient_name} onChange={(event) => setForm({ ...form, recipient_name: event.target.value })} />
          </div>
          <div className="auth-field">
            <Label htmlFor={`relation-${delivery.id}`}>Hubungan dengan penerima</Label>
            <input id={`relation-${delivery.id}`} placeholder="Mis. ketua DKM, istri, RT" value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} />
          </div>
          <GpsButton reading={gps} onReading={setGps} />
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`deliver-notes-${delivery.id}`}>Catatan</Label>
            <input id={`deliver-notes-${delivery.id}`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
      {mode === "incident" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Laporkan"
          title="Laporkan kendala pengiriman"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run(`${base}/incidents`, {
              description: form.notes,
              incident_type: form.incident_type,
              location,
              occurred_at: new Date().toISOString(),
              severity: form.severity,
            }, "Kendala dilaporkan ke koordinator logistik.", true)
          }
        >
          <div className="auth-field">
            <Label htmlFor={`incident-${delivery.id}`}>Jenis</Label>
            <select id={`incident-${delivery.id}`} value={form.incident_type} onChange={(event) => setForm({ ...form, incident_type: event.target.value })}>
              <option value="delay">Terlambat / akses sulit</option>
              <option value="damage">Barang rusak</option>
              <option value="loss">Barang hilang</option>
              <option value="security">Keamanan</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="auth-field">
            <Label htmlFor={`severity-${delivery.id}`}>Tingkat</Label>
            <select id={`severity-${delivery.id}`} value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
              <option value="critical">Kritis</option>
            </select>
          </div>
          <GpsButton reading={gps} onReading={setGps} />
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`incident-notes-${delivery.id}`}>Uraian (min. 10 karakter)</Label>
            <textarea id={`incident-notes-${delivery.id}`} minLength={10} required rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
    </article>
  );
}

function DistributionCard({
  distribution,
  onDone,
}: {
  distribution: FieldDistribution;
  onDone: (message: string) => void;
}) {
  const [mode, setMode] = useState<"" | "confirm" | "evidence" | "execute">("");
  const [gps, setGps] = useState<GpsReading | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    amount: String(Number(distribution.amount)),
    confirmation_method: "beneficiary_statement",
    confirmed_by_name: distribution.beneficiary_name,
    executed_at: nowLocal(),
    notes: "",
    outcome: "delivered",
  });
  const base = `/api/v1/distributions/${distribution.id}`;
  const run = (path: string, body: Record<string, unknown>, message: string) => {
    setPending(true);
    setError("");
    command(`${base}/${path}`, body)
      .then(() => {
        setMode("");
        onDone(message);
      })
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setPending(false));
  };

  return (
    <article className="field-card">
      <header>
        <div>
          <strong>{distribution.beneficiary_name}</strong>
          <small>
            {distribution.reference_number} · {distribution.program_name}
          </small>
        </div>
        <StatusBadge tone={toneOf(distribution.status)}>
          {labelOf(distributionStatusLabels, distribution.status)}
        </StatusBadge>
      </header>
      <p className="field-card__meta">
        <MoneyDisplay amount={distribution.amount} currency={distribution.currency} /> ·{" "}
        {distribution.purpose}
      </p>
      <ContactLine address={distribution.beneficiary_address} phone={distribution.beneficiary_phone} />
      {error ? <p className="field-card__error">{error}</p> : null}
      {mode === "" ? (
        <div className="field-card__actions">
          {distribution.status === "assigned" ? (
            <Button disabled={pending} onClick={() => run("start", {}, "Penyaluran dimulai.")}>
              <Send aria-hidden size={16} /> Mulai menyalurkan
            </Button>
          ) : null}
          {["in_progress", "revision_required"].includes(distribution.status) ? (
            <Button onClick={() => setMode("execute")}>
              <HandHeart aria-hidden size={16} /> Catat penyaluran
            </Button>
          ) : null}
          {distribution.status === "executed" && distribution.requires_confirmation ? (
            <Button onClick={() => setMode("confirm")}>
              <CheckCircle2 aria-hidden size={16} /> Konfirmasi penerima
            </Button>
          ) : null}
          {distribution.status !== "assigned" ? (
            <Button variant="outline" onClick={() => setMode("evidence")}>
              Catatan bukti
            </Button>
          ) : null}
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            to={reportLink({ beneficiary: distribution.beneficiary_id, distribution: distribution.id, title: `Penyaluran ${distribution.reference_number}`, type: "distribution" })}
          >
            <FilePlus2 aria-hidden size={16} /> Laporan + foto
          </Link>
        </div>
      ) : null}
      {mode === "execute" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Simpan penyaluran"
          title="Catat pelaksanaan penyaluran"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run("execute", {
              amount: form.amount,
              executed_at: new Date(form.executed_at).toISOString(),
              location_notes: gps ? formatGps(gps) : undefined,
              notes: form.notes,
              outcome: form.outcome,
            }, form.outcome === "delivered" ? "Penyaluran tercatat. Lanjutkan konfirmasi penerima." : "Penyaluran gagal tercatat.")
          }
        >
          <div className="auth-field">
            <Label htmlFor={`outcome-${distribution.id}`}>Hasil</Label>
            <select id={`outcome-${distribution.id}`} value={form.outcome} onChange={(event) => setForm({ ...form, outcome: event.target.value })}>
              <option value="delivered">Tersalurkan</option>
              <option value="failed">Gagal disalurkan</option>
            </select>
          </div>
          <div className="auth-field">
            <Label htmlFor={`amount-${distribution.id}`}>Nilai disalurkan</Label>
            <input id={`amount-${distribution.id}`} inputMode="decimal" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </div>
          <div className="auth-field">
            <Label htmlFor={`executed-${distribution.id}`}>Waktu</Label>
            <input id={`executed-${distribution.id}`} type="datetime-local" value={form.executed_at} onChange={(event) => setForm({ ...form, executed_at: event.target.value })} />
          </div>
          <GpsButton reading={gps} onReading={setGps} />
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`execute-notes-${distribution.id}`}>Catatan (min. 10 karakter)</Label>
            <textarea id={`execute-notes-${distribution.id}`} minLength={10} required rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
      {mode === "confirm" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Simpan konfirmasi"
          title="Konfirmasi penerimaan"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run("confirm", {
              confirmation_method: form.confirmation_method,
              confirmed_at: new Date().toISOString(),
              confirmed_by_name: form.confirmed_by_name,
              notes: form.notes || undefined,
            }, "Konfirmasi penerima tersimpan. Menunggu verifikasi supervisor.")
          }
        >
          <div className="auth-field">
            <Label htmlFor={`confirm-name-${distribution.id}`}>Dikonfirmasi oleh</Label>
            <input id={`confirm-name-${distribution.id}`} minLength={2} required value={form.confirmed_by_name} onChange={(event) => setForm({ ...form, confirmed_by_name: event.target.value })} />
          </div>
          <div className="auth-field">
            <Label htmlFor={`confirm-method-${distribution.id}`}>Cara konfirmasi</Label>
            <select id={`confirm-method-${distribution.id}`} value={form.confirmation_method} onChange={(event) => setForm({ ...form, confirmation_method: event.target.value })}>
              <option value="beneficiary_statement">Pernyataan penerima</option>
              <option value="witness">Saksi (RT/tokoh)</option>
              <option value="phone_call">Telepon</option>
              <option value="otp">Kode OTP</option>
            </select>
          </div>
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`confirm-notes-${distribution.id}`}>Catatan</Label>
            <input id={`confirm-notes-${distribution.id}`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
      {mode === "evidence" ? (
        <ActionSheet
          pending={pending}
          submitLabel="Simpan catatan"
          title="Catatan bukti lapangan"
          onCancel={() => setMode("")}
          onSubmit={() =>
            run("evidence", {
              captured_at: new Date().toISOString(),
              description: [form.notes, gps ? `Lokasi: ${formatGps(gps)}` : ""].filter(Boolean).join(" · "),
              evidence_kind: "field_note",
            }, "Catatan bukti tersimpan.")
          }
        >
          <GpsButton reading={gps} onReading={setGps} />
          <div className="auth-field auth-field--wide">
            <Label htmlFor={`evidence-${distribution.id}`}>Catatan (min. 10 karakter)</Label>
            <textarea id={`evidence-${distribution.id}`} minLength={10} required rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </ActionSheet>
      ) : null}
    </article>
  );
}

export function FieldWorkspacePage() {
  const { activeOrganization, user } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [tab, setTab] = useState<Tab>("todo");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const workspace = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: FieldWorkspace }>("/api/v1/field/workspace"),
    queryKey: ["field", "workspace", organizationId],
  });

  const refreshOutbox = useCallback(() => {
    void listOutbox(organizationId).then(setOutbox);
  }, [organizationId]);

  const sync = useCallback(() => {
    if (!organizationId || !navigator.onLine) return;
    setSyncing(true);
    void flushOutbox(organizationId)
      .then(({ failed, sent }) => {
        if (sent > 0) {
          setNotice(`${sent} data tertunda berhasil dikirim.`);
          void workspace.refetch();
        } else if (failed > 0) {
          setNotice(`${failed} data belum terkirim. Periksa detailnya di tab Laporan.`);
        }
      })
      .finally(() => {
        setSyncing(false);
        refreshOutbox();
      });
  }, [organizationId, refreshOutbox, workspace]);

  useEffect(() => {
    refreshOutbox();
    const unsubscribe = onOutboxChange(refreshOutbox);
    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsubscribe();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshOutbox, sync]);

  const done = (message: string) => {
    setNotice(message);
    void workspace.refetch();
  };

  const data = workspace.data?.data;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "Petugas";
  const tabs: Array<{ count: number; icon: typeof Truck; label: string; value: Tab }> = [
    { count: data?.summary.tasks ?? 0, icon: ListChecks, label: "To-do", value: "todo" },
    { count: data?.summary.distribute ?? 0, icon: HandHeart, label: "Salurkan", value: "distribute" },
    { count: data?.summary.deliver ?? 0, icon: Truck, label: "Kirim", value: "deliver" },
    { count: data?.summary.verify ?? 0, icon: ClipboardCheck, label: "Verifikasi", value: "verify" },
    { count: outbox.length, icon: FilePlus2, label: "Laporan", value: "reports" },
  ];

  return (
    <section className="workspace-page field-page">
      <header className="field-hero">
        <div>
          <p>Assalamu’alaikum, {firstName}</p>
          <h1>Tugas lapangan</h1>
        </div>
        <div className="field-hero__status">
          {online ? (
            <StatusBadge tone="success">
              <Wifi aria-hidden className="inline" size={14} /> Online
            </StatusBadge>
          ) : (
            <StatusBadge tone="warning">
              <CloudOff aria-hidden className="inline" size={14} /> Offline
            </StatusBadge>
          )}
          {outbox.length > 0 ? (
            <Button disabled={!online || syncing} size="sm" variant="outline" onClick={sync}>
              <RefreshCw aria-hidden size={14} />
              {syncing ? "Mengirim…" : `Kirim ${outbox.length} tertunda`}
            </Button>
          ) : null}
        </div>
        <Link className={buttonVariants({})} to="/field/reports/new">
          <FilePlus2 aria-hidden size={16} /> Buat laporan lapangan
        </Link>
      </header>

      {notice ? (
        <div className="field-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")}>
            Tutup
          </button>
        </div>
      ) : null}

      <nav aria-label="Jenis tugas" className="field-tabs">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              aria-pressed={tab === item.value}
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
            >
              <Icon aria-hidden size={18} />
              <span>{item.label}</span>
              {item.count > 0 ? <b>{item.count}</b> : null}
            </button>
          );
        })}
      </nav>

      {workspace.isLoading ? <LoadingSkeleton lines={6} /> : null}
      {workspace.isError ? (
        <ErrorState
          title="Tugas belum dapat dimuat"
          description={online ? "Coba muat ulang." : "Perangkat offline. Laporan tetap bisa dibuat dan akan dikirim saat online."}
          onRetry={() => workspace.refetch()}
        />
      ) : null}

      {data && tab === "todo" ? (
        <div className="field-list">
          <CanAccess action="manage" resource="field_tasks">
            <div className="task-manage-links">
              <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/field/tasks/new">
                <ListChecks aria-hidden size={14} /> Buat tugas
              </Link>
              <Link className={buttonVariants({ size: "sm", variant: "ghost" })} to="/field/tasks">
                Kelola semua tugas
              </Link>
            </div>
          </CanAccess>
          {data.tasks.length === 0 ? (
            <EmptyState
              title="Tidak ada to-do hari ini"
              description="Tugas berceklis dari koordinator (salurkan dana/barang, verifikasi, antar, pantau) akan muncul di sini."
            />
          ) : (
            data.tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      ) : null}

      {data && tab === "distribute" ? (
        <div className="field-list">
          {data.distributions.length === 0 ? (
            <EmptyState title="Tidak ada penyaluran yang ditugaskan" description="Tugas penyaluran dari koordinator akan muncul di sini." />
          ) : (
            data.distributions.map((distribution) => (
              <DistributionCard distribution={distribution} key={distribution.id} onDone={done} />
            ))
          )}
        </div>
      ) : null}

      {data && tab === "deliver" ? (
        <div className="field-list">
          {data.deliveries.length === 0 ? (
            <EmptyState title="Tidak ada pengiriman yang ditugaskan" description="Koordinator logistik menugaskan pengiriman dari halaman detail shipment." />
          ) : (
            data.deliveries.map((delivery) => (
              <DeliveryCard delivery={delivery} key={delivery.id} onDone={done} />
            ))
          )}
        </div>
      ) : null}

      {data && tab === "verify" ? (
        <div className="field-list">
          {data.pendingReview ? (
            <Link className="field-card field-card--link" to="/field/reports?status=submitted">
              <strong>{data.pendingReview} laporan lapangan menunggu review Anda</strong>
              <small>Buka untuk menyetujui atau meminta tindak lanjut.</small>
            </Link>
          ) : null}
          {data.assignedCases.map((item) => (
            <article className="field-card" key={item.id}>
              <header>
                <div>
                  <strong>{item.beneficiary_name}</strong>
                  <small>{item.reference_number} · {item.program_name}</small>
                </div>
                <StatusBadge tone={toneOf(item.status)}>{labelOf(caseStatusLabels, item.status)}</StatusBadge>
              </header>
              <ContactLine address={item.beneficiary_address} phone={item.beneficiary_phone} />
              <div className="field-card__actions">
                <Link className={buttonVariants({})} to={reportLink({ beneficiary: item.beneficiary_id, case: item.id, name: item.beneficiary_name, title: `Verifikasi ${item.beneficiary_name}`, type: "verification_visit" })}>
                  <ClipboardCheck aria-hidden size={16} /> Kunjungi & verifikasi
                </Link>
              </div>
            </article>
          ))}
          {data.beneficiariesToVerify.map((item) => (
            <article className="field-card" key={item.id}>
              <header>
                <div>
                  <strong>{item.display_name}</strong>
                  <small>
                    Kerentanan {labelOf(vulnerabilityLabels, item.vulnerability_level).toLowerCase()} ·{" "}
                    {item.last_visit_at ? `dikunjungi ${new Date(item.last_visit_at).toLocaleDateString("id-ID")}` : "belum pernah dikunjungi"}
                  </small>
                </div>
                <StatusBadge tone="warning">Perlu verifikasi</StatusBadge>
              </header>
              <ContactLine address={item.address} phone={item.primary_phone} />
              <div className="field-card__actions">
                <Link className={buttonVariants({})} to={reportLink({ beneficiary: item.id, name: item.display_name, title: `Verifikasi ${item.display_name}`, type: "verification_visit" })}>
                  <ClipboardCheck aria-hidden size={16} /> Kunjungi & verifikasi
                </Link>
                <Link className={buttonVariants({ size: "sm", variant: "ghost" })} to={`/beneficiaries/${item.id}`}>
                  Profil
                </Link>
              </div>
            </article>
          ))}
          {data.distributionsToVerify.map((item) => (
            <Link className="field-card field-card--link" key={item.id} to={`/distributions/${item.id}`}>
              <strong>Verifikasi penyaluran {item.reference_number}</strong>
              <small>
                {item.beneficiary_name} · {item.program_name} · <MoneyDisplay amount={item.amount} currency={item.currency} />
              </small>
            </Link>
          ))}
          {data.assignedCases.length + data.beneficiariesToVerify.length + data.distributionsToVerify.length === 0 && !data.pendingReview ? (
            <EmptyState title="Tidak ada tugas verifikasi" description="Kasus yang ditugaskan dan penerima yang belum dinilai akan muncul di sini." />
          ) : null}
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="field-list">
          {outbox.map((entry) => (
            <article className="field-card field-card--queued" key={entry.client_reference}>
              <header>
                <div>
                  <strong>{entry.payload.title}</strong>
                  <small>Disimpan di perangkat {new Date(entry.savedAt).toLocaleString("id-ID")}</small>
                </div>
                <StatusBadge tone="warning">Belum terkirim</StatusBadge>
              </header>
              {entry.lastError ? <p className="field-card__error">{entry.lastError}</p> : null}
              <div className="field-card__actions">
                <Button disabled={!online || syncing} size="sm" onClick={sync}>
                  Kirim sekarang
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Hapus laporan tertunda ini dari perangkat?")) {
                      void discardOutboxEntry(entry.client_reference);
                    }
                  }}
                >
                  Hapus
                </Button>
              </div>
            </article>
          ))}
          {(data?.recentReports ?? []).map((report) => (
            <Link className="field-card field-card--link" key={report.id} to={`/field/reports/${report.id}`}>
              <header>
                <div>
                  <strong>{report.title}</strong>
                  <small>
                    {report.reference_number} · {labelOf(fieldReportTypeLabels, report.report_type)} ·{" "}
                    {new Date(report.occurred_at).toLocaleString("id-ID")}
                    {report.verification_result ? ` · ${labelOf(verificationResultLabels, report.verification_result)}` : ""}
                  </small>
                </div>
                <StatusBadge tone={toneOf(report.status === "follow_up" ? "pending" : report.status)}>
                  {labelOf(fieldReportStatusLabels, report.status)}
                </StatusBadge>
              </header>
            </Link>
          ))}
          {outbox.length === 0 && (data?.recentReports ?? []).length === 0 ? (
            <EmptyState title="Belum ada laporan" description="Buat laporan lapangan pertama Anda — bisa dilakukan tanpa sinyal." />
          ) : null}
          <Link className={buttonVariants({ variant: "outline" })} to="/field/reports?mine=true">
            Semua laporan saya
          </Link>
        </div>
      ) : null}
    </section>
  );
}
