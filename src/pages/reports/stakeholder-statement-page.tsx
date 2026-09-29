import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  applicationStatusLabels,
  contactRoleLabels,
  givingTypeLabels,
  labelOf,
  partnerRoleLabels,
  proposalStatusLabels,
  readinessLabels,
  submitterTypeLabels,
  toneOf,
  waqfContributionFormLabels,
  waqfOperationalStatusLabels,
  waqfProposalTypeLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type { StakeholderStatement } from "@/features/reports/types";
import { apiFetch } from "@/lib/neon/http";

type Row = Record<string, string | number | boolean | null>;

const text = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);
const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString("id-ID") : "—";
const money = (value: unknown, currency: unknown = "IDR") => (
  <MoneyDisplay amount={String(value ?? "0")} currency={String(currency ?? "IDR")} />
);

function Section({
  children,
  count,
  description,
  title,
}: {
  children: ReactNode;
  count: number;
  description?: string;
  title: string;
}) {
  if (count === 0) return null;
  return (
    <DetailSection title={`${title} (${count})`} description={description}>
      {children}
    </DetailSection>
  );
}

export function StakeholderStatementPage() {
  const { contactId = "" } = useParams();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const report = useQuery({
    enabled: Boolean(organizationId && contactId),
    queryFn: () =>
      apiFetch<{ data: StakeholderStatement }>(
        `/api/v1/reports/stakeholders/${contactId}`,
      ),
    queryKey: ["reports", "stakeholder", organizationId, contactId],
  });

  if (report.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }
  if (report.isError || !report.data) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Laporan" title="Laporan pemangku kepentingan" />
        <ErrorState
          title="Laporan tidak dapat dimuat"
          description="Kontak tidak ditemukan atau Anda belum memiliki izin laporan pemangku kepentingan."
          onRetry={() => report.refetch()}
        />
      </section>
    );
  }

  const data = report.data.data;
  const rows = (list?: Row[]) => list ?? [];
  const contact = data.contact;
  const organizationName =
    activeOrganization?.organization.name ?? "Lembaga pengelola";
  const hasGiving =
    rows(data.cashReceipts).length +
      rows(data.inKindDonations).length +
      rows(data.waqfContributions).length >
    0;

  return (
    <section className="workspace-page print-document">
      <PageHeader
        eyebrow={`Laporan pemangku kepentingan · ${organizationName}`}
        title={contact.display_name}
        description={`${contact.contact_type === "institution" ? "Lembaga" : "Individu"} · ${
          contact.roles.length > 0
            ? contact.roles.map((role) => labelOf(contactRoleLabels, role)).join(", ")
            : "Belum memiliki peran"
        }${contact.city ? ` · ${contact.city}` : ""}`}
        actions={
          <div className="print-hidden flex flex-wrap gap-2">
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/reports/stakeholders"
            >
              <ArrowLeft aria-hidden size={16} /> Semua pemangku kepentingan
            </Link>
            <Link
              className={buttonVariants({ variant: "outline" })}
              to={`/crm/contacts/${contact.id}`}
            >
              Profil kontak
            </Link>
            <Button onClick={() => window.print()}>
              <Printer aria-hidden size={16} /> Cetak / simpan PDF
            </Button>
          </div>
        }
      />

      {hasGiving ? (
        <div className="report-money-grid">
          <article>
            <span>Dana diberikan</span>
            {money(data.totals.cashGiven)}
          </article>
          <article>
            <span>Barang (estimasi nilai)</span>
            {money(data.totals.inKindValue)}
          </article>
          <article>
            <span>Wakaf diserahkan</span>
            {money(data.totals.waqfGiven)}
          </article>
        </div>
      ) : null}

      <Section
        count={rows(data.cashReceipts).length}
        title="Donasi dana"
        description="Penerimaan dana yang tercatat atas nama kontak ini."
      >
        <ResourceTable
          items={rows(data.cashReceipts)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.received_at) },
            { header: "Nomor", key: "ref", render: (item) => text(item.reference_number) },
            {
              header: "Peruntukan",
              key: "program",
              render: (item) => text(item.program_name ?? item.restriction_name),
            },
            { align: "right", header: "Nominal", key: "amount", render: (item) => money(item.amount, item.currency) },
            {
              header: "Status",
              key: "status",
              render: (item) => (
                <StatusBadge tone={toneOf(String(item.status))}>
                  {item.status === "posted" ? "Diterima" : "Dibatalkan"}
                </StatusBadge>
              ),
            },
          ]}
        />
      </Section>

      <Section count={rows(data.inKindDonations).length} title="Donasi barang">
        <ResourceTable
          items={rows(data.inKindDonations)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.received_at) },
            {
              header: "Tanda terima",
              key: "ref",
              render: (item) => (
                <Link className="print-plain" to={`/in-kind-donations/${String(item.id)}`}>
                  {text(item.reference_number)}
                </Link>
              ),
            },
            { header: "Jenis", key: "type", render: (item) => labelOf(givingTypeLabels, String(item.giving_type)) },
            { header: "Barang", key: "items", render: (item) => text(item.item_summary) },
            { header: "Program", key: "program", render: (item) => text(item.program_name ?? "Umum") },
            { align: "right", header: "Estimasi", key: "value", render: (item) => money(item.estimated_total_value, item.currency) },
          ]}
        />
      </Section>

      <Section
        count={rows(data.waqfContributions).length}
        title="Setoran wakaf"
        description="Manfaat tersalurkan adalah total manfaat aset wakaf sejak awal, bukan porsi pribadi."
      >
        <ResourceTable
          items={rows(data.waqfContributions)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.received_at) },
            {
              header: "Aset wakaf",
              key: "asset",
              render: (item) => (
                <div className="crm-contact-cell">
                  <Link className="print-plain" to={`/waqf/assets/${String(item.asset_id)}`}>
                    {text(item.asset_name)}
                  </Link>
                  <small>
                    {labelOf(waqfOperationalStatusLabels, String(item.asset_status))}
                    {item.on_behalf_of ? ` · atas nama ${String(item.on_behalf_of)}` : ""}
                  </small>
                </div>
              ),
            },
            { header: "Bentuk", key: "form", render: (item) => labelOf(waqfContributionFormLabels, String(item.contribution_form)) },
            { header: "No. sertifikat", key: "cert", render: (item) => text(item.certificate_number) },
            { align: "right", header: "Nilai", key: "amount", render: (item) => money(item.amount, item.currency) },
            { align: "right", header: "Manfaat aset tersalurkan", key: "benefit", render: (item) => money(item.asset_total_benefit, item.currency) },
          ]}
        />
      </Section>

      <Section count={rows(data.waqfAssetsDonated).length} title="Aset yang diwakafkan (wakif utama)">
        <ResourceTable
          items={rows(data.waqfAssetsDonated)}
          getRowId={(item) => String(item.id)}
          columns={[
            {
              header: "Aset",
              key: "asset",
              render: (item) => (
                <Link className="print-plain" to={`/waqf/assets/${String(item.id)}`}>
                  {text(item.name)}
                </Link>
              ),
            },
            { header: "Status", key: "status", render: (item) => labelOf(waqfOperationalStatusLabels, String(item.operational_status)) },
            { align: "right", header: "Nilai perolehan", key: "value", render: (item) => (item.acquisition_value ? money(item.acquisition_value, item.currency) : "—") },
          ]}
        />
      </Section>

      <Section
        count={rows(data.supportedPrograms).length}
        title="Capaian program yang didukung"
        description="Realisasi program secara keseluruhan (bukan hanya dari pemberian kontak ini)."
      >
        <ResourceTable
          items={rows(data.supportedPrograms)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Program", key: "program", render: (item) => `${text(item.code)} — ${text(item.name)}` },
            { align: "right", header: "Target penerima", key: "target", render: (item) => text(item.target_beneficiary_count) },
            { align: "right", header: "Penerima terlayani", key: "reached", render: (item) => text(item.beneficiaries_reached) },
            { align: "right", header: "Distribusi selesai", key: "done", render: (item) => text(item.completed_distributions) },
            { align: "right", header: "Nilai tersalurkan", key: "amount", render: (item) => money(item.distributed_amount) },
          ]}
        />
      </Section>

      <Section count={rows(data.partnerAssignments).length} title="Penugasan sebagai mitra penyalur">
        <ResourceTable
          items={rows(data.partnerAssignments)}
          getRowId={(item) => String(item.id)}
          columns={[
            {
              header: "Program",
              key: "program",
              render: (item) => (
                <Link className="print-plain" to={`/programs/${String(item.program_id)}`}>
                  {text(item.program_name)}
                </Link>
              ),
            },
            { header: "Area", key: "area", render: (item) => text(item.area_name ?? "Semua area") },
            { header: "Peran", key: "role", render: (item) => labelOf(partnerRoleLabels, String(item.assignment_role)) },
            { header: "Kesiapan", key: "ready", render: (item) => labelOf(readinessLabels, String(item.readiness_status)) },
            { align: "right", header: "Pengajuan dialokasikan", key: "alloc", render: (item) => text(item.allocated_applications) },
          ]}
        />
      </Section>

      <Section count={rows(data.partnerFulfillments).length} title="Penyaluran paket oleh mitra">
        <ResourceTable
          items={rows(data.partnerFulfillments)}
          getRowId={(item) => String(item.program_name)}
          columns={[
            { header: "Program", key: "program", render: (item) => text(item.program_name) },
            { align: "right", header: "Penerima", key: "count", render: (item) => text(item.fulfillment_count) },
            { align: "right", header: "Paket", key: "packages", render: (item) => text(item.package_count) },
          ]}
        />
      </Section>

      <Section count={rows(data.applications).length} title="Pengajuan bantuan">
        <ResourceTable
          items={rows(data.applications)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.created_at) },
            {
              header: "Nomor",
              key: "ref",
              render: (item) => (
                <Link className="print-plain" to={`/applications/${String(item.id)}`}>
                  {text(item.reference_number)}
                </Link>
              ),
            },
            { header: "Program", key: "program", render: (item) => text(item.program_name) },
            {
              header: "Peran",
              key: "relation",
              render: (item) =>
                item.relation === "partner"
                  ? `Mitra pengaju untuk ${text(item.applicant_name)}`
                  : labelOf(submitterTypeLabels, String(item.submitter_type)),
            },
            { align: "right", header: "Penerima", key: "count", render: (item) => text(item.beneficiary_count) },
            {
              header: "Status",
              key: "status",
              render: (item) => (
                <StatusBadge tone={toneOf(String(item.status))}>
                  {labelOf(applicationStatusLabels, String(item.status))}
                </StatusBadge>
              ),
            },
          ]}
        />
      </Section>

      <Section count={rows(data.waqfProposals).length} title="Pengajuan program wakaf">
        <ResourceTable
          items={rows(data.waqfProposals)}
          getRowId={(item) => String(item.id)}
          columns={[
            {
              header: "Judul",
              key: "title",
              render: (item) => (
                <Link className="print-plain" to={`/waqf/proposals/${String(item.id)}`}>
                  {text(item.title)}
                </Link>
              ),
            },
            { header: "Jenis", key: "type", render: (item) => labelOf(waqfProposalTypeLabels, String(item.proposal_type)) },
            { align: "right", header: "Kebutuhan", key: "amount", render: (item) => (item.requested_amount ? money(item.requested_amount, item.currency) : "—") },
            {
              header: "Status",
              key: "status",
              render: (item) => (
                <StatusBadge tone={toneOf(String(item.status))}>
                  {labelOf(proposalStatusLabels, String(item.status))}
                </StatusBadge>
              ),
            },
          ]}
        />
      </Section>

      <p className="report-generated-at">
        Dihasilkan {new Date(data.generatedAt).toLocaleString("id-ID")} oleh{" "}
        {organizationName}. Bagian yang tampil mengikuti izin akses pembaca.
      </p>
    </section>
  );
}
