import { zodResolver } from "@hookform/resolvers/zod";
import { useList } from "@refinedev/core";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type SubmitHandler,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { Navigate, useNavigate, useParams } from "react-router";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  fundAllocationFormSchema,
  fundCommitmentFormSchema,
  fundDisbursementFormSchema,
  fundReceiptFormSchema,
  fundReconciliationFormSchema,
  fundRestrictionFormSchema,
  type FundAllocationFormValues,
  type FundCommitmentFormValues,
  type FundDisbursementFormValues,
  type FundReceiptFormValues,
  type FundReconciliationFormValues,
  type FundRestrictionFormValues,
} from "@/features/funds/schemas";
import type {
  FundAllocation,
  FundCommandEnvelope,
  FundCommitment,
  FundRestriction,
} from "@/features/funds/types";
import { apiFetch } from "@/lib/neon/http";

type Option = { id: string; label: string };
type Program = { id: string; name: string };
type Contact = { id: string; display_name: string };
type FundKind =
  | "allocation"
  | "commitment"
  | "disbursement"
  | "receipt"
  | "reconciliation"
  | "restriction";

const nowLocal = () => new Date().toISOString().slice(0, 16);
const toIso = (value: string) => new Date(value).toISOString();

function FieldMessage({
  errors,
  name,
}: {
  errors: FieldErrors;
  name: string;
}) {
  const error = errors[name];
  return error?.message ? (
    <span className="auth-field__message" data-tone="error">
      {String(error.message)}
    </span>
  ) : null;
}

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      <Save aria-hidden="true" size={16} />
      {isPending ? "Menyimpan..." : "Simpan"}
    </Button>
  );
}

function useCommand<TInput>(path: string, idempotent = false) {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (values: TInput) =>
      apiFetch<FundCommandEnvelope<unknown>>(path, {
        body: JSON.stringify(values),
        ...(idempotent
          ? { headers: { "Idempotency-Key": crypto.randomUUID() } }
          : {}),
        method: "POST",
      }),
    onSuccess: () => navigate("/funds"),
  });
}

function RestrictionForm({ programs }: { programs: Option[] }) {
  const mutation = useCommand<FundRestrictionFormValues>("/api/v1/funds/restrictions");
  const form = useForm<FundRestrictionFormValues>({
    defaultValues: {
      code: "",
      currency: "IDR",
      name: "",
      program_id: "",
      restriction_type: "unrestricted",
    },
    resolver: zodResolver(fundRestrictionFormSchema),
  });
  const type = useWatch({ control: form.control, name: "restriction_type" });
  const submit: SubmitHandler<FundRestrictionFormValues> = (values) =>
    mutation.mutate({
      ...values,
      program_id: values.program_id || undefined,
    });
  return (
    <form className="crm-form" onSubmit={form.handleSubmit(submit)}>
      <FormSection title="Klasifikasi dana" footer={<SubmitButton isPending={mutation.isPending} />}>
        <div className="form-grid">
          <div className="auth-field"><Label htmlFor="code">Kode</Label><input id="code" {...form.register("code")} /><FieldMessage errors={form.formState.errors} name="code" /></div>
          <div className="auth-field"><Label htmlFor="name">Nama</Label><input id="name" {...form.register("name")} /><FieldMessage errors={form.formState.errors} name="name" /></div>
          <div className="auth-field"><Label htmlFor="restriction_type">Jenis</Label><select id="restriction_type" {...form.register("restriction_type")}><option value="unrestricted">Tidak terikat</option><option value="program">Terikat program</option></select></div>
          <div className="auth-field"><Label htmlFor="program_id">Program</Label><select id="program_id" disabled={type !== "program"} {...form.register("program_id")}><option value="">Pilih program</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><FieldMessage errors={form.formState.errors} name="program_id" /></div>
          <div className="auth-field"><Label htmlFor="currency">Mata uang</Label><input id="currency" maxLength={3} {...form.register("currency")} /></div>
        </div>
      </FormSection>
    </form>
  );
}

function CommitmentForm({
  contacts,
  restrictions,
}: {
  contacts: Option[];
  restrictions: Option[];
}) {
  const mutation = useCommand<Record<string, unknown>>("/api/v1/funds/commitments");
  const form = useForm<FundCommitmentFormValues>({
    defaultValues: { amount: "", committed_at: nowLocal(), currency: "IDR", donor_contact_id: "", expected_at: "", notes: "", restriction_id: "" },
    resolver: zodResolver(fundCommitmentFormSchema),
  });
  const submit: SubmitHandler<FundCommitmentFormValues> = (values) =>
    mutation.mutate({ ...values, committed_at: toIso(values.committed_at), donor_contact_id: values.donor_contact_id || null, expected_at: values.expected_at ? toIso(values.expected_at) : null });
  return (
    <form className="crm-form" onSubmit={form.handleSubmit(submit)}>
      <FormSection title="Komitmen pemberi amanah" footer={<SubmitButton isPending={mutation.isPending} />}>
        <div className="form-grid">
          <SelectField id="restriction_id" label="Pembatasan" options={restrictions} register={form.register("restriction_id")} errors={form.formState.errors} />
          <SelectField id="donor_contact_id" label="Pemberi (opsional)" options={contacts} register={form.register("donor_contact_id")} errors={form.formState.errors} />
          <TextField id="amount" label="Nominal" register={form.register("amount")} errors={form.formState.errors} />
          <TextField id="currency" label="Mata uang" register={form.register("currency")} errors={form.formState.errors} />
          <TextField id="committed_at" label="Tanggal komitmen" type="datetime-local" register={form.register("committed_at")} errors={form.formState.errors} />
          <TextField id="expected_at" label="Perkiraan diterima" type="datetime-local" register={form.register("expected_at")} errors={form.formState.errors} />
          <div className="auth-field auth-field--wide"><Label htmlFor="notes">Catatan</Label><textarea id="notes" rows={3} {...form.register("notes")} /></div>
        </div>
      </FormSection>
    </form>
  );
}

function ReceiptForm({
  commitments,
  contacts,
  restrictions,
}: {
  commitments: Option[];
  contacts: Option[];
  restrictions: Option[];
}) {
  const mutation = useCommand<Record<string, unknown>>("/api/v1/funds/receipts", true);
  const form = useForm<FundReceiptFormValues>({
    defaultValues: { amount: "", commitment_id: "", currency: "IDR", donor_contact_id: "", external_reference: "", payment_method: "bank_transfer", received_at: nowLocal(), restriction_id: "" },
    resolver: zodResolver(fundReceiptFormSchema),
  });
  const submit: SubmitHandler<FundReceiptFormValues> = (values) =>
    mutation.mutate({ ...values, commitment_id: values.commitment_id || null, donor_contact_id: values.donor_contact_id || null, received_at: toIso(values.received_at) });
  return (
    <form className="crm-form" onSubmit={form.handleSubmit(submit)}>
      <FormSection title="Penerimaan kas" footer={<SubmitButton isPending={mutation.isPending} />}>
        <div className="form-grid">
          <SelectField id="restriction_id" label="Pembatasan" options={restrictions} register={form.register("restriction_id")} errors={form.formState.errors} />
          <SelectField id="commitment_id" label="Komitmen (opsional)" options={commitments} register={form.register("commitment_id")} errors={form.formState.errors} />
          <SelectField id="donor_contact_id" label="Pemberi (opsional)" options={contacts} register={form.register("donor_contact_id")} errors={form.formState.errors} />
          <TextField id="amount" label="Nominal" register={form.register("amount")} errors={form.formState.errors} />
          <TextField id="currency" label="Mata uang" register={form.register("currency")} errors={form.formState.errors} />
          <SelectField id="payment_method" label="Metode bayar" options={paymentOptions} register={form.register("payment_method")} errors={form.formState.errors} />
          <TextField id="received_at" label="Diterima pada" type="datetime-local" register={form.register("received_at")} errors={form.formState.errors} />
          <TextField id="external_reference" label="Referensi eksternal" register={form.register("external_reference")} errors={form.formState.errors} />
        </div>
      </FormSection>
    </form>
  );
}

function AllocationForm({
  programs,
  restrictions,
}: {
  programs: Option[];
  restrictions: Option[];
}) {
  const mutation = useCommand<FundAllocationFormValues>("/api/v1/funds/allocations");
  const form = useForm<FundAllocationFormValues>({
    defaultValues: { amount: "", currency: "IDR", program_id: "", purpose: "", restriction_id: "" },
    resolver: zodResolver(fundAllocationFormSchema),
  });
  return (
    <form className="crm-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <FormSection title="Draft alokasi" footer={<SubmitButton isPending={mutation.isPending} />}>
        <div className="form-grid">
          <SelectField id="restriction_id" label="Pembatasan" options={restrictions} register={form.register("restriction_id")} errors={form.formState.errors} />
          <SelectField id="program_id" label="Program tujuan" options={programs} register={form.register("program_id")} errors={form.formState.errors} />
          <TextField id="amount" label="Nominal" register={form.register("amount")} errors={form.formState.errors} />
          <TextField id="currency" label="Mata uang" register={form.register("currency")} errors={form.formState.errors} />
          <div className="auth-field auth-field--wide"><Label htmlFor="purpose">Tujuan penggunaan</Label><textarea id="purpose" rows={4} {...form.register("purpose")} /><FieldMessage errors={form.formState.errors} name="purpose" /></div>
        </div>
      </FormSection>
    </form>
  );
}

function DisbursementForm({ allocations }: { allocations: Option[] }) {
  const mutation = useCommand<Record<string, unknown>>("/api/v1/funds/disbursements", true);
  const form = useForm<FundDisbursementFormValues>({
    defaultValues: { allocation_id: "", amount: "", currency: "IDR", disbursed_at: nowLocal(), external_reference: "", payment_method: "bank_transfer", recipient_reference: "", recipient_type: "beneficiary" },
    resolver: zodResolver(fundDisbursementFormSchema),
  });
  const submit: SubmitHandler<FundDisbursementFormValues> = (values) =>
    mutation.mutate({ ...values, disbursed_at: toIso(values.disbursed_at) });
  return (
    <form className="crm-form" onSubmit={form.handleSubmit(submit)}>
      <FormSection title="Penyaluran dari alokasi approved" footer={<SubmitButton isPending={mutation.isPending} />}>
        <div className="form-grid">
          <SelectField id="allocation_id" label="Alokasi" options={allocations} register={form.register("allocation_id")} errors={form.formState.errors} />
          <TextField id="amount" label="Nominal" register={form.register("amount")} errors={form.formState.errors} />
          <TextField id="currency" label="Mata uang" register={form.register("currency")} errors={form.formState.errors} />
          <SelectField id="recipient_type" label="Tipe penerima" options={recipientOptions} register={form.register("recipient_type")} errors={form.formState.errors} />
          <TextField id="recipient_reference" label="Referensi penerima" register={form.register("recipient_reference")} errors={form.formState.errors} />
          <SelectField id="payment_method" label="Metode bayar" options={paymentOptions} register={form.register("payment_method")} errors={form.formState.errors} />
          <TextField id="disbursed_at" label="Disalurkan pada" type="datetime-local" register={form.register("disbursed_at")} errors={form.formState.errors} />
          <TextField id="external_reference" label="Referensi eksternal" register={form.register("external_reference")} errors={form.formState.errors} />
        </div>
      </FormSection>
    </form>
  );
}

function ReconciliationForm({ restrictions }: { restrictions: Option[] }) {
  const mutation = useCommand<Record<string, unknown>>("/api/v1/funds/reconciliations", true);
  const form = useForm<FundReconciliationFormValues>({
    defaultValues: { currency: "IDR", notes: "", period_ended_at: nowLocal(), restriction_id: "", statement_balance: "0" },
    resolver: zodResolver(fundReconciliationFormSchema),
  });
  const submit: SubmitHandler<FundReconciliationFormValues> = (values) =>
    mutation.mutate({ ...values, period_ended_at: toIso(values.period_ended_at) });
  return (
    <form className="crm-form" onSubmit={form.handleSubmit(submit)}>
      <FormSection title="Rekonsiliasi rekening" footer={<SubmitButton isPending={mutation.isPending} />}>
        <div className="form-grid">
          <SelectField id="restriction_id" label="Pembatasan" options={restrictions} register={form.register("restriction_id")} errors={form.formState.errors} />
          <TextField id="statement_balance" label="Saldo rekening koran" register={form.register("statement_balance")} errors={form.formState.errors} />
          <TextField id="currency" label="Mata uang" register={form.register("currency")} errors={form.formState.errors} />
          <TextField id="period_ended_at" label="Akhir periode" type="datetime-local" register={form.register("period_ended_at")} errors={form.formState.errors} />
          <div className="auth-field auth-field--wide"><Label htmlFor="notes">Catatan</Label><textarea id="notes" rows={3} {...form.register("notes")} /></div>
        </div>
      </FormSection>
    </form>
  );
}

function TextField({ errors, id, label, register, type = "text" }: { errors: FieldErrors; id: string; label: string; register: UseFormRegisterReturn; type?: string }) {
  return <div className="auth-field"><Label htmlFor={id}>{label}</Label><input id={id} type={type} {...register} /><FieldMessage errors={errors} name={id} /></div>;
}
function SelectField({ errors, id, label, options, register }: { errors: FieldErrors; id: string; label: string; options: Option[]; register: UseFormRegisterReturn }) {
  return <div className="auth-field"><Label htmlFor={id}>{label}</Label><select id={id} {...register}><option value="">Pilih</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><FieldMessage errors={errors} name={id} /></div>;
}

const paymentOptions: Option[] = [
  { id: "bank_transfer", label: "Transfer bank" },
  { id: "cash", label: "Tunai" },
  { id: "card", label: "Kartu" },
  { id: "gateway", label: "Payment gateway" },
  { id: "other", label: "Lainnya" },
];
const recipientOptions: Option[] = [
  { id: "beneficiary", label: "Penerima manfaat" },
  { id: "partner", label: "Mitra" },
  { id: "vendor", label: "Vendor" },
  { id: "staff", label: "Petugas" },
  { id: "other", label: "Lainnya" },
];

const titles: Record<FundKind, string> = {
  allocation: "Buat Draft Alokasi",
  commitment: "Catat Komitmen Dana",
  disbursement: "Bukukan Penyaluran Dana",
  receipt: "Bukukan Penerimaan Dana",
  reconciliation: "Rekonsiliasi Dana",
  restriction: "Buat Pembatasan Dana",
};

export function FundCreatePage() {
  const navigate = useNavigate();
  const { kind = "" } = useParams();
  const validKind = kind in titles ? (kind as FundKind) : null;
  const listOptions = { pagination: { currentPage: 1, pageSize: 100, mode: "server" as const } };
  const restrictionsQuery = useList<FundRestriction>({ resource: "fund_restrictions", filters: [{ field: "status", operator: "eq", value: "active" }], ...listOptions });
  const commitmentsQuery = useList<FundCommitment>({ resource: "fund_commitments", filters: [{ field: "status", operator: "eq", value: "active" }], ...listOptions });
  const allocationsQuery = useList<FundAllocation>({ resource: "fund_allocations", filters: [{ field: "status", operator: "eq", value: "approved" }], ...listOptions });
  const programsQuery = useList<Program>({ resource: "programs", ...listOptions });
  const contactsQuery = useList<Contact>({ resource: "crm_contacts", ...listOptions });
  const restrictions = (restrictionsQuery.result?.data ?? []).map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` }));
  const commitments = (commitmentsQuery.result?.data ?? []).map((item) => ({ id: item.id, label: `${item.reference_number} — ${item.amount} ${item.currency}` }));
  const allocations = (allocationsQuery.result?.data ?? []).map((item) => ({ id: item.id, label: `${item.reference_number} — ${item.amount} ${item.currency}` }));
  const programs = (programsQuery.result?.data ?? []).map((item) => ({ id: item.id, label: item.name }));
  const contacts = (contactsQuery.result?.data ?? []).map((item) => ({ id: item.id, label: item.display_name }));

  if (!validKind) {
    return <Navigate to="/not-found" replace />;
  }

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Funds & Amanah"
        title={titles[validKind]}
        description="Server memvalidasi membership, permission, organisasi aktif, state transition, dan saldo."
        actions={<Button variant="outline" onClick={() => navigate("/funds")}><ArrowLeft aria-hidden="true" size={16} /> Kembali</Button>}
      />
      {validKind === "restriction" ? <RestrictionForm programs={programs} /> : null}
      {validKind === "commitment" ? <CommitmentForm contacts={contacts} restrictions={restrictions} /> : null}
      {validKind === "receipt" ? <ReceiptForm commitments={commitments} contacts={contacts} restrictions={restrictions} /> : null}
      {validKind === "allocation" ? <AllocationForm programs={programs} restrictions={restrictions} /> : null}
      {validKind === "disbursement" ? <DisbursementForm allocations={allocations} /> : null}
      {validKind === "reconciliation" ? <ReconciliationForm restrictions={restrictions} /> : null}
    </section>
  );
}
