import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from "@/features/applications/schemas";
import type { ApplicationRecord } from "@/features/applications/types";
import { optionsOf, submitterTypeLabels } from "@/features/giving/labels";
import type {
  CrmContactRolesDocument,
  CrmContactsDocument,
  ProgramsDocument,
} from "@/generated/neon/models";

const submitterHints: Record<string, string> = {
  individual:
    "Pengaju adalah calon penerima manfaat (orang) yang mengajukan untuk dirinya atau keluarganya.",
  institution:
    "Pengaju adalah lembaga (masjid, pesantren, sekolah, komunitas) yang mengajukan kebutuhan untuk lembaganya sendiri.",
  partner_on_behalf:
    "Lembaga mitra (mis. yayasan/masjid mitra) mengajukan atas nama penerima. Penerima tetap dicatat sebagai pengaju; lembaga mitra tercatat sebagai pengusul.",
};

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
      {
        field: "role_type",
        operator: "in",
        value: ["beneficiary", "applicant", "distribution_partner"],
      },
      { field: "status", operator: "eq", value: "active" },
    ],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const roles = roleQuery.result?.data ?? [];
  const applicantIds = new Set(
    roles
      .filter((role) => ["beneficiary", "applicant"].includes(role.role_type))
      .map((role) => role.contact_id),
  );
  const partnerIds = new Set(
    roles
      .filter((role) =>
        ["distribution_partner", "applicant"].includes(role.role_type),
      )
      .map((role) => role.contact_id),
  );
  const contactQuery = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
  });
  const contacts = contactQuery.result?.data ?? [];
  const programs = programQuery.result?.data ?? [];
  const {
    formState: { errors },
    handleSubmit,
    register,
    watch,
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      applicant_contact_id: "",
      beneficiary_count: 1,
      channel: "field",
      notes: "",
      program_id: "",
      requested_amount: "",
      requested_support: "",
      submitter_type: "individual",
      submitting_partner_contact_id: "",
      urgency: "normal",
    },
  });
  const submitterType = watch("submitter_type");
  const applicants = contacts.filter(
    (contact) =>
      applicantIds.has(contact.$id) &&
      (submitterType === "institution"
        ? contact.contact_type === "institution"
        : true),
  );
  const partners = contacts.filter(
    (contact) =>
      partnerIds.has(contact.$id) && contact.contact_type === "institution",
  );

  const onSubmit: SubmitHandler<ApplicationFormValues> = (values) => {
    createApplication(
      {
        resource: "applications",
        values: {
          ...values,
          channel:
            values.submitter_type === "partner_on_behalf"
              ? "partner"
              : values.channel,
          requested_amount: values.requested_amount || null,
          submitting_partner_contact_id:
            values.submitter_type === "partner_on_behalf"
              ? values.submitting_partner_contact_id
              : null,
        },
      },
      {
        onSuccess: ({ data }) => show("applications", data.id),
      },
    );
  };

  return (
    <section
      className="workspace-page"
      aria-labelledby="application-create-title"
    >
      <PageHeader
        eyebrow="Pengajuan bantuan"
        title="Buat Pengajuan Bantuan"
        description="Pengajuan disimpan sebagai draft. Setelah diajukan, petugas melakukan seleksi lalu mengonversinya menjadi kasus penerima manfaat."
        actions={
          <Button variant="outline" onClick={() => list("applications")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />

      <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="1. Siapa yang mengajukan?"
          description={submitterHints[submitterType]}
        >
          <div
            className="choice-grid"
            role="radiogroup"
            aria-label="Tipe pengaju"
          >
            {optionsOf(submitterTypeLabels).map((option) => (
              <label
                className="choice-card"
                data-selected={submitterType === option.value}
                key={option.value}
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register("submitter_type")}
                />
                <strong>{option.label}</strong>
                <small>{submitterHints[option.value]}</small>
              </label>
            ))}
          </div>
          <div className="form-grid mt-4">
            {submitterType === "partner_on_behalf" ? (
              <div className="auth-field">
                <Label htmlFor="submitting_partner_contact_id">
                  Lembaga mitra pengaju
                </Label>
                <select
                  id="submitting_partner_contact_id"
                  {...register("submitting_partner_contact_id")}
                >
                  <option value="">Pilih lembaga mitra</option>
                  {partners.map((contact) => (
                    <option key={contact.$id} value={contact.$id}>
                      {contact.display_name} —{" "}
                      {contact.city ?? "Kota belum diisi"}
                    </option>
                  ))}
                </select>
                {errors.submitting_partner_contact_id ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.submitting_partner_contact_id.message}
                  </span>
                ) : (
                  <span className="auth-field__message">
                    Lembaga harus berperan Mitra penyalur atau Pengaju di
                    Contact master.
                  </span>
                )}
              </div>
            ) : null}
            <div className="auth-field">
              <Label htmlFor="applicant_contact_id">
                {submitterType === "institution"
                  ? "Lembaga pengaju"
                  : "Penerima / pengaju"}
              </Label>
              <select
                id="applicant_contact_id"
                {...register("applicant_contact_id")}
              >
                <option value="">
                  {submitterType === "institution"
                    ? "Pilih lembaga"
                    : "Pilih pengaju atau penerima"}
                </option>
                {applicants.map((contact) => (
                  <option key={contact.$id} value={contact.$id}>
                    {contact.display_name} —{" "}
                    {contact.city ?? "Kota belum diisi"}
                  </option>
                ))}
              </select>
              {errors.applicant_contact_id ? (
                <span className="auth-field__message" data-tone="error">
                  {errors.applicant_contact_id.message}
                </span>
              ) : (
                <span className="auth-field__message">
                  Belum ada di daftar? Tambahkan di Contact master dengan peran
                  Pengaju atau Penerima manfaat.
                </span>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="2. Program & kebutuhan"
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

            {submitterType !== "partner_on_behalf" ? (
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
            ) : null}

            <div className="auth-field">
              <Label htmlFor="urgency">Urgensi</Label>
              <select id="urgency" {...register("urgency")}>
                <option value="normal">Normal</option>
                <option value="urgent">Mendesak</option>
                <option value="emergency">Darurat</option>
              </select>
            </div>

            <div className="auth-field">
              <Label htmlFor="beneficiary_count">
                Jumlah penerima manfaat
              </Label>
              <input
                id="beneficiary_count"
                min={1}
                type="number"
                {...register("beneficiary_count", { valueAsNumber: true })}
              />
              {errors.beneficiary_count ? (
                <span className="auth-field__message" data-tone="error">
                  {errors.beneficiary_count.message}
                </span>
              ) : (
                <span className="auth-field__message">
                  Untuk pengajuan lembaga, isi jumlah jiwa/santri/jamaah yang
                  terlayani.
                </span>
              )}
            </div>

            <div className="auth-field">
              <Label htmlFor="requested_amount">
                Perkiraan nilai kebutuhan (Rp, opsional)
              </Label>
              <input
                id="requested_amount"
                inputMode="decimal"
                {...register("requested_amount")}
              />
              {errors.requested_amount ? (
                <span className="auth-field__message" data-tone="error">
                  {errors.requested_amount.message}
                </span>
              ) : null}
            </div>

            <div className="auth-field auth-field--wide">
              <Label htmlFor="requested_support">
                Kebutuhan yang diajukan
              </Label>
              <textarea
                id="requested_support"
                rows={5}
                placeholder="Jelaskan kebutuhan: uang, barang (sebutkan jenis & jumlah), atau layanan."
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
