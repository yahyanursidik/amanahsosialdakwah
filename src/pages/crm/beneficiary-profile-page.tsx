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
  CrmBeneficiaryProfilesDocument,
  CrmContactsDocument,
} from "@/generated/neon/models";

type BeneficiaryFormValues = {
  assessment_status: CrmBeneficiaryProfilesDocument["assessment_status"];
  beneficiary_type: CrmBeneficiaryProfilesDocument["beneficiary_type"];
  eligibility_notes?: string;
  household_size?: number;
  income_range?: CrmBeneficiaryProfilesDocument["income_range"];
  vulnerability_level: CrmBeneficiaryProfilesDocument["vulnerability_level"];
};

export function BeneficiaryProfilePage() {
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
  const profileQuery = useList<CrmBeneficiaryProfilesDocument>({
    resource: "crm_beneficiary_profiles",
    filters: profileFilters,
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const { mutate: createProfile, mutation } =
    useCreate<CrmBeneficiaryProfilesDocument>();
  const { handleSubmit, register } = useForm<BeneficiaryFormValues>({
    defaultValues: {
      assessment_status: "not_assessed",
      beneficiary_type: "individual",
      income_range: "unknown",
      vulnerability_level: "medium",
    },
  });
  const profile = (profileQuery.result?.data ?? [])[0] as
    CrmBeneficiaryProfilesDocument | undefined;

  const onSubmit: SubmitHandler<BeneficiaryFormValues> = (values) => {
    if (!activeOrgId || !contactId || profile) {
      return;
    }

    createProfile({
      resource: "crm_beneficiary_profiles",
      values: {
        ...values,
        contact_id: contactId,
        created_by: user?.$id,
        organization_id: activeOrgId,
        status: "active",
      },
    });
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="CRM"
        title="Beneficiary profile"
        description={
          contactQuery.result?.display_name ?? "Profil penerima manfaat"
        }
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
          title="Profil penerima"
          items={[
            { label: "Tipe", value: profile.beneficiary_type },
            { label: "Kerentanan", value: profile.vulnerability_level },
            { label: "Status asesmen", value: profile.assessment_status },
            {
              label: "Status",
              value: <StatusBadge tone="success">{profile.status}</StatusBadge>,
            },
          ]}
        >
          <p>
            {profile.eligibility_notes || "Catatan kelayakan belum tersedia."}
          </p>
        </DetailSection>
      ) : (
        <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
          <FormSection title="Buat beneficiary profile">
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="beneficiary_type">Tipe penerima</Label>
                <select id="beneficiary_type" {...register("beneficiary_type")}>
                  <option value="individual">Individu</option>
                  <option value="family">Keluarga</option>
                  <option value="institution">Institusi</option>
                  <option value="community">Komunitas</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="vulnerability_level">Level kerentanan</Label>
                <select
                  id="vulnerability_level"
                  {...register("vulnerability_level")}
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                  <option value="critical">Kritis</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="household_size">Jumlah anggota keluarga</Label>
                <Input
                  id="household_size"
                  type="number"
                  min={0}
                  {...register("household_size", { valueAsNumber: true })}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="assessment_status">Status asesmen</Label>
                <select
                  id="assessment_status"
                  {...register("assessment_status")}
                >
                  <option value="not_assessed">Belum asesmen</option>
                  <option value="in_review">Dalam review</option>
                  <option value="eligible">Layak</option>
                  <option value="not_eligible">Tidak layak</option>
                  <option value="expired">Kedaluwarsa</option>
                </select>
              </div>
            </div>
            <div className="auth-field">
              <Label htmlFor="eligibility_notes">Catatan kelayakan</Label>
              <textarea
                id="eligibility_notes"
                rows={4}
                {...register("eligibility_notes")}
              />
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
