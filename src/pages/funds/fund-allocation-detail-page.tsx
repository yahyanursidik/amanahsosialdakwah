import { useCustomMutation, useOne, type HttpError } from "@refinedev/core";
import { ArrowLeft, BadgeCheck, GitPullRequestArrow, RotateCcw } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type { FundAllocation } from "@/features/funds/types";

function statusTone(status: string) {
  return status === "approved"
    ? ("success" as const)
    : status === "reversed"
      ? ("danger" as const)
      : ("info" as const);
}

export function FundAllocationDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const allocationQuery = useOne<FundAllocation>({
    id,
    queryOptions: { enabled: Boolean(id) },
    resource: "fund_allocations",
  });
  const mutation = useCustomMutation<FundAllocation, HttpError, { reason?: string }>();
  const allocation = allocationQuery.result;

  if (allocationQuery.query.isLoading) {
    return <section className="workspace-page"><LoadingSkeleton lines={8} /></section>;
  }
  if (!allocation || allocationQuery.query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Funds & Amanah" title="Detail Alokasi" />
        <ErrorState title="Alokasi tidak ditemukan" description="Data tidak tersedia atau berada pada organisasi lain." onRetry={() => allocationQuery.query.refetch()} />
      </section>
    );
  }

  const runCommand = (command: "activate" | "reverse") => {
    const reason =
      command === "reverse"
        ? window.prompt("Alasan pembalikan (minimal 10 karakter):")?.trim()
        : undefined;
    if (command === "reverse" && (!reason || reason.length < 10)) return;
    mutation.mutate(
      {
        config: { headers: { "Idempotency-Key": crypto.randomUUID() } },
        method: "post",
        url: `/api/v1/funds/allocations/${allocation.id}/${command}`,
        values: reason ? { reason } : {},
      },
      { onSuccess: () => allocationQuery.query.refetch() },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Funds / ${allocation.reference_number}`}
        title={allocation.program_name}
        description={allocation.purpose}
        meta={<StatusBadge tone={statusTone(allocation.status)}>{allocation.status}</StatusBadge>}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/funds")}><ArrowLeft aria-hidden="true" size={16} /> Dana</Button>
            {allocation.status === "draft" && !allocation.approval_request_id ? (
              <ProtectedActionButton action="create" resource="approval_requests" onClick={() => navigate(`/approval-requests/new?subject_type=fund_allocation&subject_id=${allocation.id}`)}>
                <GitPullRequestArrow aria-hidden="true" size={16} /> Ajukan Approval
              </ProtectedActionButton>
            ) : null}
            {allocation.status === "draft" && allocation.approval_status === "approved" ? (
              <ProtectedActionButton action="activate" resource="fund_allocations" disabled={mutation.mutation.isPending} onClick={() => runCommand("activate")}>
                <BadgeCheck aria-hidden="true" size={16} /> Aktifkan
              </ProtectedActionButton>
            ) : null}
            {allocation.status === "approved" ? (
              <ProtectedActionButton action="reverse" resource="fund_allocations" variant="outline" disabled={mutation.mutation.isPending} onClick={() => runCommand("reverse")}>
                <RotateCcw aria-hidden="true" size={16} /> Balikkan
              </ProtectedActionButton>
            ) : null}
          </>
        }
      />
      <DetailSection
        title="Nilai dan pembatasan"
        items={[
          { label: "Nominal", value: <MoneyDisplay amount={allocation.amount} currency={allocation.currency} /> },
          { label: "Sisa alokasi", value: <MoneyDisplay amount={allocation.remaining_amount ?? "0"} currency={allocation.currency} /> },
          { label: "Pembatasan", value: allocation.restriction_name },
          { label: "Status approval", value: allocation.approval_status ?? "Belum diajukan" },
        ]}
      />
      {allocation.approval_request_id ? (
        <Button variant="outline" onClick={() => navigate(`/approval-requests/${allocation.approval_request_id}`)}>
          Lihat permintaan approval <GitPullRequestArrow aria-hidden="true" size={16} />
        </Button>
      ) : null}
    </section>
  );
}
