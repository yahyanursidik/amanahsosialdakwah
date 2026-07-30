import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ApprovalTimeline,
  DetailSection,
  EvidenceGallery,
  MoneyDisplay,
  PageHeader,
  QuantityDisplay,
  StatusBadge,
} from "@/components/design-system";
import { useOrganization } from "@/features/organizations/organization-context";

export function WorkspacePage() {
  const { activeOrganization } = useOrganization();

  return (
    <section className="workspace-page" aria-labelledby="workspace-title">
      <PageHeader
        eyebrow="Workspace"
        title={activeOrganization?.organization.name ?? "Organisasi aktif"}
        description="Fondasi akses organisasi sudah aktif. Modul bisnis akan ditambahkan pada tahap berikutnya."
        meta={<StatusBadge tone="success">Membership aktif</StatusBadge>}
        actions={
          <ProtectedActionButton action="manage" resource="memberships">
            Tambah membership
          </ProtectedActionButton>
        }
      />
      <div className="workspace-page__grid">
        <DetailSection
          title="Ringkasan operasional"
          items={[
            {
              label: "Dana tersalurkan",
              value: <MoneyDisplay amount={0} />,
            },
            {
              label: "Barang siap salur",
              value: <QuantityDisplay value={0} unit="paket" />,
            },
            {
              label: "Status organisasi",
              value: <StatusBadge tone="success">Aktif</StatusBadge>,
            },
          ]}
        />
        <DetailSection title="Alur approval">
          <ApprovalTimeline
            items={[
              {
                actor: "Sistem",
                description: "Menunggu modul approval bisnis.",
                status: "waiting",
                title: "Fondasi siap",
              },
            ]}
          />
        </DetailSection>
      </div>
      <DetailSection title="Bukti pendukung">
        <EvidenceGallery items={[]} />
      </DetailSection>
    </section>
  );
}
