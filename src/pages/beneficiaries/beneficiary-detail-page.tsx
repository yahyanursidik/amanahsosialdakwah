import { useNavigation } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, ListChecks, Pencil, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
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
import type { BeneficiaryDetail } from "@/features/beneficiaries/types";
import {
  applicationStatusLabels,
  asnafLabels,
  assessmentStatusLabels,
  beneficiaryCategoryLabels,
  beneficiaryStatusLabels,
  beneficiaryTypeLabels,
  caseStatusLabels,
  disabilityLabels,
  distributionStatusLabels,
  educationLabels,
  genderLabels,
  housingLabels,
  identityTypeLabels,
  incomeRangeLabels,
  labelOf,
  maritalStatusLabels,
  toneOf,
  vulnerabilityLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

type Row = Record<string, string | number | boolean | null>;

const text = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);
const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString("id-ID") : "—";
const money = (value: unknown, currency: unknown = "IDR") => (
  <MoneyDisplay amount={String(value ?? "0")} currency={String(currency ?? "IDR")} />
);

function age(birthDate: string | null) {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  ) {
    years -= 1;
  }
  return years;
}

function History({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  if (count === 0) return null;
  return <DetailSection title={`${title} (${count})`}>{children}</DetailSection>;
}

export function BeneficiaryDetailPage() {
  const { id = "" } = useParams();
  const { edit, list } = useNavigation();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const query = useQuery({
    enabled: Boolean(id && organizationId),
    queryFn: () =>
      apiFetch<{ data: BeneficiaryDetail }>(`/api/v1/beneficiaries/${id}`),
    queryKey: ["beneficiaries", "detail", organizationId, id],
  });

  if (query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }
  if (query.isError || !query.data) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Penerima manfaat" title="Profil penerima" />
        <ErrorState
          title="Penerima tidak ditemukan"
          description="Data tidak tersedia, berada di organisasi lain, atau Anda belum memiliki izin."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  const data = query.data.data;
  const { contact, profile } = data;
  const years = age(contact.birth_date);
  const rows = (list: Row[]) => list;
  const noHistory =
    data.applications.length +
      data.cases.length +
      data.distributions.length +
      data.fulfillments.length +
      data.waqf_benefits.length +
      data.waqf_utilizations.length +
      data.kafalah.length ===
    0;

  return (
    <section className="workspace-page print-document">
      <PageHeader
        eyebrow="Penerima manfaat"
        title={contact.display_name}
        meta={
          <div className="flex flex-wrap gap-2">
            {profile ? (
              <>
                <StatusBadge tone={toneOf(profile.status)}>
                  {labelOf(beneficiaryStatusLabels, profile.status)}
                </StatusBadge>
                <StatusBadge
                  tone={
                    profile.vulnerability_level === "critical"
                      ? "danger"
                      : profile.vulnerability_level === "high"
                        ? "warning"
                        : "neutral"
                  }
                >
                  Kerentanan {labelOf(vulnerabilityLabels, profile.vulnerability_level).toLowerCase()}
                </StatusBadge>
              </>
            ) : (
              <StatusBadge tone="warning">Profil belum dibuat</StatusBadge>
            )}
            <StatusBadge tone={data.profile_completeness >= 80 ? "success" : "warning"}>
              Profil {data.profile_completeness}% lengkap
            </StatusBadge>
          </div>
        }
        description={[
          contact.contact_type === "institution" ? "Lembaga" : labelOf(genderLabels, contact.gender),
          years !== null ? `${years} tahun` : null,
          [contact.district, contact.city].filter(Boolean).join(", ") || null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="print-hidden flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => list("beneficiaries")}>
              <ArrowLeft aria-hidden size={16} /> Daftar
            </Button>
            <CanAccess action="manage" resource="crm_beneficiary_profiles">
              <Button variant="outline" onClick={() => edit("beneficiaries", id)}>
                <Pencil aria-hidden size={16} /> Ubah profil
              </Button>
            </CanAccess>
            <CanAccess action="manage" resource="field_tasks">
              <Link
                className={buttonVariants({ variant: "outline" })}
                to={`/field/tasks/new?beneficiary=${id}&name=${encodeURIComponent(contact.display_name)}`}
              >
                <ListChecks aria-hidden size={16} /> Tugas lapangan
              </Link>
            </CanAccess>
            <CanAccess action="read" resource="stakeholder_reports">
              <Link className={buttonVariants({ variant: "outline" })} to={`/reports/stakeholders/${id}`}>
                <FileText aria-hidden size={16} /> Laporan
              </Link>
            </CanAccess>
            <Button onClick={() => window.print()}>
              <Printer aria-hidden size={16} /> Cetak profil
            </Button>
          </div>
        }
      />

      <div className="report-money-grid">
        <article>
          <span>Bantuan dana diterima</span>
          {money(data.totals.cash_received)}
        </article>
        <article>
          <span>Manfaat wakaf diterima</span>
          {money(data.totals.waqf_received)}
        </article>
        <article>
          <span>Paket bantuan</span>
          <strong>{data.totals.packages_received}</strong>
        </article>
        <article>
          <span>Program diikuti</span>
          <strong>{data.totals.program_count}</strong>
        </article>
      </div>

      <DetailSection
        title="Identitas & kontak"
        items={[
          ...(contact.contact_type === "person"
            ? [
                { label: "Tempat, tanggal lahir", value: `${text(profile?.birth_place)}, ${date(contact.birth_date)}` },
                { label: "Jenis kelamin", value: labelOf(genderLabels, contact.gender) },
              ]
            : []),
          ...(data.sensitive_visible
            ? data.identities.map((identity) => ({
                label: labelOf(identityTypeLabels, identity.identity_type),
                value: `••••${identity.identity_last4 ?? ""} (${identity.verification_status === "verified" ? "terverifikasi" : "belum diverifikasi"})`,
              }))
            : [{ label: "Nomor identitas", value: "Disembunyikan (butuh izin data sensitif)" }]),
          { label: "Telepon / WhatsApp", value: [contact.primary_phone, contact.whatsapp_phone].filter(Boolean).join(" / ") || "—" },
          { label: "Email", value: text(contact.primary_email) },
          {
            label: "Alamat",
            value: [contact.address_line, contact.village, contact.district, contact.city, contact.province, contact.postal_code]
              .filter(Boolean)
              .join(", ") || "—",
          },
        ]}
      />

      {profile ? (
        <>
          <DetailSection
            title="Kondisi sosial-ekonomi"
            items={[
              { label: "Bentuk penerima", value: labelOf(beneficiaryTypeLabels, profile.beneficiary_type) },
              { label: "Anggota keluarga / jiwa", value: text(profile.household_size) },
              { label: "Tanggungan", value: text(profile.dependents_count) },
              { label: "Status perkawinan", value: labelOf(maritalStatusLabels, profile.marital_status) },
              { label: "Pendidikan", value: labelOf(educationLabels, profile.education_level) },
              { label: "Pekerjaan", value: text(profile.occupation) },
              {
                label: "Penghasilan",
                value: profile.monthly_income
                  ? money(profile.monthly_income)
                  : labelOf(incomeRangeLabels, profile.income_range),
              },
              { label: "Tempat tinggal", value: labelOf(housingLabels, profile.housing_status) },
              { label: "Disabilitas", value: labelOf(disabilityLabels, profile.disability_status) },
              { label: "Catatan kesehatan", value: text(profile.health_notes) },
            ]}
          />
          <DetailSection
            title="Kategori & kelayakan"
            items={[
              {
                label: "Kategori",
                value:
                  profile.beneficiary_categories.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {profile.beneficiary_categories.map((value) => (
                        <StatusBadge key={value} tone="info">
                          {labelOf(beneficiaryCategoryLabels, value)}
                        </StatusBadge>
                      ))}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              { label: "Asnaf", value: labelOf(asnafLabels, profile.asnaf_category) },
              { label: "Status asesmen", value: labelOf(assessmentStatusLabels, profile.assessment_status) },
              { label: "Lembaga pendamping", value: text(profile.referral_partner_name) },
              { label: "Catatan kelayakan", value: text(profile.eligibility_notes) },
            ]}
          />
          <DetailSection
            title="Wali, kontak darurat & rekening"
            items={[
              {
                label: "Wali",
                value: profile.guardian_name
                  ? `${profile.guardian_name}${profile.guardian_relation ? ` (${profile.guardian_relation})` : ""}${profile.guardian_phone ? ` · ${profile.guardian_phone}` : ""}`
                  : "—",
              },
              {
                label: "Kontak darurat",
                value: profile.emergency_contact_name
                  ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` · ${profile.emergency_contact_phone}` : ""}`
                  : "—",
              },
              {
                label: "Rekening",
                value: profile.bank_name
                  ? `${profile.bank_name} ${profile.bank_account_number ?? ""} a.n. ${profile.bank_account_holder ?? contact.display_name}`
                  : "—",
              },
            ]}
          />
        </>
      ) : null}

      {noHistory ? (
        <DetailSection title="Riwayat bantuan">
          <p>
            Belum ada riwayat. Daftarkan penerima ke program melalui{" "}
            <Link to="/applications/new">Pengajuan bantuan</Link>, atau salurkan manfaat wakaf dari halaman aset wakaf.
          </p>
        </DetailSection>
      ) : null}

      <History count={data.applications.length} title="Pengajuan bantuan">
        <ResourceTable
          items={rows(data.applications)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.created_at) },
            { header: "Nomor", key: "ref", render: (item) => <Link className="print-plain" to={`/applications/${String(item.id)}`}>{text(item.reference_number)}</Link> },
            { header: "Program", key: "program", render: (item) => text(item.program_name) },
            { header: "Melalui", key: "partner", render: (item) => text(item.partner_name ?? "Langsung") },
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={toneOf(String(item.status))}>{labelOf(applicationStatusLabels, String(item.status))}</StatusBadge> },
          ]}
        />
      </History>

      <History count={data.cases.length} title="Kasus & asesmen">
        <ResourceTable
          items={rows(data.cases)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Dibuka", key: "date", render: (item) => date(item.opened_at) },
            { header: "Nomor", key: "ref", render: (item) => <Link className="print-plain" to={`/cases/${String(item.id)}`}>{text(item.reference_number)}</Link> },
            { header: "Program", key: "program", render: (item) => text(item.program_name) },
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={toneOf(String(item.status))}>{labelOf(caseStatusLabels, String(item.status))}</StatusBadge> },
          ]}
        />
      </History>

      <History count={data.distributions.length} title="Penyaluran dana">
        <ResourceTable
          items={rows(data.distributions)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.completed_at ?? item.planned_at) },
            { header: "Nomor", key: "ref", render: (item) => <Link className="print-plain" to={`/distributions/${String(item.id)}`}>{text(item.reference_number)}</Link> },
            { header: "Program", key: "program", render: (item) => text(item.program_name) },
            { align: "right", header: "Nilai", key: "amount", render: (item) => money(item.amount, item.currency) },
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={toneOf(String(item.status))}>{labelOf(distributionStatusLabels, String(item.status))}</StatusBadge> },
          ]}
        />
      </History>

      <History count={data.fulfillments.length} title="Paket bantuan diterima">
        <ResourceTable
          items={rows(data.fulfillments)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.created_at) },
            { header: "Program", key: "program", render: (item) => text(item.program_name) },
            { header: "Packing", key: "packing", render: (item) => text(item.packing_reference) },
            { header: "Mitra penyalur", key: "partner", render: (item) => text(item.partner_name ?? "Langsung") },
            { align: "right", header: "Paket", key: "count", render: (item) => text(item.package_count) },
          ]}
        />
      </History>

      <History count={data.waqf_benefits.length + data.waqf_utilizations.length} title="Manfaat wakaf">
        <ResourceTable
          items={[
            ...rows(data.waqf_benefits).map((item): Row => ({ ...item, kind: "benefit" })),
            ...rows(data.waqf_utilizations).map((item): Row => ({ ...item, kind: "utilization" })),
          ]}
          getRowId={(item) => `${String(item.kind)}-${String(item.id)}`}
          columns={[
            { header: "Tanggal", key: "date", render: (item) => date(item.distributed_at ?? item.start_date) },
            { header: "Aset wakaf", key: "asset", render: (item) => <Link className="print-plain" to={`/waqf/assets/${String(item.asset_id)}`}>{text(item.asset_name)}</Link> },
            { header: "Jenis", key: "kind", render: (item) => (item.kind === "benefit" ? `Manfaat: ${text(item.benefit_type)}` : `Pemanfaatan: ${text(item.utilization_type)}`) },
            { align: "right", header: "Nilai", key: "amount", render: (item) => (item.amount ? money(item.amount, item.currency) : text(item.status)) },
          ]}
        />
      </History>

      <History count={data.kafalah.length} title="Kafalah">
        <ResourceTable
          items={rows(data.kafalah)}
          getRowId={(item) => String(item.id)}
          columns={[
            { header: "Nomor", key: "ref", render: (item) => text(item.reference_number) },
            { header: "Kebutuhan", key: "title", render: (item) => text(item.title) },
            { align: "right", header: "Nilai disetujui", key: "amount", render: (item) => money(item.approved_amount, item.currency) },
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={toneOf(String(item.status))}>{text(item.status)}</StatusBadge> },
          ]}
        />
      </History>
    </section>
  );
}
