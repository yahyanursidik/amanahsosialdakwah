import {
  ClipboardCheck,
  ClipboardList,
  GitPullRequestArrow,
  HeartHandshake,
  Landmark,
  Layers3,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { StatusBadge } from "@/components/design-system";
import { useOrganization } from "@/features/organizations/organization-context";
import { WorkspaceReportSummary } from "@/features/reports/workspace-report-summary";

const primaryActions = [
  {
    action: "manage",
    description: "Susun tujuan, periode, dan penanggung jawab.",
    icon: Layers3,
    label: "Buat program",
    resource: "programs",
    to: "/programs/new",
  },
  {
    action: "manage",
    description: "Catat permohonan bantuan untuk ditinjau.",
    icon: ClipboardList,
    label: "Catat pengajuan",
    resource: "applications",
    to: "/applications/new",
  },
  {
    action: "manage",
    description: "Rencanakan kebutuhan barang dan vendor.",
    icon: PackageCheck,
    label: "Buat pengadaan",
    resource: "procurement_requests",
    to: "/procurement/new",
  },
  {
    action: "manage",
    description: "Jadwalkan dan dokumentasikan penyaluran.",
    icon: Truck,
    label: "Rencanakan distribusi",
    resource: "distributions",
    to: "/distributions/new",
  },
] as const;

const workAreas = [
  {
    action: "read",
    icon: Landmark,
    label: "Dana amanah",
    resource: "fund_ledger",
    to: "/funds",
  },
  {
    action: "read",
    icon: HeartHandshake,
    label: "Contact master",
    resource: "crm_contacts",
    to: "/crm/contacts",
  },
  {
    action: "read",
    icon: GitPullRequestArrow,
    label: "Approval",
    resource: "approval_requests",
    to: "/approval-requests",
  },
  {
    action: "read",
    icon: ClipboardCheck,
    label: "Asesmen",
    resource: "assessments",
    to: "/assessments",
  },
] as const;

export function WorkspacePage() {
  const { activeOrganization, user } = useOrganization();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Pengguna";

  return (
    <section className="workspace-page" aria-labelledby="workspace-title">
      <header className="workspace-hero">
        <div className="workspace-hero__copy">
          <p>Assalamu’alaikum, {firstName}</p>
          <h1 id="workspace-title">
            {activeOrganization?.organization.name ?? "Organisasi aktif"}
          </h1>
          <span>
            Pilih pekerjaan yang perlu ditindaklanjuti. Setiap menu dan aksi
            mengikuti permission organisasi aktif.
          </span>
        </div>
        <div className="workspace-hero__trust">
          <ShieldCheck aria-hidden />
          <div>
            <strong>Konteks terverifikasi</strong>
            <span>Membership dan organisasi aktif sudah divalidasi.</span>
          </div>
          <StatusBadge tone="success">Aktif</StatusBadge>
        </div>
      </header>

      <CanAccess action="read" resource="reports">
        <WorkspaceReportSummary />
      </CanAccess>

      <section className="workspace-actions" aria-labelledby="quick-actions-title">
        <div className="workspace-section-heading">
          <div>
            <h2 id="quick-actions-title">Mulai pekerjaan</h2>
            <p>Aksi yang tersedia disaring berdasarkan kewenangan Anda.</p>
          </div>
        </div>
        <div className="workspace-actions__grid">
          {primaryActions.map((item) => {
            const Icon = item.icon;

            return (
              <CanAccess
                action={item.action}
                key={item.to}
                loading={
                  <span
                    aria-hidden
                    className="workspace-action workspace-action--loading"
                  />
                }
                resource={item.resource}
              >
                <Link className="workspace-action" to={item.to}>
                  <Icon aria-hidden />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span aria-hidden className="workspace-action__arrow">
                    →
                  </span>
                </Link>
              </CanAccess>
            );
          })}
        </div>
      </section>

      <div className="workspace-overview">
        <section className="workspace-areas" aria-labelledby="work-areas-title">
          <div className="workspace-section-heading">
            <div>
              <h2 id="work-areas-title">Area pengelolaan</h2>
              <p>Akses langsung ke data yang paling sering ditinjau.</p>
            </div>
          </div>
          <div className="workspace-areas__list">
            {workAreas.map((item) => {
              const Icon = item.icon;

              return (
                <CanAccess
                  action={item.action}
                  key={item.to}
                  loading={
                    <span
                      aria-hidden
                      className="workspace-area-placeholder"
                    />
                  }
                  resource={item.resource}
                >
                  <Link to={item.to}>
                    <Icon aria-hidden />
                    <span>{item.label}</span>
                    <span aria-hidden>→</span>
                  </Link>
                </CanAccess>
              );
            })}
          </div>
        </section>

        <aside className="workspace-path" aria-labelledby="workflow-title">
          <h2 id="workflow-title">Perjalanan amanah</h2>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Terima dan catat</strong>
                <small>Sumber amanah dan kebutuhan terdokumentasi.</small>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Verifikasi dan putuskan</strong>
                <small>Asesmen serta approval menjaga kewenangan.</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Salurkan dan buktikan</strong>
                <small>Distribusi, bukti, dan audit tetap tertaut.</small>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </section>
  );
}
