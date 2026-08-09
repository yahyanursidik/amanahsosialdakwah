import {
  useCustomMutation,
  useList,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, CheckCircle2, Save, Sprout } from "lucide-react";
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
  WaqfAsset,
  WaqfBenefitDistribution,
  WaqfContactOption,
  WaqfIncomeRecord,
  WaqfLegalDocument,
  WaqfMaintenanceRecord,
  WaqfUtilization,
  WaqfValuation,
} from "@/features/waqf/types";

function nowLocal() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function tone(status: string) {
  if (["active", "completed", "received", "verified"].includes(status))
    return "success" as const;
  if (["disputed", "rejected", "retired", "suspended"].includes(status))
    return "danger" as const;
  if (["pending", "pending_review", "under_maintenance"].includes(status))
    return "warning" as const;
  return "neutral" as const;
}

export function WaqfDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<WaqfAsset>({
    id,
    resource: "waqf_assets",
    queryOptions: { enabled: Boolean(id) },
  });
  const contacts = useList<WaqfContactOption>({
    resource: "waqf_contacts",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const command = useCustomMutation<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >();
  const [document, setDocument] = useState({
    document_number: "",
    document_type: "akta_ikrar_wakaf",
    issued_at: "",
    issuer: "",
  });
  const [verifyNotes, setVerifyNotes] = useState("");
  const [nazhir, setNazhir] = useState({
    assignment_scope: "",
    contact_id: "",
    start_date: today(),
  });
  const [valuation, setValuation] = useState({
    amount: "",
    appraiser: "",
    currency: "IDR",
    method: "internal_estimate",
    notes: "",
    valuation_date: today(),
  });
  const [utilization, setUtilization] = useState({
    beneficiary_contact_id: "",
    expected_benefit: "",
    start_date: today(),
    utilization_type: "education",
  });
  const [maintenance, setMaintenance] = useState({
    amount: "0",
    description: "",
    maintenance_type: "inspection",
    occurred_at: nowLocal(),
    vendor_contact_id: "",
  });
  const [income, setIncome] = useState({
    amount: "",
    income_type: "rent",
    notes: "",
    payer_contact_id: "",
    received_at: nowLocal(),
    utilization_id: "",
  });
  const [benefit, setBenefit] = useState({
    amount: "",
    beneficiary_contact_id: "",
    benefit_type: "cash",
    distributed_at: nowLocal(),
    income_record_id: "",
    notes: "",
  });

  const run = (
    path: string,
    values: Record<string, unknown> = {},
    idempotent = false,
  ) =>
    command.mutate(
      {
        url: path,
        method: "post",
        values,
        ...(idempotent
          ? { headers: { "Idempotency-Key": crypto.randomUUID() } }
          : {}),
      },
      { onSuccess: () => query.query.refetch() },
    );

  if (query.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }

  if (query.query.isError || !query.result) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Wakaf" title="Detail aset wakaf" />
        <ErrorState
          title="Aset wakaf tidak ditemukan"
          description="Data tidak tersedia atau berada pada organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const record = query.result;
  const documentColumns: ResourceTableColumn<WaqfLegalDocument>[] = [
    {
      key: "document",
      header: "Dokumen",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.document_type.replaceAll("_", " ")}</strong>
          <small>{item.document_number}</small>
        </div>
      ),
    },
    {
      key: "issuer",
      header: "Penerbit",
      render: (item) => item.issuer ?? "-",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.verification_status)}>
          {item.verification_status}
        </StatusBadge>
      ),
    },
  ];
  const valuationColumns: ResourceTableColumn<WaqfValuation>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (item) => item.valuation_date,
    },
    {
      key: "amount",
      header: "Nilai",
      render: (item) => (
        <MoneyDisplay amount={item.amount} currency={item.currency} />
      ),
    },
    {
      key: "method",
      header: "Metode",
      render: (item) => item.method.replaceAll("_", " "),
    },
  ];
  const incomeColumns: ResourceTableColumn<WaqfIncomeRecord>[] = [
    {
      key: "reference",
      header: "Pendapatan",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.income_reference}</strong>
          <small>{item.income_type.replaceAll("_", " ")}</small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Nilai",
      render: (item) => (
        <MoneyDisplay amount={item.amount} currency={item.currency} />
      ),
    },
    {
      key: "date",
      header: "Diterima",
      render: (item) => new Date(item.received_at).toLocaleString("id-ID"),
    },
  ];
  const benefitColumns: ResourceTableColumn<WaqfBenefitDistribution>[] = [
    {
      key: "reference",
      header: "Manfaat",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.distribution_reference}</strong>
          <small>{item.benefit_type.replaceAll("_", " ")}</small>
        </div>
      ),
    },
    {
      key: "recipient",
      header: "Penerima/program",
      render: (item) => item.beneficiary_name ?? item.program_name ?? "-",
    },
    {
      key: "amount",
      header: "Nilai",
      render: (item) => (
        <MoneyDisplay amount={item.amount} currency={item.currency} />
      ),
    },
  ];
  const utilizationColumns: ResourceTableColumn<WaqfUtilization>[] = [
    {
      key: "type",
      header: "Pemanfaatan",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.utilization_type.replaceAll("_", " ")}</strong>
          <small>{item.expected_benefit}</small>
        </div>
      ),
    },
    {
      key: "target",
      header: "Sasaran",
      render: (item) => item.beneficiary_name ?? item.program_name ?? "-",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>,
    },
  ];
  const maintenanceColumns: ResourceTableColumn<WaqfMaintenanceRecord>[] = [
    {
      key: "type",
      header: "Pemeliharaan",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.maintenance_type.replaceAll("_", " ")}</strong>
          <small>{item.description}</small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Biaya",
      render: (item) => (
        <MoneyDisplay amount={item.amount} currency={item.currency} />
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Wakaf / ${record.reference_number}`}
        title={record.name}
        description={record.description}
        meta={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={tone(record.operational_status)}>
              {record.operational_status.replaceAll("_", " ")}
            </StatusBadge>
            <StatusBadge tone={tone(record.legal_status)}>
              {record.legal_status.replaceAll("_", " ")}
            </StatusBadge>
          </div>
        }
        actions={
          <Button variant="outline" onClick={() => list("waqf_assets")}>
            <ArrowLeft aria-hidden size={16} /> Daftar
          </Button>
        }
      />
      {command.mutation.isError ? (
        <ErrorState
          title="Command wakaf ditolak"
          description={
            command.mutation.error?.message ??
            "Periksa status, maker-checker, dan permission."
          }
        />
      ) : null}
      <DetailSection
        title="Konteks aset"
        items={[
          { label: "Jenis", value: record.asset_type.replaceAll("_", " ") },
          { label: "Wakif", value: record.donor_name ?? "Belum dicatat" },
          {
            label: "Nilai perolehan",
            value: record.acquisition_value ? (
              <MoneyDisplay
                amount={record.acquisition_value}
                currency={record.currency}
              />
            ) : (
              "-"
            ),
          },
          { label: "Tanggal perolehan", value: record.acquisition_date ?? "-" },
          { label: "Lokasi", value: record.location_text ?? "-" },
        ]}
      />

      {record.operational_status === "draft" ? (
        <CanAccess action="register" resource="waqf_assets">
          <div className="rounded-3xl border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Sprout aria-hidden size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Registrasi wakaf</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Registrasi hanya dapat dilakukan setelah minimal satu
                    dokumen legal diverifikasi oleh aktor berbeda.
                  </p>
                </div>
              </div>
              <Button
                disabled={command.mutation.isPending}
                onClick={() => run(`/api/v1/waqf/assets/${id}/register`)}
              >
                <CheckCircle2 aria-hidden size={16} /> Registrasi
              </Button>
            </div>
          </div>
        </CanAccess>
      ) : null}

      <div className="section-heading">
        <div>
          <h2>Dokumen legal</h2>
          <p>Metadata dokumen dicatat dulu; file binary bisa ditautkan setelah S3 siap.</p>
        </div>
      </div>
      <ResourceTable
        columns={documentColumns}
        items={record.legal_documents ?? []}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Belum ada dokumen"
            description="Tambahkan dokumen legal sebelum registrasi aset."
          />
        }
        rowActions={(item) =>
          item.verification_status === "pending" ? (
            <CanAccess action="verify" resource="waqf_legal_documents">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Catatan verifikasi"
                  className="max-w-52"
                  placeholder="Catatan verifikasi"
                  value={verifyNotes}
                  onChange={(event) => setVerifyNotes(event.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={verifyNotes.length < 10}
                  onClick={() =>
                    run(`/api/v1/waqf/legal-documents/${item.id}/verify`, {
                      notes: verifyNotes,
                      status: "verified",
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
      <CanAccess action="manage" resource="waqf_legal_documents">
        <QuickForm
          title="Tambah dokumen legal"
          actionLabel="Simpan dokumen"
          onSubmit={() =>
            run(`/api/v1/waqf/assets/${id}/legal-documents`, {
              ...document,
              issued_at: document.issued_at || undefined,
              issuer: document.issuer || undefined,
            })
          }
        >
          <Select
            label="Jenis dokumen"
            value={document.document_type}
            onChange={(value) =>
              setDocument((current) => ({ ...current, document_type: value }))
            }
            options={[
              ["akta_ikrar_wakaf", "Akta ikrar wakaf"],
              ["sertifikat_wakaf", "Sertifikat wakaf"],
              ["sertifikat_tanah", "Sertifikat tanah"],
              ["bukti_transfer", "Bukti transfer"],
              ["surat_pernyataan", "Surat pernyataan"],
              ["izin_operasional", "Izin operasional"],
              ["other", "Lainnya"],
            ]}
          />
          <TextInput
            label="Nomor dokumen"
            value={document.document_number}
            onChange={(value) =>
              setDocument((current) => ({ ...current, document_number: value }))
            }
          />
          <TextInput
            label="Penerbit"
            value={document.issuer}
            onChange={(value) =>
              setDocument((current) => ({ ...current, issuer: value }))
            }
          />
          <DateInput
            label="Tanggal terbit"
            value={document.issued_at}
            onChange={(value) =>
              setDocument((current) => ({ ...current, issued_at: value }))
            }
          />
        </QuickForm>
      </CanAccess>

      <TwoColumn>
        <CanAccess action="record" resource="waqf_valuations">
          <QuickForm
            title="Catat valuasi"
            actionLabel="Simpan valuasi"
            onSubmit={() => run(`/api/v1/waqf/assets/${id}/valuations`, valuation)}
          >
            <TextInput
              label="Nilai"
              value={valuation.amount}
              onChange={(value) =>
                setValuation((current) => ({ ...current, amount: value }))
              }
            />
            <DateInput
              label="Tanggal valuasi"
              value={valuation.valuation_date}
              onChange={(value) =>
                setValuation((current) => ({
                  ...current,
                  valuation_date: value,
                }))
              }
            />
            <Select
              label="Metode"
              value={valuation.method}
              onChange={(value) =>
                setValuation((current) => ({ ...current, method: value }))
              }
              options={[
                ["internal_estimate", "Estimasi internal"],
                ["market_comparison", "Perbandingan pasar"],
                ["independent_appraiser", "Appraiser independen"],
                ["book_value", "Nilai buku"],
                ["other", "Lainnya"],
              ]}
            />
            <Textarea
              label="Catatan"
              value={valuation.notes}
              onChange={(value) =>
                setValuation((current) => ({ ...current, notes: value }))
              }
            />
          </QuickForm>
        </CanAccess>
        <CanAccess action="manage" resource="waqf_nazhir">
          <QuickForm
            title="Tetapkan nazhir"
            actionLabel="Simpan nazhir"
            onSubmit={() => run(`/api/v1/waqf/assets/${id}/nazhirs`, nazhir)}
          >
            <ContactSelect
              contacts={contacts.result?.data ?? []}
              label="Nazhir/pengelola"
              value={nazhir.contact_id}
              onChange={(value) =>
                setNazhir((current) => ({ ...current, contact_id: value }))
              }
            />
            <DateInput
              label="Mulai"
              value={nazhir.start_date}
              onChange={(value) =>
                setNazhir((current) => ({ ...current, start_date: value }))
              }
            />
            <Textarea
              label="Ruang lingkup"
              value={nazhir.assignment_scope}
              onChange={(value) =>
                setNazhir((current) => ({
                  ...current,
                  assignment_scope: value,
                }))
              }
            />
          </QuickForm>
        </CanAccess>
      </TwoColumn>

      <ResourceTable
        columns={valuationColumns}
        items={record.valuations ?? []}
        getRowId={(item) => item.id}
        empty={<EmptyState title="Belum ada valuasi" />}
      />

      <TwoColumn>
        <CanAccess action="manage" resource="waqf_utilizations">
          <QuickForm
            title="Catat pemanfaatan"
            actionLabel="Simpan pemanfaatan"
            onSubmit={() =>
              run(`/api/v1/waqf/assets/${id}/utilizations`, {
                ...utilization,
                beneficiary_contact_id:
                  utilization.beneficiary_contact_id || null,
              })
            }
          >
            <Select
              label="Jenis"
              value={utilization.utilization_type}
              onChange={(value) =>
                setUtilization((current) => ({
                  ...current,
                  utilization_type: value,
                }))
              }
              options={[
                ["education", "Pendidikan"],
                ["dakwah", "Dakwah"],
                ["health", "Kesehatan"],
                ["economic", "Ekonomi"],
                ["social", "Sosial"],
                ["rental", "Sewa produktif"],
                ["other", "Lainnya"],
              ]}
            />
            <ContactSelect
              contacts={contacts.result?.data ?? []}
              label="Penerima/sasaran"
              value={utilization.beneficiary_contact_id}
              onChange={(value) =>
                setUtilization((current) => ({
                  ...current,
                  beneficiary_contact_id: value,
                }))
              }
            />
            <DateInput
              label="Mulai"
              value={utilization.start_date}
              onChange={(value) =>
                setUtilization((current) => ({
                  ...current,
                  start_date: value,
                }))
              }
            />
            <Textarea
              label="Manfaat yang diharapkan"
              value={utilization.expected_benefit}
              onChange={(value) =>
                setUtilization((current) => ({
                  ...current,
                  expected_benefit: value,
                }))
              }
            />
          </QuickForm>
        </CanAccess>
        <CanAccess action="record" resource="waqf_maintenance">
          <QuickForm
            title="Catat maintenance"
            actionLabel="Simpan maintenance"
            onSubmit={() =>
              run(`/api/v1/waqf/assets/${id}/maintenance`, {
                ...maintenance,
                occurred_at: new Date(maintenance.occurred_at).toISOString(),
                vendor_contact_id: maintenance.vendor_contact_id || null,
              })
            }
          >
            <Select
              label="Jenis"
              value={maintenance.maintenance_type}
              onChange={(value) =>
                setMaintenance((current) => ({
                  ...current,
                  maintenance_type: value,
                }))
              }
              options={[
                ["inspection", "Inspeksi"],
                ["repair", "Perbaikan"],
                ["renovation", "Renovasi"],
                ["tax", "Pajak/administrasi"],
                ["security", "Keamanan"],
                ["cleaning", "Kebersihan"],
                ["other", "Lainnya"],
              ]}
            />
            <TextInput
              label="Biaya"
              value={maintenance.amount}
              onChange={(value) =>
                setMaintenance((current) => ({ ...current, amount: value }))
              }
            />
            <DateTimeInput
              label="Waktu"
              value={maintenance.occurred_at}
              onChange={(value) =>
                setMaintenance((current) => ({
                  ...current,
                  occurred_at: value,
                }))
              }
            />
            <Textarea
              label="Deskripsi"
              value={maintenance.description}
              onChange={(value) =>
                setMaintenance((current) => ({
                  ...current,
                  description: value,
                }))
              }
            />
          </QuickForm>
        </CanAccess>
      </TwoColumn>

      <ResourceTable
        columns={utilizationColumns}
        items={record.utilizations ?? []}
        getRowId={(item) => item.id}
        empty={<EmptyState title="Belum ada pemanfaatan" />}
      />
      <ResourceTable
        columns={maintenanceColumns}
        items={record.maintenance_records ?? []}
        getRowId={(item) => item.id}
        empty={<EmptyState title="Belum ada maintenance" />}
      />

      <TwoColumn>
        <CanAccess action="record" resource="waqf_income">
          <QuickForm
            title="Catat pendapatan"
            actionLabel="Simpan pendapatan"
            onSubmit={() =>
              run(
                `/api/v1/waqf/assets/${id}/income`,
                {
                  ...income,
                  payer_contact_id: income.payer_contact_id || null,
                  received_at: new Date(income.received_at).toISOString(),
                  utilization_id: income.utilization_id || null,
                },
                true,
              )
            }
          >
            <TextInput
              label="Nilai"
              value={income.amount}
              onChange={(value) =>
                setIncome((current) => ({ ...current, amount: value }))
              }
            />
            <Select
              label="Jenis"
              value={income.income_type}
              onChange={(value) =>
                setIncome((current) => ({ ...current, income_type: value }))
              }
              options={[
                ["rent", "Sewa"],
                ["profit_share", "Bagi hasil"],
                ["harvest", "Hasil panen"],
                ["service_fee", "Jasa"],
                ["donation_return", "Pengembalian manfaat"],
                ["other", "Lainnya"],
              ]}
            />
            <ContactSelect
              contacts={contacts.result?.data ?? []}
              label="Pembayar"
              value={income.payer_contact_id}
              onChange={(value) =>
                setIncome((current) => ({
                  ...current,
                  payer_contact_id: value,
                }))
              }
            />
            <DateTimeInput
              label="Diterima"
              value={income.received_at}
              onChange={(value) =>
                setIncome((current) => ({ ...current, received_at: value }))
              }
            />
            <Textarea
              label="Catatan"
              value={income.notes}
              onChange={(value) =>
                setIncome((current) => ({ ...current, notes: value }))
              }
            />
          </QuickForm>
        </CanAccess>
        <CanAccess action="distribute" resource="waqf_benefits">
          <QuickForm
            title="Distribusi manfaat"
            actionLabel="Simpan manfaat"
            onSubmit={() =>
              run(
                `/api/v1/waqf/assets/${id}/benefits`,
                {
                  ...benefit,
                  beneficiary_contact_id: benefit.beneficiary_contact_id || null,
                  distributed_at: new Date(benefit.distributed_at).toISOString(),
                  income_record_id: benefit.income_record_id || null,
                },
                true,
              )
            }
          >
            <TextInput
              label="Nilai"
              value={benefit.amount}
              onChange={(value) =>
                setBenefit((current) => ({ ...current, amount: value }))
              }
            />
            <Select
              label="Sumber pendapatan"
              value={benefit.income_record_id}
              onChange={(value) =>
                setBenefit((current) => ({
                  ...current,
                  income_record_id: value,
                }))
              }
              options={[
                ["", "Tidak ditautkan"],
                ...(record.income_records ?? []).map((item) => [
                  item.id,
                  `${item.income_reference} — ${item.amount}`,
                ]),
              ]}
            />
            <ContactSelect
              contacts={contacts.result?.data ?? []}
              label="Penerima"
              value={benefit.beneficiary_contact_id}
              onChange={(value) =>
                setBenefit((current) => ({
                  ...current,
                  beneficiary_contact_id: value,
                }))
              }
            />
            <DateTimeInput
              label="Disalurkan"
              value={benefit.distributed_at}
              onChange={(value) =>
                setBenefit((current) => ({
                  ...current,
                  distributed_at: value,
                }))
              }
            />
            <Textarea
              label="Catatan"
              value={benefit.notes}
              onChange={(value) =>
                setBenefit((current) => ({ ...current, notes: value }))
              }
            />
          </QuickForm>
        </CanAccess>
      </TwoColumn>

      <ResourceTable
        columns={incomeColumns}
        items={record.income_records ?? []}
        getRowId={(item) => item.id}
        empty={<EmptyState title="Belum ada pendapatan" />}
      />
      <ResourceTable
        columns={benefitColumns}
        items={record.benefit_distributions ?? []}
        getRowId={(item) => item.id}
        empty={<EmptyState title="Belum ada distribusi manfaat" />}
      />
    </section>
  );
}

function TwoColumn({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-2">{children}</div>;
}

function QuickForm({
  actionLabel,
  children,
  onSubmit,
  title,
}: {
  actionLabel: string;
  children: React.ReactNode;
  onSubmit: () => void;
  title: string;
}) {
  return (
    <section className="form-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="form-grid">{children}</div>
      <div className="form-actions">
        <Button type="button" onClick={onSubmit}>
          <Save aria-hidden size={16} /> {actionLabel}
        </Button>
      </div>
    </section>
  );
}

function TextInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="auth-field">
      <Label>{label}</Label>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="auth-field">
      <Label>{label}</Label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DateTimeInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="auth-field">
      <Label>{label}</Label>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Textarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="auth-field auth-field--wide">
      <Label>{label}</Label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<string[]>;
  value: string;
}) {
  return (
    <div className="auth-field">
      <Label>{label}</Label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function ContactSelect({
  contacts,
  label,
  onChange,
  value,
}: {
  contacts: WaqfContactOption[];
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[
        ["", "Tidak ditautkan"],
        ...contacts.map((contact) => [contact.id, contact.display_name]),
      ]}
    />
  );
}
