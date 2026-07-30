import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import {
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from "@/features/applications/schemas";
import type { ApplicationRecord } from "@/features/applications/types";
import type {
  CrmContactRolesDocument,
  CrmContactsDocument,
  ProgramsDocument,
} from "@/generated/neon/models";

export function ApplicationCreatePage() {
  const { list, show } = useNavigation();
  const { mutate: createApplication, mutation } =
    useCreate<ApplicationRecord>();
  const programQuery = useList<ProgramsDocument>({
    resource: "programs",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "is_archived", operator: "eq", value: false },
    ],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const roleQuery = useList<CrmContactRolesDocument>({
    resource: "crm_contact_roles",
    filters: [
      { field: "role_type", operator: "eq", value: "beneficiary" },
      { field: "status", operator: "eq", value: "active" },
    ],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const beneficiaryIds = new Set(
    (roleQuery.result?.data ?? []).map((role) => role.contact_id),
  );
  const contactQuery = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const beneficiaries = (contactQuery.result?.data ?? []).filter((contact) =>
    beneficiaryIds.has(contact.$id),
  );
  const programs = programQuery.result?.data ?? [];
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      applicant_contact_id: "",
      channel: "field",
      notes: "",
      program_id: "",
      requested_support: "",
      urgency: "normal",
    },
  });

  const onSubmit: SubmitHandler<ApplicationFormValues> = (values) => {
    createApplication(
      { resource: "applications", values },
      {
        onSuccess: ({ data }) => show("applications", data.id),
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="application-create-title">
      <PageHeader
        eyebrow="Applications & Cases"
        title="Buat Pengajuan Bantuan"
        description="Pengajuan baru disimpan sebagai draft dan belum masuk proses screening."
        actions={
          <Button variant="outline" onClick={() => list("applications")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />

      <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Pemohon dan Program"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => list("applications")}
              >
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                <Save aria-hidden="true" size={16} />
                {mutation.isPending ? "Menyimpan..." : "Simpan Draft"}
              </Button>
            </>
          }
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="applicant_contact_id">Penerima manfaat</Label>
              <select
                id="applicant_contact_id"
                {...register("applicant_contact_id")}
              >
                <option value="">Pilih penerima</option>
                {beneficiaries.map((contact) => (
                  <option key={contact.$id} value={contact.$id}>
                    {contact.display_name} — {contact.city ?? "Kota belum diisi"}
                  </option>
                ))}
              </select>
              {errors.applicant_contact_id ? (
                <span className="auth-field__message" data-tone="error">
                  {errors.applicant_contact_id.message}
                </span>
              ) : null}
            </div>

            <div className="auth-field">
              <Label htmlFor="program_id">Program aktif</Label>
              <select id="program_id" {...register("program_id")}>
                <option value="">Pilih program</option>
                {programs.map((program) => (
                  <option key={program.$id} value={program.$id}>
                    {program.code} — {program.name}
                  </option>
                ))}
              </select>
              {errors.program_id ? (
                <span className="auth-field__message" data-tone="error">
                  {errors.program_id.message}
                </span>
              ) : null}
            </div>

            <div className="auth-field">
              <Label htmlFor="channel">Kanal masuk</Label>
              <select id="channel" {...register("channel")}>
                <option value="field">Petugas lapangan</option>
                <option value="walk_in">Datang langsung</option>
                <option value="referral">Rujukan</option>
                <option value="partner">Mitra</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div className="auth-field">
              <Label htmlFor="urgency">Urgensi</Label>
              <select id="urgency" {...register("urgency")}>
                <option value="normal">Normal</option>
                <option value="urgent">Mendesak</option>
                <option value="emergency">Darurat</option>
              </select>
            </div>

            <div className="auth-field auth-field--wide">
              <Label htmlFor="requested_support">Kebutuhan yang diajukan</Label>
              <textarea
                id="requested_support"
                rows={5}
                {...register("requested_support")}
              />
              {errors.requested_support ? (
                <span className="auth-field__message" data-tone="error">
                  {errors.requested_support.message}
                </span>
              ) : null}
            </div>

            <div className="auth-field auth-field--wide">
              <Label htmlFor="notes">Catatan intake</Label>
              <textarea id="notes" rows={3} {...register("notes")} />
              <span className="auth-field__message">
                Hindari menaruh nomor identitas sensitif pada catatan umum.
              </span>
            </div>
          </div>
        </FormSection>
      </form>
    </section>
  );
}
