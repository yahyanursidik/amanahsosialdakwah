import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, CheckCircle2, HandCoins, Send } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  KafalahContract,
  KafalahMonitoring,
  KafalahRenewal,
  KafalahSchedule,
} from "@/features/kafalah/types";

const today = () => new Date().toISOString().slice(0, 10);
const nowLocal = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
const tone = (status: string) => {
  if (
    [
      "active",
      "paid",
      "distributed",
      "verified",
      "approved",
      "completed",
    ].includes(status)
  )
    return "success" as const;
  if (["rejected", "cancelled", "revision_requested"].includes(status))
    return "danger" as const;
  if (["submitted", "requested", "scheduled"].includes(status))
    return "warning" as const;
  return "neutral" as const;
};

export function KafalahContractDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<KafalahContract>({
    id,
    resource: "kafalah_contracts",
    queryOptions: { enabled: Boolean(id) },
  });
  const command = useCustomMutation<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >();
  const [payment, setPayment] = useState({
    schedule_id: "",
    payment_reference: "",
    amount: "",
    paid_at: nowLocal(),
    channel: "transfer_bank",
  });
  const [distribution, setDistribution] = useState({
    schedule_id: "",
    payment_id: "",
    amount: "",
    distributed_at: nowLocal(),
    method: "transfer_bank",
    confirmation_notes: "",
  });
  const [monitoring, setMonitoring] = useState({
    period_start: today(),
    period_end: today(),
    outcome: "stable",
    summary: "",
  });
  const [renewal, setRenewal] = useState({
    requested_start_date: today(),
    requested_end_date: today(),
    periodic_amount: "",
    reason: "",
  });
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
    {},
  );
  const run = (
    url: string,
    values: Record<string, unknown>,
    idempotent = false,
  ) =>
    command.mutate(
      {
        url,
        method: "post",
        values,
        ...(idempotent
          ? { config: { headers: { "Idempotency-Key": crypto.randomUUID() } } }
          : {}),
      },
      { onSuccess: () => query.query.refetch() },
    );

  if (query.query.isLoading)
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  if (query.query.isError || !query.result)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Kafalah" title="Detail Kontrak" />
        <ErrorState
          title="Kontrak tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  const record = query.result;
  const schedules = record.schedules ?? [];
  const payments = record.payments ?? [];
  const scheduleColumns: ResourceTableColumn<KafalahSchedule>[] = [
    {
      key: "installment",
      header: "Angsuran",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>#{item.installment_number}</strong>
          <small>Jatuh tempo {item.due_date}</small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Tagihan",
      render: (item) => <MoneyDisplay amount={item.amount} />,
    },
    {
      key: "paid",
      header: "Terbayar",
      render: (item) => <MoneyDisplay amount={item.paid_amount} />,
    },
    {
      key: "distributed",
      header: "Tersalurkan",
      render: (item) => <MoneyDisplay amount={item.distributed_amount} />,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];
  const monitoringColumns: ResourceTableColumn<KafalahMonitoring>[] = [
    {
      key: "period",
      header: "Periode",
      render: (item) => `${item.period_start} – ${item.period_end}`,
    },
    { key: "outcome", header: "Hasil", render: (item) => item.outcome },
    { key: "summary", header: "Ringkasan", render: (item) => item.summary },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>
          {item.status.replaceAll("_", " ")}
        </StatusBadge>
      ),
    },
  ];
  const renewalColumns: ResourceTableColumn<KafalahRenewal>[] = [
    {
      key: "period",
      header: "Periode usulan",
      render: (item) =>
        `${item.requested_start_date} – ${item.requested_end_date}`,
    },
    {
      key: "amount",
      header: "Nilai periodik",
      render: (item) => <MoneyDisplay amount={item.periodic_amount} />,
    },
    { key: "reason", header: "Alasan", render: (item) => item.reason },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Kafalah / ${record.reference_number}`}
        title={`${record.sponsor_name} → ${record.beneficiary_name}`}
        description={record.need_title ?? "Kontrak dukungan berkelanjutan"}
        meta={
          <StatusBadge tone={tone(record.status)}>{record.status}</StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={() => list("kafalah_contracts")}>
            <ArrowLeft size={16} /> Daftar
          </Button>
        }
      />
      {command.mutation.isError ? (
        <ErrorState
          title="Command Kafalah ditolak"
          description={
            command.mutation.error?.message ??
            "Periksa status, permission, dan pemisahan maker-checker."
          }
        />
      ) : null}
      <DetailSection
        title="Konteks kontrak"
        items={[
          { label: "Matching", value: record.match_reference },
          {
            label: "Nilai matching",
            value: <MoneyDisplay amount={record.matched_amount} />,
          },
          { label: "Frekuensi", value: record.frequency.replaceAll("_", " ") },
          {
            label: "Nilai periodik",
            value: <MoneyDisplay amount={record.periodic_amount} />,
          },
          {
            label: "Periode",
            value: `${record.start_date} – ${record.end_date}`,
          },
          { label: "Ketentuan", value: record.terms },
        ]}
      />
      {record.status === "draft" ? (
        <CanAccess action="manage" resource="kafalah_contracts">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Aktivasi kontrak</h2>
                <p>
                  Aktor aktivasi harus berbeda dari pembuat kontrak. Jadwal
                  dibuat otomatis.
                </p>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                disabled={command.mutation.isPending}
                onClick={() =>
                  run(`/api/v1/kafalah/contracts/${id}/activate`, {})
                }
              >
                <CheckCircle2 size={16} /> Aktifkan
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      <div className="section-heading">
        <div>
          <h2>Jadwal pembayaran dan penyaluran</h2>
          <p>
            Nilai terbayar dan tersalurkan tidak dapat melampaui saldo jadwal.
          </p>
        </div>
      </div>
      <ResourceTable
        columns={scheduleColumns}
        items={schedules}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Jadwal belum tersedia"
            description="Aktifkan kontrak untuk menghasilkan jadwal."
          />
        }
      />
      {record.status === "active" ? (
        <div className="responsive-split">
          <CanAccess action="post" resource="kafalah_payments">
            <CommandSection
              title="Catat pembayaran kafil"
              action={
                <Button
                  disabled={command.mutation.isPending || !payment.schedule_id}
                  onClick={() =>
                    run(
                      `/api/v1/kafalah/schedules/${payment.schedule_id}/payments`,
                      {
                        ...payment,
                        schedule_id: undefined,
                        paid_at: new Date(payment.paid_at).toISOString(),
                      },
                      true,
                    )
                  }
                >
                  <HandCoins size={16} /> Catat pembayaran
                </Button>
              }
            >
              <div className="form-grid">
                <Field label="Jadwal">
                  <select
                    value={payment.schedule_id}
                    onChange={(e) =>
                      setPayment((v) => ({ ...v, schedule_id: e.target.value }))
                    }
                  >
                    <option value="">Pilih jadwal</option>
                    {schedules
                      .filter(
                        (item) =>
                          Number(item.paid_amount) < Number(item.amount),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.installment_number} — {item.due_date}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Referensi">
                  <input
                    value={payment.payment_reference}
                    onChange={(e) =>
                      setPayment((v) => ({
                        ...v,
                        payment_reference: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Nilai">
                  <input
                    inputMode="decimal"
                    value={payment.amount}
                    onChange={(e) =>
                      setPayment((v) => ({ ...v, amount: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Waktu">
                  <input
                    type="datetime-local"
                    value={payment.paid_at}
                    onChange={(e) =>
                      setPayment((v) => ({ ...v, paid_at: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </CommandSection>
          </CanAccess>
          <CanAccess action="record" resource="kafalah_distributions">
            <CommandSection
              title="Catat penyaluran penerima"
              action={
                <Button
                  disabled={
                    command.mutation.isPending ||
                    !distribution.schedule_id ||
                    !distribution.payment_id
                  }
                  onClick={() =>
                    run(
                      `/api/v1/kafalah/schedules/${distribution.schedule_id}/distributions`,
                      {
                        ...distribution,
                        schedule_id: undefined,
                        distributed_at: new Date(
                          distribution.distributed_at,
                        ).toISOString(),
                      },
                      true,
                    )
                  }
                >
                  <Send size={16} /> Catat penyaluran
                </Button>
              }
            >
              <div className="form-grid">
                <Field label="Jadwal">
                  <select
                    value={distribution.schedule_id}
                    onChange={(e) =>
                      setDistribution((v) => ({
                        ...v,
                        schedule_id: e.target.value,
                        payment_id: "",
                      }))
                    }
                  >
                    <option value="">Pilih jadwal</option>
                    {schedules
                      .filter(
                        (item) =>
                          Number(item.distributed_amount) <
                          Number(item.paid_amount),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.installment_number} — {item.due_date}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Pembayaran">
                  <select
                    value={distribution.payment_id}
                    onChange={(e) =>
                      setDistribution((v) => ({
                        ...v,
                        payment_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih pembayaran</option>
                    {payments
                      .filter(
                        (item) => item.schedule_id === distribution.schedule_id,
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.payment_reference}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Nilai">
                  <input
                    inputMode="decimal"
                    value={distribution.amount}
                    onChange={(e) =>
                      setDistribution((v) => ({ ...v, amount: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Konfirmasi" wide>
                  <textarea
                    minLength={10}
                    rows={3}
                    value={distribution.confirmation_notes}
                    onChange={(e) =>
                      setDistribution((v) => ({
                        ...v,
                        confirmation_notes: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </CommandSection>
          </CanAccess>
        </div>
      ) : null}
      <div className="section-heading">
        <div>
          <h2>Monitoring manfaat</h2>
          <p>
            Petugas mengirim laporan; verifikator berbeda memberi keputusan.
          </p>
        </div>
      </div>
      <ResourceTable
        columns={monitoringColumns}
        items={record.monitoring_reports ?? []}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Belum ada monitoring"
            description="Catat perkembangan manfaat selama kontrak aktif."
          />
        }
        rowActions={(item) =>
          item.status === "submitted" ? (
            <CanAccess action="verify" resource="kafalah_monitoring">
              <div className="inline-actions">
                <input
                  aria-label="Catatan verifikasi"
                  placeholder="Catatan min. 10 karakter"
                  value={decisionNotes[item.id] ?? ""}
                  onChange={(e) =>
                    setDecisionNotes((v) => ({
                      ...v,
                      [item.id]: e.target.value,
                    }))
                  }
                />
                <Button
                  size="sm"
                  onClick={() =>
                    run(`/api/v1/kafalah/monitoring/${item.id}/decision`, {
                      decision: "verified",
                      notes: decisionNotes[item.id] ?? "",
                    })
                  }
                >
                  Verifikasi
                </Button>
              </div>
            </CanAccess>
          ) : null
        }
      />
      {record.status === "active" ? (
        <CanAccess action="manage" resource="kafalah_monitoring">
          <CommandSection
            title="Laporan monitoring baru"
            action={
              <Button
                onClick={() =>
                  run(`/api/v1/kafalah/contracts/${id}/monitoring`, monitoring)
                }
              >
                Kirim monitoring
              </Button>
            }
          >
            <div className="form-grid">
              <Field label="Mulai">
                <input
                  type="date"
                  value={monitoring.period_start}
                  onChange={(e) =>
                    setMonitoring((v) => ({
                      ...v,
                      period_start: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Akhir">
                <input
                  type="date"
                  value={monitoring.period_end}
                  onChange={(e) =>
                    setMonitoring((v) => ({ ...v, period_end: e.target.value }))
                  }
                />
              </Field>
              <Field label="Outcome">
                <select
                  value={monitoring.outcome}
                  onChange={(e) =>
                    setMonitoring((v) => ({ ...v, outcome: e.target.value }))
                  }
                >
                  {["stable", "improved", "declined", "critical"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Ringkasan" wide>
                <textarea
                  minLength={20}
                  rows={4}
                  value={monitoring.summary}
                  onChange={(e) =>
                    setMonitoring((v) => ({ ...v, summary: e.target.value }))
                  }
                />
              </Field>
            </div>
          </CommandSection>
        </CanAccess>
      ) : null}
      <div className="section-heading">
        <div>
          <h2>Renewal</h2>
          <p>
            Perpanjangan merupakan usulan dan keputusan terpisah, bukan
            perubahan kontrak diam-diam.
          </p>
        </div>
      </div>
      <ResourceTable
        columns={renewalColumns}
        items={record.renewals ?? []}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Belum ada renewal"
            description="Ajukan perpanjangan bila dukungan perlu diteruskan."
          />
        }
        rowActions={(item) =>
          item.status === "requested" ? (
            <CanAccess action="decide" resource="kafalah_renewals">
              <div className="inline-actions">
                <input
                  aria-label="Catatan keputusan"
                  placeholder="Catatan min. 10 karakter"
                  value={decisionNotes[item.id] ?? ""}
                  onChange={(e) =>
                    setDecisionNotes((v) => ({
                      ...v,
                      [item.id]: e.target.value,
                    }))
                  }
                />
                <Button
                  size="sm"
                  onClick={() =>
                    run(`/api/v1/kafalah/renewals/${item.id}/decision`, {
                      decision: "approved",
                      notes: decisionNotes[item.id] ?? "",
                    })
                  }
                >
                  Setujui
                </Button>
              </div>
            </CanAccess>
          ) : null
        }
      />
      {record.status === "active" || record.status === "completed" ? (
        <CanAccess action="manage" resource="kafalah_renewals">
          <CommandSection
            title="Ajukan renewal"
            action={
              <Button
                onClick={() =>
                  run(`/api/v1/kafalah/contracts/${id}/renewals`, renewal)
                }
              >
                Ajukan renewal
              </Button>
            }
          >
            <div className="form-grid">
              <Field label="Mulai">
                <input
                  type="date"
                  value={renewal.requested_start_date}
                  onChange={(e) =>
                    setRenewal((v) => ({
                      ...v,
                      requested_start_date: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Akhir">
                <input
                  type="date"
                  value={renewal.requested_end_date}
                  onChange={(e) =>
                    setRenewal((v) => ({
                      ...v,
                      requested_end_date: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Nilai periodik">
                <input
                  inputMode="decimal"
                  value={renewal.periodic_amount}
                  onChange={(e) =>
                    setRenewal((v) => ({
                      ...v,
                      periodic_amount: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Alasan" wide>
                <textarea
                  minLength={20}
                  rows={4}
                  value={renewal.reason}
                  onChange={(e) =>
                    setRenewal((v) => ({ ...v, reason: e.target.value }))
                  }
                />
              </Field>
            </div>
          </CommandSection>
        </CanAccess>
      ) : null}
    </section>
  );
}

function CommandSection({
  action,
  children,
  title,
}: {
  action: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="form-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="form-section__body">{children}</div>
      <div className="form-section__footer">{action}</div>
    </section>
  );
}
function Field({
  children,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={`auth-field${wide ? "form-field--wide" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
