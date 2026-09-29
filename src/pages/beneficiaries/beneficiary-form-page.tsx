import { useCustomMutation, useList, useNavigation } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  ErrorState,
  FormSection,
  LoadingSkeleton,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BeneficiaryDetail } from "@/features/beneficiaries/types";
import {
  asnafLabels,
  assessmentStatusLabels,
  beneficiaryCategoryLabels,
  beneficiaryStatusLabels,
  beneficiaryTypeLabels,
  disabilityLabels,
  educationLabels,
  genderLabels,
  housingLabels,
  incomeRangeLabels,
  maritalStatusLabels,
  optionsOf,
  vulnerabilityLabels,
  type LabelMap,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  CrmContactsDocument,
  ProgramsDocument,
} from "@/generated/neon/models";
import { apiFetch } from "@/lib/neon/http";

const emptyForm = {
  address_line: "",
  asnaf_category: "",
  assessment_status: "not_assessed",
  bank_account_holder: "",
  bank_account_number: "",
  bank_name: "",
  beneficiary_categories: [] as string[],
  beneficiary_type: "individual",
  birth_date: "",
  birth_place: "",
  city: "",
  contact_type: "person",
  dependents_count: "",
  disability_status: "",
  display_name: "",
  district: "",
  education_level: "",
  eligibility_notes: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  family_card_number: "",
  gender: "unknown",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",
  health_notes: "",
  household_size: "",
  housing_status: "",
  income_range: "unknown",
  marital_status: "",
  monthly_income: "",
  nik: "",
  occupation: "",
  postal_code: "",
  primary_email: "",
  primary_phone: "",
  province: "",
  referral_partner_contact_id: "",
  status: "active",
  village: "",
  vulnerability_level: "medium",
  whatsapp_phone: "",
};
type FormState = typeof emptyForm;

function Field({
  children,
  hint,
  id,
  label,
  wide,
}: {
  children: ReactNode;
  hint?: string | undefined;
  id: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "auth-field auth-field--wide" : "auth-field"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <span className="auth-field__message">{hint}</span> : null}
    </div>
  );
}

function OptionSelect({
  empty,
  id,
  labels,
  onChange,
  value,
}: {
  empty?: string;
  id: string;
  labels: LabelMap;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {empty !== undefined ? <option value="">{empty}</option> : null}
      {optionsOf(labels).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function formFromDetail(data: BeneficiaryDetail): FormState {
    const { contact, profile } = data;
    const value = (input: unknown) =>
      input === null || input === undefined ? "" : String(input);
    return {
      ...emptyForm,
      address_line: value(contact.address_line),
      asnaf_category: value(profile?.asnaf_category),
      assessment_status: profile?.assessment_status ?? "not_assessed",
      bank_account_holder: value(profile?.bank_account_holder),
      bank_account_number: data.sensitive_visible
        ? value(profile?.bank_account_number)
        : "",
      bank_name: value(profile?.bank_name),
      beneficiary_categories: profile?.beneficiary_categories ?? [],
      beneficiary_type: profile?.beneficiary_type ?? "individual",
      birth_date: value(contact.birth_date).slice(0, 10),
      birth_place: value(profile?.birth_place),
      city: value(contact.city),
      contact_type: contact.contact_type,
      dependents_count: value(profile?.dependents_count),
      disability_status: value(profile?.disability_status),
      display_name: contact.display_name,
      district: value(contact.district),
      education_level: value(profile?.education_level),
      eligibility_notes: value(profile?.eligibility_notes),
      emergency_contact_name: value(profile?.emergency_contact_name),
      emergency_contact_phone: value(profile?.emergency_contact_phone),
      gender: contact.gender ?? "unknown",
      guardian_name: value(profile?.guardian_name),
      guardian_phone: value(profile?.guardian_phone),
      guardian_relation: value(profile?.guardian_relation),
      health_notes: value(profile?.health_notes),
      household_size: value(profile?.household_size),
      housing_status: value(profile?.housing_status),
      income_range: profile?.income_range ?? "unknown",
      marital_status: value(profile?.marital_status),
      monthly_income: value(profile?.monthly_income),
      occupation: value(profile?.occupation),
      postal_code: value(contact.postal_code),
      primary_email: value(contact.primary_email),
      primary_phone: value(contact.primary_phone),
      province: value(contact.province),
      referral_partner_contact_id: value(profile?.referral_partner_contact_id),
      status: profile?.status ?? "active",
      village: value(contact.village),
      vulnerability_level: profile?.vulnerability_level ?? "medium",
      whatsapp_phone: value(contact.whatsapp_phone),
    };
}

export function BeneficiaryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const detail = useQuery({
    enabled: isEdit && Boolean(organizationId),
    queryFn: () =>
      apiFetch<{ data: BeneficiaryDetail }>(`/api/v1/beneficiaries/${id}`),
    queryKey: ["beneficiaries", "detail", organizationId, id],
  });

  if (isEdit && detail.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }

  return (
    <BeneficiaryForm
      detailData={detail.data?.data}
      id={id}
      key={detail.data?.data.contact.id ?? "new"}
    />
  );
}

function BeneficiaryForm({
  detailData,
  id,
}: {
  detailData: BeneficiaryDetail | undefined;
  id: string | undefined;
}) {
  const isEdit = Boolean(id);
  const { list, show } = useNavigation();
  const [form, setForm] = useState<FormState>(() =>
    detailData ? formFromDetail(detailData) : emptyForm,
  );
  const [enroll, setEnroll] = useState({ program_id: "", requested_support: "" });
  const set = (patch: Partial<FormState>) =>
    setForm((value) => ({ ...value, ...patch }));
  const text =
    (field: keyof FormState) =>
    (event: { target: { value: string } }) =>
      set({ [field]: event.target.value } as Partial<FormState>);

  const partners = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "contact_type", operator: "eq", value: "institution" },
    ],
    pagination: { currentPage: 1, pageSize: 200, mode: "server" },
  });
  const programs = useList<ProgramsDocument>({
    resource: "programs",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "is_archived", operator: "eq", value: false },
    ],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: !isEdit },
  });
  const mutation = useCustomMutation<{
    enrollment?: { application_id?: string; error?: string } | null;
    id: string;
  }>();


  const savedIdentity = (type: string) =>
    detailData?.identities.find((item) => item.identity_type === type);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const orNull = (value: string) => (value === "" ? null : value);
    const orUndefined = (value: string) => (value === "" ? undefined : value);
    const identities = [
      form.nik ? { identity_number: form.nik, identity_type: "nik" } : null,
      form.family_card_number
        ? { identity_number: form.family_card_number, identity_type: "family_card" }
        : null,
    ].filter(Boolean);
    const payload = {
      address_line: orUndefined(form.address_line),
      asnaf_category: orNull(form.asnaf_category),
      assessment_status: form.assessment_status,
      bank_account_holder: orUndefined(form.bank_account_holder),
      bank_account_number: orUndefined(form.bank_account_number),
      bank_name: orUndefined(form.bank_name),
      beneficiary_categories: form.beneficiary_categories,
      beneficiary_type: form.beneficiary_type,
      birth_date: orNull(form.birth_date),
      birth_place: orUndefined(form.birth_place),
      city: orUndefined(form.city),
      contact_type: form.contact_type,
      dependents_count: form.dependents_count === "" ? null : Number(form.dependents_count),
      disability_status: orNull(form.disability_status),
      display_name: form.display_name,
      district: orUndefined(form.district),
      education_level: orNull(form.education_level),
      eligibility_notes: orUndefined(form.eligibility_notes),
      emergency_contact_name: orUndefined(form.emergency_contact_name),
      emergency_contact_phone: orUndefined(form.emergency_contact_phone),
      gender: form.gender,
      guardian_name: orUndefined(form.guardian_name),
      guardian_phone: orUndefined(form.guardian_phone),
      guardian_relation: orUndefined(form.guardian_relation),
      health_notes: orUndefined(form.health_notes),
      household_size: form.household_size === "" ? null : Number(form.household_size),
      housing_status: orNull(form.housing_status),
      identities,
      income_range: form.income_range,
      marital_status: orNull(form.marital_status),
      monthly_income: orNull(form.monthly_income),
      occupation: orUndefined(form.occupation),
      postal_code: orUndefined(form.postal_code),
      primary_email: orUndefined(form.primary_email),
      primary_phone: orUndefined(form.primary_phone),
      province: orUndefined(form.province),
      referral_partner_contact_id: orNull(form.referral_partner_contact_id),
      status: form.status,
      village: orUndefined(form.village),
      vulnerability_level: form.vulnerability_level,
      whatsapp_phone: orUndefined(form.whatsapp_phone),
      ...(!isEdit && enroll.program_id
        ? { enrollment: enroll }
        : {}),
    };
    mutation.mutate(
      {
        method: "post",
        url: isEdit
          ? `/api/v1/beneficiaries/${id}/profile`
          : "/api/v1/beneficiaries",
        values: payload,
      },
      {
        onSuccess: ({ data }) => {
          const enrollmentError = data.enrollment?.error;
          if (enrollmentError) {
            window.alert(
              `Penerima tersimpan, tetapi pendaftaran program gagal: ${enrollmentError}`,
            );
          }
          show("beneficiaries", data.id);
        },
      },
    );
  };

  const toggleCategory = (value: string) =>
    set({
      beneficiary_categories: form.beneficiary_categories.includes(value)
        ? form.beneficiary_categories.filter((item) => item !== value)
        : [...form.beneficiary_categories, value],
    });

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Penerima manfaat"
        title={isEdit ? `Ubah profil ${form.display_name}` : "Tambah penerima manfaat"}
        description="Isi sebanyak mungkin agar asesmen dan penyaluran tepat sasaran. Kolom bertanda * wajib; sisanya dapat dilengkapi kemudian."
        actions={
          <Button
            variant="outline"
            onClick={() => (isEdit && id ? show("beneficiaries", id) : list("beneficiaries"))}
          >
            <ArrowLeft aria-hidden size={16} /> Kembali
          </Button>
        }
      />
      {mutation.mutation.isError ? (
        <ErrorState
          title="Data penerima belum tersimpan"
          description={mutation.mutation.error?.message ?? "Periksa kembali isian."}
        />
      ) : null}

      <form onSubmit={submit}>
        <FormSection title="1. Data diri">
          <div className="form-grid">
            <Field id="contact_type" label="Jenis penerima *">
              <select
                id="contact_type"
                value={form.contact_type}
                onChange={(event) =>
                  set({
                    beneficiary_type:
                      event.target.value === "institution" ? "institution" : form.beneficiary_type === "institution" ? "individual" : form.beneficiary_type,
                    contact_type: event.target.value,
                  })
                }
              >
                <option value="person">Perorangan / keluarga</option>
                <option value="institution">Lembaga (masjid, pesantren, sekolah)</option>
              </select>
            </Field>
            <Field id="display_name" label="Nama lengkap *">
              <input id="display_name" minLength={2} required value={form.display_name} onChange={text("display_name")} />
            </Field>
            {form.contact_type === "person" ? (
              <>
                <Field id="gender" label="Jenis kelamin">
                  <OptionSelect id="gender" labels={genderLabels} value={form.gender} onChange={(value) => set({ gender: value })} />
                </Field>
                <Field id="birth_place" label="Tempat lahir">
                  <input id="birth_place" value={form.birth_place} onChange={text("birth_place")} />
                </Field>
                <Field id="birth_date" label="Tanggal lahir">
                  <input id="birth_date" type="date" value={form.birth_date} onChange={text("birth_date")} />
                </Field>
              </>
            ) : null}
            <CanAccess action="manage" resource="crm_sensitive_identities">
              <Field
                hint={
                  savedIdentity("nik")
                    ? `Tersimpan ••••${savedIdentity("nik")?.identity_last4}. Kosongkan bila tidak diganti.`
                    : "Hanya 4 digit terakhir yang disimpan; dipakai untuk mencegah data ganda."
                }
                id="nik"
                label="NIK (16 digit)"
              >
                <input id="nik" inputMode="numeric" maxLength={16} pattern="\d{16}" value={form.nik} onChange={text("nik")} />
              </Field>
              <Field
                hint={
                  savedIdentity("family_card")
                    ? `Tersimpan ••••${savedIdentity("family_card")?.identity_last4}.`
                    : "Opsional."
                }
                id="family_card_number"
                label="Nomor KK (16 digit)"
              >
                <input id="family_card_number" inputMode="numeric" maxLength={16} pattern="\d{16}" value={form.family_card_number} onChange={text("family_card_number")} />
              </Field>
            </CanAccess>
          </div>
        </FormSection>

        <FormSection title="2. Kontak & alamat">
          <div className="form-grid">
            <Field id="primary_phone" label="Telepon">
              <input id="primary_phone" inputMode="tel" value={form.primary_phone} onChange={text("primary_phone")} />
            </Field>
            <Field id="whatsapp_phone" label="WhatsApp">
              <input id="whatsapp_phone" inputMode="tel" value={form.whatsapp_phone} onChange={text("whatsapp_phone")} />
            </Field>
            <Field id="primary_email" label="Email">
              <input id="primary_email" type="email" value={form.primary_email} onChange={text("primary_email")} />
            </Field>
            <Field id="address_line" label="Alamat" wide>
              <textarea id="address_line" rows={2} value={form.address_line} onChange={text("address_line")} />
            </Field>
            <Field id="village" label="Desa / kelurahan">
              <input id="village" value={form.village} onChange={text("village")} />
            </Field>
            <Field id="district" label="Kecamatan">
              <input id="district" value={form.district} onChange={text("district")} />
            </Field>
            <Field id="city" label="Kota / kabupaten">
              <input id="city" value={form.city} onChange={text("city")} />
            </Field>
            <Field id="province" label="Provinsi">
              <input id="province" value={form.province} onChange={text("province")} />
            </Field>
            <Field id="postal_code" label="Kode pos">
              <input id="postal_code" inputMode="numeric" value={form.postal_code} onChange={text("postal_code")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="3. Kondisi sosial-ekonomi">
          <div className="form-grid">
            <Field id="beneficiary_type" label="Bentuk penerima">
              <OptionSelect id="beneficiary_type" labels={beneficiaryTypeLabels} value={form.beneficiary_type} onChange={(value) => set({ beneficiary_type: value })} />
            </Field>
            <Field id="household_size" label={form.contact_type === "institution" ? "Jumlah jiwa terlayani" : "Jumlah anggota keluarga"}>
              <input id="household_size" min={1} type="number" value={form.household_size} onChange={text("household_size")} />
            </Field>
            <Field id="dependents_count" label="Jumlah tanggungan">
              <input id="dependents_count" min={0} type="number" value={form.dependents_count} onChange={text("dependents_count")} />
            </Field>
            {form.contact_type === "person" ? (
              <>
                <Field id="marital_status" label="Status perkawinan">
                  <OptionSelect empty="Belum diisi" id="marital_status" labels={maritalStatusLabels} value={form.marital_status} onChange={(value) => set({ marital_status: value })} />
                </Field>
                <Field id="education_level" label="Pendidikan terakhir">
                  <OptionSelect empty="Belum diisi" id="education_level" labels={educationLabels} value={form.education_level} onChange={(value) => set({ education_level: value })} />
                </Field>
                <Field id="occupation" label="Pekerjaan">
                  <input id="occupation" value={form.occupation} onChange={text("occupation")} />
                </Field>
              </>
            ) : null}
            <Field id="income_range" label="Rentang penghasilan">
              <OptionSelect id="income_range" labels={incomeRangeLabels} value={form.income_range} onChange={(value) => set({ income_range: value })} />
            </Field>
            <Field id="monthly_income" label="Penghasilan per bulan (Rp)">
              <input id="monthly_income" inputMode="decimal" value={form.monthly_income} onChange={text("monthly_income")} />
            </Field>
            <Field id="housing_status" label="Status tempat tinggal">
              <OptionSelect empty="Belum diisi" id="housing_status" labels={housingLabels} value={form.housing_status} onChange={(value) => set({ housing_status: value })} />
            </Field>
            {form.contact_type === "person" ? (
              <Field id="disability_status" label="Disabilitas">
                <OptionSelect empty="Belum diisi" id="disability_status" labels={disabilityLabels} value={form.disability_status} onChange={(value) => set({ disability_status: value })} />
              </Field>
            ) : null}
            <Field id="health_notes" label="Catatan kesehatan" wide>
              <textarea id="health_notes" rows={2} value={form.health_notes} onChange={text("health_notes")} />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="4. Kategori & kelayakan"
          description="Kategori dan asnaf memudahkan penyaringan penerima untuk program zakat, wakaf, dan donasi tertentu."
        >
          <div className="form-grid">
            <Field id="vulnerability_level" label="Tingkat kerentanan *">
              <OptionSelect id="vulnerability_level" labels={vulnerabilityLabels} value={form.vulnerability_level} onChange={(value) => set({ vulnerability_level: value })} />
            </Field>
            <Field id="asnaf_category" label="Asnaf (untuk zakat)">
              <OptionSelect empty="Bukan/ belum ditentukan" id="asnaf_category" labels={asnafLabels} value={form.asnaf_category} onChange={(value) => set({ asnaf_category: value })} />
            </Field>
            <Field id="assessment_status" label="Status asesmen">
              <OptionSelect id="assessment_status" labels={assessmentStatusLabels} value={form.assessment_status} onChange={(value) => set({ assessment_status: value })} />
            </Field>
            <Field id="status" label="Status penerima">
              <OptionSelect id="status" labels={beneficiaryStatusLabels} value={form.status} onChange={(value) => set({ status: value })} />
            </Field>
            <Field id="referral_partner_contact_id" label="Lembaga pendamping / perujuk">
              <select id="referral_partner_contact_id" value={form.referral_partner_contact_id} onChange={text("referral_partner_contact_id")}>
                <option value="">Tidak ada</option>
                {(partners.result?.data ?? []).map((partner) => (
                  <option key={partner.$id} value={partner.$id}>
                    {partner.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="auth-field auth-field--wide">
              <Label>Kategori penerima (boleh lebih dari satu)</Label>
              <div className="flex flex-wrap gap-2">
                {optionsOf(beneficiaryCategoryLabels).map((option) => (
                  <label
                    className="choice-card !p-2"
                    data-selected={form.beneficiary_categories.includes(option.value)}
                    key={option.value}
                  >
                    <input
                      checked={form.beneficiary_categories.includes(option.value)}
                      type="checkbox"
                      onChange={() => toggleCategory(option.value)}
                    />
                    <strong className="text-sm">{option.label}</strong>
                  </label>
                ))}
              </div>
            </div>
            <Field id="eligibility_notes" label="Catatan kelayakan" wide>
              <textarea id="eligibility_notes" rows={3} value={form.eligibility_notes} onChange={text("eligibility_notes")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="5. Wali & kontak darurat" description="Wajib untuk anak yatim, lansia, atau penerima yang membutuhkan pendamping.">
          <div className="form-grid">
            <Field id="guardian_name" label="Nama wali">
              <input id="guardian_name" value={form.guardian_name} onChange={text("guardian_name")} />
            </Field>
            <Field id="guardian_relation" label="Hubungan">
              <input id="guardian_relation" placeholder="Mis. ibu, paman, pengasuh" value={form.guardian_relation} onChange={text("guardian_relation")} />
            </Field>
            <Field id="guardian_phone" label="Telepon wali">
              <input id="guardian_phone" inputMode="tel" value={form.guardian_phone} onChange={text("guardian_phone")} />
            </Field>
            <Field id="emergency_contact_name" label="Kontak darurat">
              <input id="emergency_contact_name" value={form.emergency_contact_name} onChange={text("emergency_contact_name")} />
            </Field>
            <Field id="emergency_contact_phone" label="Telepon darurat">
              <input id="emergency_contact_phone" inputMode="tel" value={form.emergency_contact_phone} onChange={text("emergency_contact_phone")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="6. Rekening penyaluran (opsional)" description="Dipakai bila bantuan dikirim melalui transfer. Nomor rekening disamarkan bagi petugas tanpa izin data sensitif.">
          <div className="form-grid">
            <Field id="bank_name" label="Nama bank">
              <input id="bank_name" value={form.bank_name} onChange={text("bank_name")} />
            </Field>
            <Field
              hint={isEdit && detailData && !detailData.sensitive_visible && detailData.profile?.bank_account_number ? `Tersimpan ${detailData.profile.bank_account_number}. Kosongkan bila tidak diganti.` : undefined}
              id="bank_account_number"
              label="Nomor rekening"
            >
              <input id="bank_account_number" inputMode="numeric" value={form.bank_account_number} onChange={text("bank_account_number")} />
            </Field>
            <Field id="bank_account_holder" label="Atas nama">
              <input id="bank_account_holder" value={form.bank_account_holder} onChange={text("bank_account_holder")} />
            </Field>
          </div>
        </FormSection>

        {!isEdit ? (
          <CanAccess action="manage" resource="applications">
            <FormSection
              title="7. Daftarkan ke program (opsional)"
              description="Sistem membuat draft pengajuan bantuan untuk penerima ini sehingga langsung masuk alur seleksi program."
            >
              <div className="form-grid">
                <Field id="enroll_program" label="Program aktif">
                  <select id="enroll_program" value={enroll.program_id} onChange={(event) => setEnroll((value) => ({ ...value, program_id: event.target.value }))}>
                    <option value="">Tidak didaftarkan sekarang</option>
                    {(programs.result?.data ?? []).map((program) => (
                      <option key={program.$id} value={program.$id}>
                        {program.code} — {program.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {enroll.program_id ? (
                  <Field id="enroll_support" label="Kebutuhan yang diajukan *" wide>
                    <textarea id="enroll_support" minLength={10} required rows={3} value={enroll.requested_support} onChange={(event) => setEnroll((value) => ({ ...value, requested_support: event.target.value }))} />
                  </Field>
                ) : null}
              </div>
            </FormSection>
          </CanAccess>
        ) : null}

        <div className="form-actions">
          <Button type="submit" disabled={mutation.mutation.isPending}>
            <Save aria-hidden size={16} />
            {mutation.mutation.isPending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Simpan penerima"}
          </Button>
        </div>
      </form>
    </section>
  );
}
