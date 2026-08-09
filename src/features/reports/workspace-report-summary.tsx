import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleCheckBig, Clock3, Layers3 } from "lucide-react";
import { Link } from "react-router";

import { LoadingSkeleton, StatusBadge } from "@/components/design-system";
import { useOrganization } from "@/features/organizations/organization-context";
import type { OrganizationReportEnvelope } from "@/features/reports/types";
import { apiFetch } from "@/lib/neon/http";

export function WorkspaceReportSummary() {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const report = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      apiFetch<OrganizationReportEnvelope>(
        "/api/v1/reports/overview?range=30d",
      ),
    queryKey: ["reports", "workspace", organizationId],
    staleTime: 60_000,
  });

  if (report.isLoading) return <LoadingSkeleton lines={3} />;
  if (report.isError || !report.data) return null;

  const data = report.data.data;
  return (
    <section className="workspace-report" aria-labelledby="workspace-report-title">
      <div className="workspace-section-heading">
        <div>
          <h2 id="workspace-report-title">Kondisi 30 hari terakhir</h2>
          <p>Ringkasan server-side dari organisasi aktif.</p>
        </div>
        <Link to="/reports">
          Buka laporan <ArrowRight aria-hidden size={15} />
        </Link>
      </div>
      <div className="workspace-report__metrics">
        {data.metrics.activePrograms !== null ? (
          <article>
            <Layers3 aria-hidden />
            <span>Program aktif</span>
            <strong>{data.metrics.activePrograms}</strong>
          </article>
        ) : null}
        {data.metrics.pendingApprovals !== null ? (
          <article>
            <Clock3 aria-hidden />
            <span>Approval berjalan</span>
            <strong>{data.metrics.pendingApprovals}</strong>
          </article>
        ) : null}
        {data.metrics.completedDistributions !== null ? (
          <article>
            <CircleCheckBig aria-hidden />
            <span>Distribusi selesai</span>
            <strong>{data.metrics.completedDistributions}</strong>
          </article>
        ) : null}
        <article className="workspace-report__attention">
          <span>Perlu perhatian</span>
          <StatusBadge tone={data.actionItems.length > 0 ? "warning" : "success"}>
            {data.actionItems.length}
          </StatusBadge>
          <small>kategori tindak lanjut</small>
        </article>
      </div>
    </section>
  );
}
