import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  FilePlus2,
  MapPin,
  MessageCircle,
  Navigation,
  NotebookPen,
  Phone,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { captureGps, formatGps } from "@/features/field/device";
import { listOutbox, onOutboxChange, runFieldAction } from "@/features/field/outbox";
import { SupportChips, TaskProgress } from "@/features/field/task-card";
import { dueLabel, omitKey, taskStatusTone } from "@/features/field/task-format";
import type { FieldTaskDetail, FieldTaskItem } from "@/features/field/types";
import {
  fieldReportStatusLabels,
  fieldTaskPriorityLabels,
  fieldTaskStatusLabels,
  fieldTaskTypeLabels,
  labelOf,
  toneOf,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

type Override = { is_done: boolean; note?: string | undefined; queued: boolean };

const reportTypeOf: Record<string, string> = {
  delivery: "delivery",
  distribution: "distribution",
  monitoring: "monitoring",
  other: "situation",
  verification: "verification_visit",
};

const itemKey = (taskId: string, itemId: string) => `task-item:${taskId}:${itemId}`;

function reportLinkForTask(task: FieldTaskDetail) {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  };
  set("type", reportTypeOf[task.task_type]);
  set("task", task.id);
  set("title", `Laporan: ${task.title}`.slice(0, 200));
  set("beneficiary", task.beneficiary_contact_id);
  set("name", task.beneficiary_name);
  set("program", task.program_id);
  set("distribution", task.distribution_plan_id);
  set("shipment", task.shipment_id);
  set("case", task.case_id);
  if (task.support_modes.includes("cash")) set("amount", task.cash_amount);
  if (task.support_modes.includes("in_kind")) set("packages", task.goods_package_count);
  return `/field/reports/new?${params.toString()}`;
}

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

function ChecklistRow({
  busy,
  closed,
  item,
  onToggle,
  reportHref,
}: {
  busy: boolean;
  closed: boolean;
  item: FieldTaskItem & { queued?: boolean };
  onToggle: (isDone: boolean, note?: string) => void;
  reportHref: string;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const isReport = item.item_kind === "report";

  return (
    <li className="task-item" data-done={item.is_done}>
      <button
        aria-label={item.is_done ? `Batalkan centang: ${item.label}` : `Centang: ${item.label}`}
        aria-pressed={item.is_done}
        className="task-item__box"
        disabled={busy || closed || isReport}
        type="button"
        onClick={() => onToggle(!item.is_done)}
      >
        {item.is_done ? <Check aria-hidden size={22} strokeWidth={3} /> : null}
      </button>
      <div className="task-item__body">
        <span className="task-item__label">
          {item.label}
          {item.is_required ? null : <em> (opsional)</em>}
        </span>
        {item.is_done && (item.done_by_name || item.done_at) ? (
          <small>
            ✓ {item.done_by_name ?? "Anda"}
            {item.done_at ? ` · ${new Date(item.done_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </small>
        ) : null}
        {item.queued ? <small className="task-item__queued">Tersimpan di perangkat, dikirim saat online</small> : null}
        {item.note && !noteOpen ? <small className="task-item__note">{item.note}</small> : null}
        {item.item_kind === "photo" && !item.is_done ? (
          <small>Foto dilampirkan saat mengisi laporan; centang setelah foto diambil.</small>
        ) : null}
        {gpsError ? <small className="field-card__error">{gpsError}</small> : null}

        {!closed ? (
          <div className="task-item__actions">
            {item.item_kind === "gps" && !item.is_done ? (
              <Button
                disabled={gpsBusy}
                size="sm"
                variant="outline"
                onClick={() => {
                  setGpsBusy(true);
                  setGpsError("");
                  captureGps()
                    .then((reading) => onToggle(true, formatGps(reading)))
                    .catch((failure: Error) => setGpsError(failure.message))
                    .finally(() => setGpsBusy(false));
                }}
              >
                <MapPin aria-hidden size={14} /> {gpsBusy ? "Mencari…" : "Ambil GPS"}
              </Button>
            ) : null}
            {isReport && !item.is_done ? (
              <Link className={buttonVariants({ size: "sm" })} to={reportHref}>
                <FilePlus2 aria-hidden size={14} /> Isi laporan
              </Link>
            ) : null}
            {!isReport ? (
              <button className="task-item__link" type="button" onClick={() => setNoteOpen((value) => !value)}>
                <NotebookPen aria-hidden size={13} /> {item.note ? "Ubah catatan" : "Catatan"}
              </button>
            ) : null}
          </div>
        ) : null}

        {noteOpen ? (
          <form
            className="task-item__note-form"
            onSubmit={(event) => {
              event.preventDefault();
              onToggle(item.is_done, note);
              setNoteOpen(false);
            }}
          >
            <input
              aria-label={`Catatan untuk ${item.label}`}
              maxLength={500}
              placeholder="Mis. diterima oleh istri penerima"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button disabled={busy} size="sm" type="submit">
              Simpan
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

export function FieldTaskDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [busyItem, setBusyItem] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completing, setCompleting] = useState(false);

  const query = useQuery({
    enabled: Boolean(organizationId && id),
    queryFn: () => apiFetch<{ data: FieldTaskDetail }>(`/api/v1/field/tasks/${id}`),
    queryKey: ["field", "task", organizationId, id],
  });

  // Centang yang belum terkirim (offline) tetap tampil setelah halaman dibuka ulang.
  const loadQueued = useCallback(() => {
    void listOutbox(organizationId).then((entries) => {
      const prefix = `task-item:${id}:`;
      const queued: Record<string, Override> = {};
      for (const entry of entries) {
        if (!entry.client_reference.startsWith(prefix)) continue;
        queued[entry.client_reference.slice(prefix.length)] = {
          is_done: Boolean(entry.payload.is_done),
          note: typeof entry.payload.note === "string" ? entry.payload.note : undefined,
          queued: true,
        };
      }
      setOverrides((current) => {
        const next: Record<string, Override> = {};
        for (const [key, value] of Object.entries(current)) {
          if (!value.queued) next[key] = value;
        }
        return { ...next, ...queued };
      });
    });
  }, [id, organizationId]);

  useEffect(() => {
    loadQueued();
    return onOutboxChange(loadQueued);
  }, [loadQueued]);

  const task = query.data?.data;
  const items: Array<FieldTaskItem & { queued?: boolean }> = (task?.items ?? []).map((item) => {
    const override = overrides[item.id];
    return override
      ? { ...item, is_done: override.is_done, note: override.note ?? item.note, queued: override.queued }
      : item;
  });
  const closed = task ? task.status === "done" || task.status === "cancelled" : true;
  const requiredPending = items.filter((item) => item.is_required && !item.is_done);
  const pendingBeforeReport = requiredPending.filter((item) => item.item_kind !== "report");
  const doneCount = items.filter((item) => item.is_done).length;

  const toggle = async (item: FieldTaskItem, isDone: boolean, note?: string) => {
    if (!task) return;
    setBusyItem(item.id);
    setError("");
    setOverrides((current) => ({ ...current, [item.id]: { is_done: isDone, note: note ?? current[item.id]?.note, queued: false } }));
    try {
      const result = await runFieldAction(organizationId, {
        key: itemKey(task.id, item.id),
        payload: { is_done: isDone, ...(note !== undefined ? { note } : {}) },
        title: `Ceklis: ${item.label}`,
        url: `/api/v1/field/tasks/${task.id}/items/${item.id}`,
      });
      if (result.status === "sent") {
        await query.refetch();
        setOverrides((current) => omitKey(current, item.id));
      } else {
        setNotice("Tidak ada sinyal — centang disimpan di perangkat dan dikirim otomatis saat online.");
      }
    } catch (failure) {
      setOverrides((current) => omitKey(current, item.id));
      setError(failure instanceof Error ? failure.message : "Ceklis belum tersimpan.");
    } finally {
      setBusyItem("");
    }
  };

  const complete = async () => {
    if (!task) return;
    setCompleting(true);
    setError("");
    try {
      await apiFetch(`/api/v1/field/tasks/${task.id}/complete`, { body: JSON.stringify({}), method: "POST" });
      setNotice("Alhamdulillah, tugas selesai.");
      await query.refetch();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Tugas belum bisa diselesaikan.");
    } finally {
      setCompleting(false);
    }
  };

  const cancel = async () => {
    if (!task) return;
    setError("");
    try {
      await apiFetch(`/api/v1/field/tasks/${task.id}/cancel`, {
        body: JSON.stringify({ reason: cancelReason }),
        method: "POST",
      });
      setCancelOpen(false);
      await query.refetch();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Tugas belum bisa dibatalkan.");
    }
  };

  if (query.isLoading) {
    return (
      <section className="workspace-page field-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }
  if (query.isError || !task) {
    return (
      <section className="workspace-page field-page">
        <ErrorState
          title="Tugas belum dapat dimuat"
          description={navigator.onLine ? "Tugas tidak ditemukan atau bukan milik Anda." : "Perangkat offline. Buka tugas saat ada sinyal agar tersimpan di perangkat."}
          onRetry={() => query.refetch()}
        />
        <Link className={buttonVariants({ variant: "outline" })} to="/field">
          <ArrowLeft aria-hidden size={16} /> Kembali ke tugas
        </Link>
      </section>
    );
  }

  const due = dueLabel(task.due_date);
  const reportHref = reportLinkForTask(task);
  const contact = task.beneficiary;
  const phone = contact?.whatsapp_phone ?? contact?.primary_phone ?? task.beneficiary_phone;
  const address = contact?.address || task.location_text;

  return (
    <section className="workspace-page field-page task-page">
      <div className="task-page__top">
        <button className={buttonVariants({ size: "sm", variant: "ghost" })} type="button" onClick={() => navigate(-1)}>
          <ArrowLeft aria-hidden size={16} /> Kembali
        </button>
        <StatusBadge tone={taskStatusTone(task.status)}>{labelOf(fieldTaskStatusLabels, task.status)}</StatusBadge>
      </div>

      <header className="task-page__head">
        <small>
          {labelOf(fieldTaskTypeLabels, task.task_type)} · {task.reference_number}
        </small>
        <h1>{task.title}</h1>
        <div className="task-card__meta">
          {task.priority !== "normal" ? (
            <span className="task-flag" data-priority={task.priority}>
              {labelOf(fieldTaskPriorityLabels, task.priority)}
            </span>
          ) : null}
          {due && !closed ? (
            <span className="task-due" data-late={due.late}>
              Tenggat: {due.text}
            </span>
          ) : null}
          {task.program_name ? <span>{task.program_name}</span> : null}
        </div>
        <SupportChips task={task} />
      </header>

      {notice ? (
        <div className="field-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")}>
            Tutup
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="field-notice field-notice--error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")}>
            Tutup
          </button>
        </div>
      ) : null}

      {contact || address ? (
        <article className="field-card task-contact">
          {contact ? <strong>{contact.display_name}</strong> : null}
          {address ? <span className="task-contact__address">{address}</span> : null}
          <div className="task-contact__actions">
            {phone ? (
              <a className={buttonVariants({ size: "sm", variant: "outline" })} href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                <Phone aria-hidden size={15} /> Telepon
              </a>
            ) : null}
            {phone ? (
              <a className={buttonVariants({ size: "sm", variant: "outline" })} href={waLink(phone)} rel="noreferrer" target="_blank">
                <MessageCircle aria-hidden size={15} /> WhatsApp
              </a>
            ) : null}
            {address ? (
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                rel="noreferrer"
                target="_blank"
              >
                <Navigation aria-hidden size={15} /> Rute
              </a>
            ) : null}
            {contact ? (
              <Link className={buttonVariants({ size: "sm", variant: "ghost" })} to={`/beneficiaries/${contact.id}`}>
                Profil
              </Link>
            ) : null}
          </div>
        </article>
      ) : null}

      {task.instructions ? (
        <article className="field-card task-instructions">
          <strong>Arahan koordinator</strong>
          <p>{task.instructions}</p>
        </article>
      ) : null}

      {task.support_modes.includes("in_kind") && task.program_goods.length > 0 ? (
        <details className="field-card task-goods">
          <summary>Rencana barang program ({task.program_goods.length} jenis)</summary>
          <ul>
            {task.program_goods.map((good) => (
              <li key={good.name}>
                {good.name} — {Number(good.quantity).toLocaleString("id-ID")} {good.unit}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="task-checklist-card">
        <header>
          <h2>Ceklis tugas</h2>
          <TaskProgress done={doneCount} total={items.length} />
        </header>
        <ol className="task-checklist">
          {items.map((item) => (
            <ChecklistRow
              busy={busyItem === item.id}
              closed={closed}
              item={item}
              key={item.id}
              reportHref={reportHref}
              onToggle={(isDone, note) => void toggle(item, isDone, note)}
            />
          ))}
        </ol>
      </section>

      {task.reports.length > 0 ? (
        <section className="field-list">
          <h2 className="task-section-title">Laporan tugas ini</h2>
          {task.reports.map((report) => (
            <Link className="field-card field-card--link" key={report.id} to={`/field/reports/${report.id}`}>
              <header>
                <div>
                  <strong>{report.reference_number}</strong>
                  <small>{new Date(report.occurred_at).toLocaleString("id-ID")}</small>
                </div>
                <StatusBadge tone={toneOf(report.status === "follow_up" ? "pending" : report.status)}>
                  {labelOf(fieldReportStatusLabels, report.status)}
                </StatusBadge>
              </header>
            </Link>
          ))}
        </section>
      ) : null}

      {task.status === "done" ? (
        <article className="field-card task-done">
          <strong>Tugas selesai {task.completed_at ? new Date(task.completed_at).toLocaleString("id-ID") : ""}</strong>
          {task.completion_notes ? <p>{task.completion_notes}</p> : null}
        </article>
      ) : null}
      {task.status === "cancelled" ? (
        <article className="field-card">
          <strong>Tugas dibatalkan</strong>
          {task.cancelled_reason ? <p>{task.cancelled_reason}</p> : null}
        </article>
      ) : null}

      {!closed ? (
        <CanAccess action="manage" resource="field_tasks">
          {cancelOpen ? (
            <form
              className="field-sheet"
              onSubmit={(event) => {
                event.preventDefault();
                void cancel();
              }}
            >
              <div className="auth-field">
                <Label htmlFor="cancel-reason">Alasan pembatalan</Label>
                <input id="cancel-reason" minLength={5} required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
              </div>
              <div className="field-sheet__actions">
                <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="outline">
                  Batalkan tugas
                </Button>
              </div>
            </form>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>
              <XCircle aria-hidden size={14} /> Batalkan tugas (koordinator)
            </Button>
          )}
        </CanAccess>
      ) : null}

      {!closed ? (
        <div className="task-footer">
          {requiredPending.length === 0 ? (
            <Button disabled={completing} onClick={() => void complete()}>
              <Check aria-hidden size={16} /> {completing ? "Menyimpan…" : "Tandai tugas selesai"}
            </Button>
          ) : pendingBeforeReport.length === 0 ? (
            <Link className={buttonVariants({})} to={reportHref}>
              <FilePlus2 aria-hidden size={16} /> Isi laporan & selesaikan
            </Link>
          ) : (
            <p className="task-footer__hint">
              {pendingBeforeReport.length} langkah wajib lagi, lalu isi laporan.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
