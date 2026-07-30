import { useEffect, useMemo } from "react";
import {
  useCreate,
  useList,
  useNavigation,
  useOne,
  useUpdate,
  type CrudFilters,
} from "@refinedev/core";
import { useParams } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";

import {
  DetailSection,
  FormSection,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DuplicateWarning } from "@/features/crm/components/duplicate-warning";
import {
  findDuplicateCandidates,
  normalizeContactText,
  normalizePhone,
} from "@/features/crm/contact-rules";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  CrmContactRolesDocument,
  CrmContactsDocument,
} from "@/generated/neon/models";

type ContactFormValues = {
  address_line?: string;
  city?: string;
  contact_type: CrmContactsDocument["contact_type"];
  display_name: string;
  district?: string;
  gender?: CrmContactsDocument["gender"];
  is_beneficiary?: boolean;
  is_donor?: boolean;
  is_kafil?: boolean;
  is_volunteer?: boolean;
  legal_name?: string;
  notes?: string;
  primary_email?: string;
  primary_phone?: string;
  province?: string;
  village?: string;
  whatsapp_phone?: string;
};

const roleFields = [
  ["is_donor", "donor", "Donatur"],
  ["is_kafil", "kafil", "Kafil"],
  ["is_volunteer", "volunteer", "Relawan"],
  ["is_beneficiary", "beneficiary", "Penerima"],
] as const;

export function ContactFormPage() {
  const { id } = useParams();
  const { activeOrganization, user } = useOrganization();
  const { list, show } = useNavigation();
  const isEdit = !!id;
  const activeOrgId = activeOrganization?.organization.$id;
  const { mutate: createContact, mutation: createContactMutation } =
    useCreate<CrmContactsDocument>();
  const { mutate: updateContact, mutation: updateContactMutation } =
    useUpdate<CrmContactsDocument>();
  const { mutate: createRole } = useCreate<CrmContactRolesDocument>();
  const contactQuery = useOne<CrmContactsDocument>({
    resource: "crm_contacts",
    id: id ?? "",
    queryOptions: { enabled: isEdit },
  });
  const contactFilters: CrudFilters = activeOrgId
    ? [{ field: "organization_id", operator: "eq", value: activeOrgId }]
    : [];
  const contactsQuery = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: contactFilters,
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
    queryOptions: { enabled: !!activeOrgId },
  });

  const { control, handleSubmit, register, reset } = useForm<ContactFormValues>(
    {
      defaultValues: {
        contact_type: "person",
        display_name: "",
        gender: "unknown",
        is_beneficiary: false,
        is_donor: false,
        is_kafil: false,
        is_volunteer: false,
        status: "active",
      } as ContactFormValues,
    },
  );
  const watched = useWatch({ control });
  useEffect(() => {
    const contact = contactQuery.result;
    if (!contact) {
      return;
    }

    reset({
      address_line: contact.address_line ?? "",
      city: contact.city ?? "",
      contact_type: contact.contact_type,
      display_name: contact.display_name,
      district: contact.district ?? "",
      gender: contact.gender ?? "unknown",
      legal_name: contact.legal_name ?? "",
      notes: contact.notes ?? "",
      primary_email: contact.primary_email ?? "",
      primary_phone: contact.primary_phone ?? "",
      province: contact.province ?? "",
      village: contact.village ?? "",
      whatsapp_phone: contact.whatsapp_phone ?? "",
    });
  }, [contactQuery.result, reset]);
  const duplicateCandidates = useMemo(
    () =>
      findDuplicateCandidates(
        {
          city: watched.city ?? "",
          display_name: watched.display_name ?? "",
          normalized_email: normalizeContactText(watched.primary_email),
          normalized_name: normalizeContactText(watched.display_name),
          normalized_phone: normalizePhone(watched.primary_phone),
          primary_email: watched.primary_email ?? "",
          primary_phone: watched.primary_phone ?? "",
        },
        (contactsQuery.result?.data ?? []) as CrmContactsDocument[],
      ),
    [
      contactsQuery.result?.data,
      watched.city,
      watched.display_name,
      watched.primary_email,
      watched.primary_phone,
    ],
  );

  const onSubmit: SubmitHandler<ContactFormValues> = (values) => {
    if (!activeOrgId) {
      return;
    }

    const contactValues = {
      address_line: values.address_line,
      city: values.city,
      contact_type: values.contact_type,
      created_by: user?.$id,
      display_name: values.display_name,
      district: values.district,
      gender: values.gender,
      legal_name: values.legal_name,
      normalized_email: normalizeContactText(values.primary_email),
      normalized_name: normalizeContactText(values.display_name),
      normalized_phone: normalizePhone(values.primary_phone),
      notes: values.notes,
      organization_id: activeOrgId,
      primary_email: values.primary_email,
      primary_phone: values.primary_phone,
      province: values.province,
      status: "active",
      village: values.village,
      whatsapp_phone: values.whatsapp_phone,
    };

    if (isEdit && id) {
      updateContact(
        {
          id,
          resource: "crm_contacts",
          values: contactValues,
        },
        { onSuccess: () => show("crm_contacts", id) },
      );
      return;
    }

    createContact(
      {
        resource: "crm_contacts",
        values: contactValues,
      },
      {
        onSuccess: ({ data }) => {
          for (const [field, roleType] of roleFields) {
            if (values[field]) {
              createRole({
                resource: "crm_contact_roles",
                values: {
                  contact_id: data.$id,
                  created_by: user?.$id,
                  organization_id: activeOrgId,
                  role_type: roleType,
                  status: "active",
                  started_at: new Date().toISOString(),
                },
              });
            }
          }
          show("crm_contacts", data.$id);
        },
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="contact-form-title">
      <PageHeader
        eyebrow="CRM"
        title={isEdit ? "Edit contact master" : "Tambah contact master"}
        description="Satu orang atau institusi dibuat sebagai satu contact master. Peran dapat lebih dari satu."
        actions={
          <Button variant="outline" onClick={() => list("crm_contacts")}>
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />

      <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
        <DuplicateWarning candidates={duplicateCandidates} />

        <FormSection
          title="Identitas contact master"
          description="Nomor identitas resmi tidak disimpan di bagian ini dan tidak tampil pada daftar umum."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="contact_type">Tipe kontak</Label>
              <select id="contact_type" {...register("contact_type")}>
                <option value="person">Orang</option>
                <option value="institution">Institusi</option>
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="display_name">Nama tampil</Label>
              <Input
                id="display_name"
                {...register("display_name", { required: true })}
                placeholder="Nama yang dipakai petugas"
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="legal_name">Nama legal</Label>
              <Input id="legal_name" {...register("legal_name")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" {...register("gender")}>
                <option value="unknown">Tidak dicatat</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Peran kontak">
          <div className="crm-role-picker">
            {roleFields.map(([field, , label]) => (
              <label key={field}>
                <input type="checkbox" {...register(field)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="Komunikasi dan alamat">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="primary_phone">Telepon utama</Label>
              <Input id="primary_phone" {...register("primary_phone")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="whatsapp_phone">WhatsApp</Label>
              <Input id="whatsapp_phone" {...register("whatsapp_phone")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="primary_email">Email</Label>
              <Input
                id="primary_email"
                type="email"
                {...register("primary_email")}
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="address_line">Alamat</Label>
              <Input id="address_line" {...register("address_line")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="village">Desa/Kelurahan</Label>
              <Input id="village" {...register("village")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="district">Kecamatan</Label>
              <Input id="district" {...register("district")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="city">Kota/Kabupaten</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="auth-field">
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" {...register("province")} />
            </div>
          </div>
        </FormSection>

        <DetailSection title="Identitas sensitif">
          <p>
            NIK, paspor, atau nomor pajak disimpan pada collection terpisah
            `crm_sensitive_identities` melalui workflow yang memiliki permission
            khusus. Form ini tidak menyimpan nomor identitas penuh.
          </p>
          <StatusBadge tone="info">
            Nomor identitas tidak tampil di daftar umum
          </StatusBadge>
        </DetailSection>

        <div className="form-section__footer">
          <Button
            type="button"
            variant="outline"
            onClick={() => list("crm_contacts")}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={
              createContactMutation?.isPending ||
              updateContactMutation?.isPending
            }
          >
            <Save aria-hidden="true" size={16} />
            {createContactMutation?.isPending ||
            updateContactMutation?.isPending
              ? "Menyimpan..."
              : "Simpan kontak"}
          </Button>
        </div>
      </form>
    </section>
  );
}
