import { useMemo, useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye, Plus } from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { ContactRoleBadges } from "@/features/crm/components/contact-role-badges";
import { ContactStatusBadge } from "@/features/crm/components/contact-status-badge";
import { useOrganization } from "@/features/organizations/organization-context";
import type {
  CrmContactRolesDocument,
  CrmContactsDocument,
} from "@/generated/neon/models";

export function ContactListPage() {
  const { activeOrganization } = useOrganization();
  const { create, show } = useNavigation();
  const [search, setSearch] = useState("");
  const activeOrgId = activeOrganization?.organization.$id;

  const filters: CrudFilters = activeOrgId
    ? [{ field: "organization_id", operator: "eq", value: activeOrgId }]
    : [];

  const { query, result } = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters,
    sorters: [{ field: "$createdAt", order: "desc" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: !!activeOrgId },
  });
  const roleQuery = useList<CrmContactRolesDocument>({
    resource: "crm_contact_roles",
    filters,
    pagination: { currentPage: 1, pageSize: 500, mode: "server" },
    queryOptions: { enabled: !!activeOrgId },
  });

  const rolesByContact = useMemo(() => {
    const map = new Map<string, CrmContactRolesDocument[]>();
    for (const role of (roleQuery.result?.data ??
      []) as CrmContactRolesDocument[]) {
      const current = map.get(role.contact_id) ?? [];
      current.push(role);
      map.set(role.contact_id, current);
    }
    return map;
  }, [roleQuery.result?.data]);

  const contacts = ((result?.data ?? []) as CrmContactsDocument[]).filter(
    (contact) => {
      if (!search.trim()) {
        return true;
      }

      const queryText = search.toLowerCase();
      return (
        contact.display_name.toLowerCase().includes(queryText) ||
        contact.primary_phone?.toLowerCase().includes(queryText) ||
        contact.primary_email?.toLowerCase().includes(queryText) ||
        contact.city?.toLowerCase().includes(queryText)
      );
    },
  );

  const columns: ResourceTableColumn<CrmContactsDocument>[] = [
    {
      header: "Kontak",
      key: "display_name",
      render: (contact) => (
        <div className="crm-contact-cell">
          <strong>{contact.display_name}</strong>
          <small>
            {contact.contact_type === "person" ? "Orang" : "Institusi"}
          </small>
        </div>
      ),
    },
    {
      header: "Peran",
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
          <small>{contact.primary_email || "Email belum ada"}</small>
        </div>
      ),
    },
    {
      header: "Wilayah",
      key: "region",
      render: (contact) => contact.city || contact.district || "-",
    },
    {
      header: "Status",
      key: "status",
      render: (contact) => <ContactStatusBadge status={contact.status} />,
    },
  ];

  if (query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="CRM"
          title="Contact Master"
          description="Satu orang atau institusi hanya memiliki satu master kontak."
        />
        <ErrorState
          title="Kontak belum dapat dimuat"
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="contact-list-title">
      <PageHeader
        eyebrow="CRM"
        title="Contact Master"
        description="Basis kontak lintas peran: donatur, kafil, relawan, dan penerima manfaat."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="crm_contacts"
            onClick={() => create("crm_contacts")}
          >
            <Plus aria-hidden="true" size={16} />
            Tambah kontak
          </ProtectedActionButton>
        }
      />
      <FilterBar
        searchPlaceholder="Cari nama, telepon, email, atau wilayah"
        searchValue={search}
        onSearchChange={setSearch}
      />
      <ResourceTable
        columns={columns}
        getRowId={(contact) => contact.$id}
        isLoading={query.isLoading || roleQuery.query.isLoading}
        items={contacts}
        empty={
          <EmptyState
            title="Belum ada contact master"
            description="Tambah kontak pertama tanpa menyimpan nomor identitas di daftar umum."
            action={
              <ProtectedActionButton
                action="manage"
                resource="crm_contacts"
                onClick={() => create("crm_contacts")}
              >
                Tambah kontak
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
