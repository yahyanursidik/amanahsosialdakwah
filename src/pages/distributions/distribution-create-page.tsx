import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CaseRecord } from "@/features/applications/types";
import {
  distributionPlanFormSchema,
  type DistributionPlanFormValues,
} from "@/features/distributions/schemas";
import type { DistributionPlan } from "@/features/distributions/types";
import type { FundDisbursement } from "@/features/funds/types";

function initialDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function DistributionCreatePage() {
  const { list, show } = useNavigation();
  const { mutate: createPlan, mutation } = useCreate<DistributionPlan>();
  const listOptions = {
    pagination: { currentPage: 1, pageSize: 100, mode: "server" as const },
  };
  const disbursements = useList<FundDisbursement>({
    resource: "fund_disbursements",
    filters: [{ field: "status", operator: "eq", value: "posted" }],
    ...listOptions,
  });
  const cases = useList<CaseRecord>({
    resource: "cases",
    filters: [{ field: "status", operator: "eq", value: "eligible" }],
    ...listOptions,
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<DistributionPlanFormValues>({
    resolver: zodResolver(distributionPlanFormSchema),
    defaultValues: {
      amount: "",
      case_id: "",
      currency: "IDR",
      disbursement_id: "",
      distribution_method: "cash",
      planned_at: initialDateTime(),
      purpose: "",
      requires_confirmation: true,
    },
  });

  const submit: SubmitHandler<DistributionPlanFormValues> = (values) => {
    createPlan(
      {
        resource: "distributions",
        values: {
          ...values,
          currency: values.currency.toUpperCase(),
          planned_at: new Date(values.planned_at).toISOString(),
        },
      },
      { onSuccess: ({ data }) => show("distributions", data.id) },
    );
  };
  const message = (name: keyof DistributionPlanFormValues) =>
    errors[name]?.message ? (
      <span className="auth-field__message" data-tone="error">
        {String(errors[name]?.message)}
      </span>
    ) : null;

  return (
    <section className="workspace-page" aria-labelledby="distribution-create-title">
      <PageHeader
        eyebrow="Operasional Lapangan"
        title="Rencana Distribusi"
        description="Nilai dan konteks distribusi dikunci setelah dibuat. Koreksi dilakukan dengan pembatalan tercatat dan rencana baru."
        actions={
          <Button variant="outline" onClick={() => list("distributions")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />
      <form className="crm-form" onSubmit={handleSubmit(submit)}>
        <FormSection
          title="Sumber dan Penerima"
          description="Server memastikan pencairan posted, alokasi approved, program sesuai, serta kasus dan kontak masih aktif."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => list("distributions")}
              >
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                <Save aria-hidden="true" size={16} />
                {mutation.isPending ? "Menyimpan..." : "Simpan Rencana"}
              </Button>
            </>
          }
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="disbursement_id">Pencairan dana posted</Label>
              <select id="disbursement_id" {...register("disbursement_id")}>
                <option value="">Pilih pencairan</option>
                {(disbursements.result?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reference_number} — {item.amount} {item.currency}
                  </option>
                ))}
              </select>
              {message("disbursement_id")}
            </div>
            <div className="auth-field">
              <Label htmlFor="case_id">Kasus eligible</Label>
              <select id="case_id" {...register("case_id")}>
                <option value="">Pilih kasus</option>
                {(cases.result?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reference_number} — {item.beneficiary_name ?? "Penerima"}
                  </option>
                ))}
              </select>
              {message("case_id")}
            </div>
            <div className="auth-field">
              <Label htmlFor="amount">Nominal</Label>
              <input id="amount" inputMode="decimal" {...register("amount")} />
              {message("amount")}
            </div>
            <div className="auth-field">
              <Label htmlFor="currency">Mata uang</Label>
              <input id="currency" maxLength={3} {...register("currency")} />
              {message("currency")}
            </div>
            <div className="auth-field">
              <Label htmlFor="distribution_method">Metode distribusi</Label>
              <select id="distribution_method" {...register("distribution_method")}>
                <option value="cash">Tunai</option>
                <option value="bank_transfer">Transfer bank</option>
                <option value="voucher">Voucher</option>
                <option value="vendor_payment">Pembayaran vendor</option>
                <option value="reimbursement">Reimbursement</option>
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="planned_at">Waktu rencana</Label>
              <input
                id="planned_at"
                type="datetime-local"
                {...register("planned_at")}
              />
              {message("planned_at")}
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="purpose">Tujuan distribusi</Label>
              <textarea id="purpose" rows={4} {...register("purpose")} />
              {message("purpose")}
            </div>
            <label className="auth-field__checkbox auth-field--wide">
              <input type="checkbox" {...register("requires_confirmation")} />
              Wajib ada konfirmasi penerima sebelum verifikasi
            </label>
          </div>
        </FormSection>
      </form>
    </section>
  );
}
