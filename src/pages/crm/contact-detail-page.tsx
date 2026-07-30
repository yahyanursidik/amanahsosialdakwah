import { Link, useParams } from "react-router";
import {
  useList,
  useNavigation,
  useOne,
  type CrudFilters,
} from "@refinedev/core";
import { Edit, ShieldAlert } from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ApprovalTimeline,
  DetailSection,
  EmptyState,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ApprovalTimelineItem,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { ContactRoleBadges } from "@/features/crm/components/contact-role-badges";
import { ContactStatusBadge } from "@/features/crm/components/contact-status-badge";
import { DuplicateWarning } from "@/features/crm/components/duplicate-warning";
import type { ContactDuplicateCandidate } from "@/features/crm/contact-rules";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  CrmBeneficiaryProfilesDocument,
  CrmConsentsDocument,
  CrmContactRolesDocument,
  CrmContactsDocument,
  CrmDuplicateCandidatesDocument,
  CrmInstitutionProfilesDocument,
  CrmInteractionsDocument,
  CrmSensitiveIdentitiesDocument,
} from "@/generated/neon/models";

const interactionColumns: ResourceTableColumn<CrmInteractionsDocument>[] = [
  {
    header: "Waktu",
    key: "occurred_at",
    render: (item) =>
      new Date(item.occurred_at ?? item.$createdAt).toLocaleString("id-ID"),
  },
  {
    header: "Kanal",
    key: "interaction_type",
    render: (item) => item.interaction_type,
  },
  {
    header: "Ringkasan",
    key: "summary",
    render: (item) => item.summary,
  },
];

function consentTimeline(items: CrmConsentsDocument[]): ApprovalTimelineItem[] {
  if (items.length === 0) {
    return [
      {
        description: "Consent dokumentasi dan komunikasi belum dicatat.",
        status: "waiting",
        title: "Consent belum tersedia",
      },
    ];
  }

  return items.map((item) => ({
    actor: item.channel,
    description: item.notes ?? item.consent_type,
    status: item.status === "granted" ? "approved" : "rejected",
    time: new Date(item.consented_at ?? item.$createdAt).toLocaleDateString(
      "id-ID",
    ),
    title: item.consent_type,
  }));
}

export function ContactDetailPage() {
  const { id } = useParams();
  const { edit } = useNavigation();
  const { activeOrganization } = useOrganization();
  const activeOrgId = activeOrganization?.organization.$id;
  const contactId = id ?? "";
  const scopedFilters: CrudFilters = activeOrgId
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
  const rolesQuery = useList<CrmContactRolesDocument>({
    resource: "crm_contact_roles",
    filters: scopedFilters,
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const beneficiaryQuery = useList<CrmBeneficiaryProfilesDocument>({
    resource: "crm_beneficiary_profiles",
    filters: scopedFilters,
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const institutionQuery = useList<CrmInstitutionProfilesDocument>({
    resource: "crm_institution_profiles",
    filters: scopedFilters,
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const interactionsQuery = useList<CrmInteractionsDocument>({
    resource: "crm_interactions",
    filters: scopedFilters,
    sorters: [{ field: "occurred_at", order: "desc" }],
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const consentsQuery = useList<CrmConsentsDocument>({
    resource: "crm_consents",
    filters: scopedFilters,
    sorters: [{ field: "consented_at", order: "desc" }],
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const sensitiveIdentityQuery = useList<CrmSensitiveIdentitiesDocument>({
    resource: "crm_sensitive_identities",
    filters: scopedFilters,
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });
  const duplicateQuery = useList<CrmDuplicateCandidatesDocument>({
    resource: "crm_duplicate_candidates",
    filters: activeOrgId
      ? [
          { field: "organization_id", operator: "eq", value: activeOrgId },
          { field: "primary_contact_id", operator: "eq", value: contactId },
          { field: "status", operator: "eq", value: "open" },
        ]
      : [],
    queryOptions: { enabled: !!activeOrgId && !!contactId },
  });

  const contact = contactQuery.result;
  const roles = (rolesQuery.result?.data ?? []) as CrmContactRolesDocument[];
  const beneficiary = (beneficiaryQuery.result?.data ?? [])[0] as
    CrmBeneficiaryProfilesDocument | undefined;
  const institution = (institutionQuery.result?.data ?? [])[0] as
    CrmInstitutionProfilesDocument | undefined;
  const identities = (sensitiveIdentityQuery.result?.data ??
    []) as CrmSensitiveIdentitiesDocument[];
  const interactions = (interactionsQuery.result?.data ??
    []) as CrmInteractionsDocument[];
  const consents = (consentsQuery.result?.data ?? []) as CrmConsentsDocument[];
  const duplicateCandidates: ContactDuplicateCandidate[] = (
    (duplicateQuery.result?.data ?? []) as CrmDuplicateCandidatesDocument[]
  ).map((item) => ({
    contact: {
      ...contact,
      $id: item.duplicate_contact_id,
      display_name: item.duplicate_contact_id,
    } as CrmContactsDocument,
    reasons: item.match_reasons.split(",").map((reason) => reason.trim()),
    score: item.match_score ?? 0,
  }));

  if (contactQuery.query.isError) {
    return (
      <section className="workspace-page">
        <ErrorState
          title="Detail kontak belum dapat dimuat"
          onRetry={() => void contactQuery.query.refetch()}
        />
      </section>
    );
  }

  if (!contact) {
    return (
      <section className="workspace-page">
        <EmptyState title="Kontak tidak ditemukan" />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="contact-detail-title">
      <PageHeader
        eyebrow="CRM 360"
        title={contact.display_name}
        description="Ringkasan kontak lintas peran, consent, interaksi, dan profil penerima/institusi."
        meta={
          <>
            <ContactStatusBadge status={contact.status} />
            <ContactRoleBadges roles={roles} />
          </>
        }
        actions={
          <ProtectedActionButton
            action="manage"
            resource="crm_contacts"
            variant="outline"
            onClick={() => edit("crm_contacts", contact.$id)}
          >
            <Edit aria-hidden="true" size={16} />
            Edit kontak
          </ProtectedActionButton>
        }
      />

      <DuplicateWarning candidates={duplicateCandidates} />

      <div className="workspace-page__grid">
        <DetailSection
          title="Contact master"
          items={[
            { label: "Jenis", value: contact.contact_type },
            { label: "Telepon", value: contact.primary_phone || "-" },
            { label: "Email", value: contact.primary_email || "-" },
            {
              label: "Wilayah",
              value: contact.city || contact.district || "-",
            },
            {
              label: "Identitas sensitif",
              value:
                identities.length > 0 ? (
                  <StatusBadge tone="info">
                    {identities.length} dokumen tersimpan terpisah
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Belum dicatat</StatusBadge>
                ),
            },
          ]}
        />

        <DetailSection title="Profil peran">
          <div className="crm-profile-links">
            <Link to={`/crm/contacts/${contact.$id}/beneficiary`}>
              Beneficiary profile
              <StatusBadge tone={beneficiary ? "success" : "neutral"}>
                {beneficiary ? beneficiary.status : "Belum ada"}
              </StatusBadge>
            </Link>
            <Link to={`/crm/contacts/${contact.$id}/institution`}>
              Institution profile
              <StatusBadge tone={institution ? "success" : "neutral"}>
                {institution ? institution.status : "Belum ada"}
              </StatusBadge>
            </Link>
          </div>
        </DetailSection>
      </div>

      <DetailSection title="Consent dokumentasi dan komunikasi">
        <ApprovalTimeline items={consentTimeline(consents)} />
      </DetailSection>

      <DetailSection
        title="Interaction history"
        actions={
          <ProtectedActionButton
            action="manage"
            resource="crm_interactions"
            variant="outline"
            size="sm"
          >
            Catat interaksi
          </ProtectedActionButton>
        }
      >
        <ResourceTable
          columns={interactionColumns}
          getRowId={(item) => item.$id}
          isLoading={interactionsQuery.query.isLoading}
          items={interactions}
          empty={
            <EmptyState
              title="Belum ada interaksi"
              description="Riwayat komunikasi dasar akan muncul di sini."
            />
          }
        />
      </DetailSection>

      <DetailSection title="Workflow merge">
        <div className="duplicate-warning duplicate-warning--calm">
          <div className="duplicate-warning__head">
            <ShieldAlert aria-hidden="true" size={18} />
            <strong>Merge tidak otomatis</strong>
          </div>
          <p>
            Bila kontak ini terindikasi sama dengan kontak lain, petugas harus
            membuat merge request, mendapatkan approval, lalu hasilnya diaudit.
          </p>
          <Button variant="outline" disabled>
            Menunggu workflow approval
          </Button>
        </div>
      </DetailSection>
    </section>
  );
}
