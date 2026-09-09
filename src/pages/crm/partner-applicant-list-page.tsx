import { useMemo, useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Plus, Send, Eye } from "lucide-react";
import { useNavigate } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { ContactRoleBadges } from "@/features/crm/components/contact-role-badges";
import {
  isPartnerRole,
  partnerPartyLabel,
  partnerPartyType,
  type PartnerRoleType,
} from "@/features/crm/partner-contact";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  CrmContactRolesDocument,
  CrmContactsDocument,
  CrmInstitutionProfilesDocument,
} from "@/generated/neon/models";

type PartnerView = "all" | PartnerRoleType;

export function PartnerApplicantListPage() {
  const { activeOrganization } = useOrganization();
  const { show } = useNavigation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PartnerView>("all");
  const activeOrgId = activeOrganization?.organization.$id;
  const organizationFilters: CrudFilters = activeOrgId
    ? [{ field: "organization_id", operator: "eq", value: activeOrgId }]
    : [];

  const contactQuery = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: organizationFilters,
    sorters: [{ field: "$createdAt", order: "desc" }],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
    queryOptions: { enabled: !!activeOrgId },
  });
  const roleQuery = useList<CrmContactRolesDocument>({
    resource: "crm_contact_roles",
    filters: [
      ...organizationFilters,
      {
        field: "role_type",
        operator: "in",
        value: ["distribution_partner", "applicant"],
      },
      { field: "status", operator: "eq", value: "active" },
    ],
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
    queryOptions: { enabled: !!activeOrgId },
  });
  const institutionQuery = useList<CrmInstitutionProfilesDocument>({
    resource: "crm_institution_profiles",
    filters: organizationFilters,
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
    queryOptions: { enabled: !!activeOrgId },
  });

  const rolesByContact = useMemo(() => {
    const map = new Map<string, CrmContactRolesDocument[]>();
    for (const role of roleQuery.result?.data ?? []) {
      if (!isPartnerRole(role)) {
        continue;
      }

      const roles = map.get(role.contact_id) ?? [];
      roles.push(role);
      map.set(role.contact_id, roles);
    }
    return map;
  }, [roleQuery.result?.data]);
  const institutionByContact = useMemo(
    () =>
      new Map(
        (institutionQuery.result?.data ?? []).map((profile) => [
          profile.contact_id,
          profile,
        ]),
      ),
    [institutionQuery.result?.data],
  );
  const contacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (contactQuery.result?.data ?? []).filter((contact) => {
      const roles = rolesByContact.get(contact.$id) ?? [];
      if (
        roles.length === 0 ||
        (view !== "all" && !roles.some((role) => role.role_type === view))
      ) {
        return false;
      }

      return (
        !query ||
        contact.display_name.toLowerCase().includes(query) ||
        contact.primary_phone?.toLowerCase().includes(query) ||
        contact.primary_email?.toLowerCase().includes(query) ||
        contact.city?.toLowerCase().includes(query)
      );
    });
  }, [contactQuery.result?.data, rolesByContact, search, view]);

  const columns: ResourceTableColumn<CrmContactsDocument>[] = [
    {
      header: "Pihak",
      key: "display_name",
      render: (contact) => (
        <div className="crm-contact-cell">
          <strong>{contact.display_name}</strong>
          <small>
            {partnerPartyLabel(
              partnerPartyType(contact, institutionByContact.get(contact.$id)),
            )}
          </small>
        </div>
      ),
    },
    {
      header: "Peran aktif",
      key: "roles",
      render: (contact) => (
        <ContactRoleBadges roles={rolesByContact.get(contact.$id) ?? []} />
      ),
    },
    {
      header: "Komunikasi",
      key: "communication",
      render: (contact) => (
        <div className="crm-contact-cell">
          <span>{contact.primary_phone || "-"}</span>
          <small>{contact.primary_email || "Email belum diisi"}</small>
        </div>
      ),
    },
    {
      header: "Wilayah",
      key: "region",
      render: (contact) => contact.city || contact.district || "-",
    },
    {
      header: "Profil institusi",
      key: "profile",
      render: (contact) =>
        contact.contact_type === "person" ? (
          <StatusBadge tone="neutral">Tidak diperlukan</StatusBadge>
        ) : institutionByContact.has(contact.$id) ? (
          <StatusBadge tone="success">Tercatat</StatusBadge>
        ) : (
          <StatusBadge tone="warning">Belum dilengkapi</StatusBadge>
        ),
    },
  ];

  if (
    contactQuery.query.isError ||
    roleQuery.query.isError ||
    institutionQuery.query.isError
  ) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="CRM"
          title="Mitra penyaluran & pengaju"
          description="Kelola pihak lembaga, komunitas, atau individu tanpa menduplikasi contact master."
        />
        <ErrorState
          title="Data mitra dan pengaju belum dapat dimuat"
          onRetry={() => {
            void contactQuery.query.refetch();
            void roleQuery.query.refetch();
            void institutionQuery.query.refetch();
          }}
        />
      </section>
    );
  }

  return (
    <section
      className="workspace-page"
      aria-labelledby="partner-applicant-list-title"
    >
      <PageHeader
        eyebrow="CRM · PARTNERSHIP"
        title="Mitra penyaluran & pengaju"
        description="Satu contact master dapat berperan sebagai mitra penyaluran, pengaju bantuan, atau keduanya."
        actions={
          <>
            <ProtectedActionButton
              action="manage"
              resource="crm_contact_roles"
              variant="outline"
              onClick={() => navigate("/crm/contacts/new?role=applicant")}
            >
              <Send aria-hidden="true" size={16} />
              Tambah pengaju
            </ProtectedActionButton>
            <ProtectedActionButton
              action="manage"
              resource="crm_contact_roles"
              onClick={() =>
                navigate("/crm/contacts/new?role=distribution_partner")
              }
            >
              <Plus aria-hidden="true" size={16} />
              Tambah mitra
            </ProtectedActionButton>
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Cari nama, telepon, email, atau wilayah"
        searchValue={search}
        onSearchChange={setSearch}
      >
        <label className="sr-only" htmlFor="partner-role-filter">
          Filter peran
        </label>
        <select
          id="partner-role-filter"
          value={view}
          onChange={(event) => setView(event.target.value as PartnerView)}
        >
          <option value="all">Semua peran</option>
          <option value="distribution_partner">Mitra penyaluran</option>
          <option value="applicant">Pengaju bantuan</option>
        </select>
      </FilterBar>
      <ResourceTable
        columns={columns}
        getRowId={(contact) => contact.$id}
        isLoading={
          contactQuery.query.isLoading ||
          roleQuery.query.isLoading ||
          institutionQuery.query.isLoading
        }
        items={contacts}
        empty={
          <EmptyState
            title="Belum ada mitra atau pengaju"
            description="Tambahkan pihak baru sebagai contact master, lalu tetapkan perannya."
            action={
              <ProtectedActionButton
                action="manage"
                resource="crm_contact_roles"
                onClick={() =>
                  navigate("/crm/contacts/new?role=distribution_partner")
                }
              >
                Tambah mitra
              </ProtectedActionButton>
            }
          />
        }
        rowActions={(contact) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("crm_contacts", contact.$id)}
          >
            <Eye aria-hidden="true" size={16} />
            Detail
          </Button>
        )}
      />
    </section>
  );
}
