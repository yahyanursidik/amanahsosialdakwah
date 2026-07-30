import { Link, useParams } from "react-router";
import { useCreate, useList, useOne, type CrudFilters } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import {
  DetailSection,
  FormSection,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  CrmContactsDocument,
  CrmInstitutionProfilesDocument,
} from "@/generated/neon/models";

type InstitutionFormValues = {
  contact_person_name?: string;
  contact_person_phone?: string;
  institution_code?: string;
  institution_type: CrmInstitutionProfilesDocument["institution_type"];
  registration_reference?: string;
};

export function InstitutionProfilePage() {
  const { id } = useParams();
  const { activeOrganization, user } = useOrganization();
  const activeOrgId = activeOrganization?.organization.$id;
  const contactId = id ?? "";
  const profileFilters: CrudFilters = activeOrgId
    ? [
        { field: "organization_id", operator: "eq", value: activeOrgId },
        { field: "contact_id", operator: "eq", value: contactId },
      ]
    : [];
  const contactQuery = useOne<CrmContactsDocument>({
    resource: "crm_contacts",
    id: contactId,
    queryOptions: { enabled: !!contactId },
  });
  const profileQuery = useList<CrmInstitutionProfilesDocument>({
    resource: "crm_institution_profiles",
    filters: profileFilters,
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const { mutate: createProfile, mutation } =
    useCreate<CrmInstitutionProfilesDocument>();
  const { handleSubmit, register } = useForm<InstitutionFormValues>({
    defaultValues: {
      institution_type: "foundation",
    },
  });
  const profile = (profileQuery.result?.data ?? [])[0] as
    CrmInstitutionProfilesDocument | undefined;

  const onSubmit: SubmitHandler<InstitutionFormValues> = (values) => {
    if (!activeOrgId || !contactId || profile) {
      return;
    }

    createProfile({
      resource: "crm_institution_profiles",
      values: {
        ...values,
        contact_id: contactId,
        created_by: user?.$id,
        organization_id: activeOrgId,
        status: "unverified",
      },
    });
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="CRM"
        title="Institution profile"
        description={contactQuery.result?.display_name ?? "Profil institusi"}
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            to={`/crm/contacts/${contactId}`}
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Detail 360
          </Link>
        }
      />

      {profile ? (
        <DetailSection
          title="Profil institusi"
          items={[
            { label: "Tipe", value: profile.institution_type },
            { label: "Kode", value: profile.institution_code || "-" },
            { label: "PIC", value: profile.contact_person_name || "-" },
            {
              label: "Status",
              value: <StatusBadge tone="info">{profile.status}</StatusBadge>,
            },
          ]}
        />
      ) : (
        <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
          <FormSection title="Buat institution profile">
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="institution_type">Tipe institusi</Label>
                <select id="institution_type" {...register("institution_type")}>
                  <option value="mosque">Masjid</option>
                  <option value="school">Sekolah</option>
                  <option value="foundation">Yayasan</option>
                  <option value="company">Perusahaan</option>
                  <option value="community">Komunitas</option>
                  <option value="government">Pemerintah</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="institution_code">Kode internal</Label>
                <Input
                  id="institution_code"
                  {...register("institution_code")}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="registration_reference">
                  Referensi registrasi
                </Label>
                <Input
                  id="registration_reference"
                  {...register("registration_reference")}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="contact_person_name">PIC</Label>
                <Input
                  id="contact_person_name"
                  {...register("contact_person_name")}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="contact_person_phone">Telepon PIC</Label>
                <Input
                  id="contact_person_phone"
                  {...register("contact_person_phone")}
                />
              </div>
            </div>
          </FormSection>
          <div className="form-section__footer">
            <Button type="submit" disabled={mutation?.isPending}>
              <Save aria-hidden="true" size={16} />
              Simpan profil
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
