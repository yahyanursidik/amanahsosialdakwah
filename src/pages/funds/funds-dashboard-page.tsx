import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Landmark, Plus } from "lucide-react";
import { useNavigate } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  DetailSection,
  ErrorState,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import {
  type FundAllocation,
  type FundCommitment,
  type FundDisbursement,
  type FundOverviewEnvelope,
  type FundReceipt,
  type FundReconciliation,
} from "@/features/funds/types";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

function statusTone(status: string) {
  if (["approved", "fulfilled", "matched", "posted"].includes(status)) {
    return "success" as const;
  }
  if (["active", "partially_received", "draft"].includes(status)) {
    return "info" as const;
  }
  if (["reversed", "cancelled"].includes(status)) {
    return "danger" as const;
  }
  return "warning" as const;
}

const moneyColumn = <T extends { amount: string; currency: string }>(): ResourceTableColumn<T> => ({
  align: "right",
  header: "Nominal",
  key: "amount",
  render: (item) => <MoneyDisplay amount={item.amount} currency={item.currency} />,
});

export function FundsDashboardPage() {
  const navigate = useNavigate();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const overview = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<FundOverviewEnvelope>("/api/v1/funds/overview"),
    queryKey: ["funds", "overview", organizationId],
  });
  const restrictions = overview.data?.data ?? [];
  const listOptions = {
    pagination: { currentPage: 1, pageSize: 8, mode: "server" as const },
  };
  const commitments = useList<FundCommitment>({
    resource: "fund_commitments",
    ...listOptions,
  });
  const receipts = useList<FundReceipt>({
    resource: "fund_receipts",
    ...listOptions,
  });
  const allocations = useList<FundAllocation>({
    resource: "fund_allocations",
    ...listOptions,
  });
  const disbursements = useList<FundDisbursement>({
    resource: "fund_disbursements",
    ...listOptions,
  });
  const reconciliations = useList<FundReconciliation>({
    resource: "fund_reconciliations",
    ...listOptions,
  });

  if (overview.isError) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Funds & Amanah" title="Dana Amanah" />
        <ErrorState
          title="Ringkasan dana tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission fund_ledger.read."
          onRetry={() => overview.refetch()}
        />
      </section>
    );
  }

  const transactionError = [
    commitments.query,
    receipts.query,
    allocations.query,
    disbursements.query,
    reconciliations.query,
  ].some((query) => query.isError);

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Funds & Amanah"
        title="Dana Amanah"
        description="Saldo bersumber dari jurnal append-only. Komitmen, kas masuk, alokasi, dan penyaluran tetap dipisahkan."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="fund_restrictions"
            onClick={() => navigate("/funds/new/restriction")}
          >
            <Plus aria-hidden="true" size={16} />
            Pembatasan Dana
          </ProtectedActionButton>
        }
      />

      <div className="fund-balance-grid">
        {restrictions.map((restriction) => (
          <article className="fund-balance-card" key={restriction.id}>
            <div>
              <span className="fund-balance-card__code">{restriction.code}</span>
              <StatusBadge tone={restriction.status === "active" ? "success" : "neutral"}>
                {restriction.status}
              </StatusBadge>
            </div>
            <h2>{restriction.name}</h2>
            <p>{restriction.program_name ?? "Lintas program"}</p>
            <dl>
              <div>
                <dt>Tersedia</dt>
                <dd><MoneyDisplay amount={restriction.available_balance ?? "0"} currency={restriction.currency} /></dd>
              </div>
              <div>
                <dt>Dialokasikan</dt>
                <dd><MoneyDisplay amount={restriction.allocated_balance ?? "0"} currency={restriction.currency} /></dd>
              </div>
              <div>
                <dt>Tersalurkan</dt>
                <dd><MoneyDisplay amount={restriction.disbursed_total ?? "0"} currency={restriction.currency} /></dd>
              </div>
            </dl>
          </article>
        ))}
        {!overview.isLoading && restrictions.length === 0 ? (
          <article className="fund-balance-card fund-balance-card--empty">
            <Landmark aria-hidden="true" size={24} />
            <h2>Belum ada pembatasan dana</h2>
            <p>Buat klasifikasi unrestricted atau terikat program sebelum penerimaan dicatat.</p>
          </article>
        ) : null}
      </div>

      {transactionError ? (
        <ErrorState
          title="Sebagian transaksi tidak dapat dimuat"
          description="Hak akses tiap jenis transaksi berbeda. Data yang diizinkan tetap ditampilkan."
        />
      ) : null}

      <DetailSection
        title="Komitmen Dana"
        description="Janji dana belum menambah saldo kas."
        actions={
          <ProtectedActionButton action="manage" resource="fund_commitments" variant="outline" onClick={() => navigate("/funds/new/commitment")}>
            <Plus aria-hidden="true" size={16} /> Catat
          </ProtectedActionButton>
        }
      >
        <ResourceTable
          items={commitments.result?.data ?? []}
          isLoading={commitments.query.isLoading}
          getRowId={(item) => item.id}
          columns={[
            { header: "Referensi", key: "reference", render: (item) => item.reference_number },
            { header: "Pemberi", key: "donor", render: (item) => item.donor_name ?? "Anonim" },
            { header: "Pembatasan", key: "restriction", render: (item) => item.restriction_name },
            moneyColumn<FundCommitment>(),
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge> },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="Penerimaan"
        description="Penerimaan posted menambah saldo tersedia."
        actions={
          <ProtectedActionButton action="post" resource="fund_receipts" variant="outline" onClick={() => navigate("/funds/new/receipt")}>
            <Plus aria-hidden="true" size={16} /> Bukukan
          </ProtectedActionButton>
        }
      >
        <ResourceTable
          items={receipts.result?.data ?? []}
          isLoading={receipts.query.isLoading}
          getRowId={(item) => item.id}
          columns={[
            { header: "Referensi", key: "reference", render: (item) => item.reference_number },
            { header: "Pemberi", key: "donor", render: (item) => item.donor_name ?? "Anonim" },
            { header: "Pembatasan", key: "restriction", render: (item) => item.restriction_name },
            moneyColumn<FundReceipt>(),
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge> },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="Alokasi"
        description="Draft harus melalui Approval Engine sebelum saldo berpindah ke allocated."
        actions={
          <ProtectedActionButton action="manage" resource="fund_allocations" variant="outline" onClick={() => navigate("/funds/new/allocation")}>
            <Plus aria-hidden="true" size={16} /> Buat Draft
          </ProtectedActionButton>
        }
      >
        <ResourceTable
          items={allocations.result?.data ?? []}
          isLoading={allocations.query.isLoading}
          getRowId={(item) => item.id}
          rowActions={(item) => (
            <Button variant="ghost" onClick={() => navigate(`/funds/allocations/${item.id}`)}>
              Detail <ArrowRight aria-hidden="true" size={15} />
            </Button>
          )}
          columns={[
            { header: "Referensi", key: "reference", render: (item) => item.reference_number },
            { header: "Program", key: "program", render: (item) => item.program_name },
            { header: "Tujuan", key: "purpose", render: (item) => item.purpose },
            moneyColumn<FundAllocation>(),
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge> },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="Penyaluran Dana"
        description="Hanya dapat dibukukan terhadap alokasi approved."
        actions={
          <ProtectedActionButton action="post" resource="fund_disbursements" variant="outline" onClick={() => navigate("/funds/new/disbursement")}>
            <Plus aria-hidden="true" size={16} /> Bukukan
          </ProtectedActionButton>
        }
      >
        <ResourceTable
          items={disbursements.result?.data ?? []}
          isLoading={disbursements.query.isLoading}
          getRowId={(item) => item.id}
          columns={[
            { header: "Referensi", key: "reference", render: (item) => item.reference_number },
            { header: "Penerima", key: "recipient", render: (item) => `${item.recipient_type}: ${item.recipient_reference}` },
            moneyColumn<FundDisbursement>(),
            { header: "Tanggal", key: "date", render: (item) => new Date(item.disbursed_at).toLocaleDateString("id-ID") },
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge> },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="Rekonsiliasi"
        description="Membandingkan saldo kas sistem dengan rekening koran tanpa mengubah ledger."
        actions={
          <ProtectedActionButton action="manage" resource="fund_reconciliations" variant="outline" onClick={() => navigate("/funds/new/reconciliation")}>
            <Plus aria-hidden="true" size={16} /> Rekonsiliasi
          </ProtectedActionButton>
        }
      >
        <ResourceTable
          items={reconciliations.result?.data ?? []}
          isLoading={reconciliations.query.isLoading}
          getRowId={(item) => item.id}
          columns={[
            { header: "Referensi", key: "reference", render: (item) => item.reference_number },
            { header: "Pembatasan", key: "restriction", render: (item) => item.restriction_name },
            { header: "Saldo sistem", key: "system", align: "right", render: (item) => <MoneyDisplay amount={item.system_balance} currency={item.currency} /> },
            { header: "Selisih", key: "difference", align: "right", render: (item) => <MoneyDisplay amount={item.difference_amount} currency={item.currency} /> },
            { header: "Status", key: "status", render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge> },
          ]}
        />
      </DetailSection>
    </section>
  );
}
