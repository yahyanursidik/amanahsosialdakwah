import { withTenantTransaction } from "../db/client";
import { resolveReportPeriod } from "../domain/report-rules";
import type { ReportQuery } from "../routes/report-schemas";
import type { RequestContext } from "../types";
import { requirePermission } from "./request-authorization";

type CountRow = { count: number };
type MoneyRow = { amount: string; currency: string };
type ProgramPerformanceRow = {
  active_cases: number;
  code: string;
  completed_distributions: number;
  distributed_amount: string;
  distribution_currency: string | null;
  eligible_cases: number;
  id: string;
  name: string;
  target_beneficiary_count: number | null;
};

const hasAll = (context: RequestContext, permissions: string[]) =>
  permissions.every((permission) => context.permissions.has(permission));

export async function getOrganizationReport(
  context: RequestContext,
  query: ReportQuery,
) {
  requirePermission(context, "reports.read");
  const period = resolveReportPeriod(query.range);

  return withTenantTransaction(context, async (_database, client) => {
    const availableSections: string[] = [];
    const metrics = {
      activeKafalahContracts: null as number | null,
      activePrograms: null as number | null,
      activeWaqfAssets: null as number | null,
      completedDistributions: null as number | null,
      eligibleCases: null as number | null,
      expiringBatches: null as number | null,
      stockedProducts: null as number | null,
      openCases: null as number | null,
      pendingApprovals: null as number | null,
    };
    const money = {
      disbursed: [] as MoneyRow[],
      distributed: [] as MoneyRow[],
      received: [] as MoneyRow[],
      waqfBenefits: [] as MoneyRow[],
      waqfIncome: [] as MoneyRow[],
    };
    const actionItems: Array<{
      category: string;
      count: number;
      description: string;
      href: string;
      severity: "high" | "medium";
      title: string;
    }> = [];
    let programPerformance: ProgramPerformanceRow[] = [];
    let waqfPerformance: Array<{
      acquisition_value: string;
      active_assets: number;
      asset_type: string;
      currency: string;
      total_assets: number;
    }> = [];

    if (hasAll(context, ["programs.read", "cases.read"])) {
      availableSections.push("programs");
      const result = await client.query<{
        active_programs: number;
        eligible_cases: number;
        open_cases: number;
      }>(
        `select
          count(distinct program.id) filter (where program.status = 'active' and not program.is_archived)::int as active_programs,
          count(distinct beneficiary_case.id) filter (where beneficiary_case.status not in ('closed','cancelled'))::int as open_cases,
          count(distinct beneficiary_case.id) filter (where beneficiary_case.status = 'eligible')::int as eligible_cases
        from public.programs program
        left join public.beneficiary_cases beneficiary_case
          on beneficiary_case.organization_id = program.organization_id
         and beneficiary_case.program_id = program.id
        where program.organization_id = $1`,
        [context.organizationId],
      );
      metrics.activePrograms = result.rows[0]?.active_programs ?? 0;
      metrics.openCases = result.rows[0]?.open_cases ?? 0;
      metrics.eligibleCases = result.rows[0]?.eligible_cases ?? 0;
    }

    if (context.permissions.has("approval_requests.read")) {
      availableSections.push("approvals");
      const result = await client.query<CountRow>(
        `select count(*)::int as count from public.approval_requests
         where organization_id = $1 and status = 'in_progress'`,
        [context.organizationId],
      );
      metrics.pendingApprovals = result.rows[0]?.count ?? 0;
      const overdue = await client.query<CountRow>(
        `select count(*)::int as count from public.approval_requests
         where organization_id = $1 and status = 'in_progress'
           and submitted_at < now() - interval '3 days'`,
        [context.organizationId],
      );
      if ((overdue.rows[0]?.count ?? 0) > 0) {
        actionItems.push({
          category: "approval",
          count: overdue.rows[0]!.count,
          description: "Menunggu keputusan lebih dari tiga hari.",
          href: "/approval-requests",
          severity: "high",
          title: "Approval melewati SLA",
        });
      }
    }

    if (
      hasAll(context, [
        "fund_ledger.read",
        "fund_receipts.read",
        "fund_disbursements.read",
      ])
    ) {
      availableSections.push("funds");
      const result = await client.query<MoneyRow & { kind: string }>(
        `select kind, currency, sum(amount)::numeric(20,2)::text as amount
         from (
           select 'received'::text as kind, currency, amount
           from public.fund_receipts
           where organization_id = $1 and status = 'posted' and received_at between $2 and $3
           union all
           select 'disbursed'::text as kind, currency, amount
           from public.fund_disbursements
           where organization_id = $1 and status = 'posted' and disbursed_at between $2 and $3
         ) activity
         group by kind, currency order by kind, currency`,
        [context.organizationId, period.from, period.to],
      );
      money.received = result.rows.filter((row) => row.kind === "received");
      money.disbursed = result.rows.filter((row) => row.kind === "disbursed");
    }

    if (context.permissions.has("distributions.read")) {
      availableSections.push("distributions");
      const result = await client.query<MoneyRow & { count: number }>(
        `select currency, count(*)::int as count,
                coalesce(sum(amount), 0)::numeric(20,2)::text as amount
         from public.distribution_plans
         where organization_id = $1 and status = 'completed'
           and completed_at between $2 and $3
         group by currency order by currency`,
        [context.organizationId, period.from, period.to],
      );
      metrics.completedDistributions = result.rows.reduce(
        (total, row) => total + row.count,
        0,
      );
      money.distributed = result.rows.map(({ amount, currency }) => ({
        amount,
        currency,
      }));
      const stalled = await client.query<CountRow>(
        `select count(*)::int as count from public.distribution_plans
         where organization_id = $1
           and status in ('ready','assigned','in_progress','executed','confirmed','revision_required')
           and updated_at < now() - interval '2 days'`,
        [context.organizationId],
      );
      if ((stalled.rows[0]?.count ?? 0) > 0) {
        actionItems.push({
          category: "distribution",
          count: stalled.rows[0]!.count,
          description: "Tidak ada pembaruan selama lebih dari dua hari.",
          href: "/distributions",
          severity: "medium",
          title: "Distribusi perlu ditindaklanjuti",
        });
      }
    }

    if (
      hasAll(context, [
        "inventory_balances.read",
        "inventory_batches.read",
      ])
    ) {
      availableSections.push("inventory");
      const result = await client.query<{
        expiring_batches: number;
        stocked_products: number;
      }>(
        `select
          count(distinct balance.product_id) filter (where balance.quantity_on_hand > 0)::int as stocked_products,
          count(distinct batch.id) filter (
            where batch.expires_at between current_date and current_date + interval '30 days'
              and balance.quantity_on_hand > 0
          )::int as expiring_batches
         from public.inventory_balances balance
         left join public.inventory_batches batch
           on batch.id = balance.batch_id and batch.organization_id = balance.organization_id
         where balance.organization_id = $1`,
        [context.organizationId],
      );
      metrics.stockedProducts = result.rows[0]?.stocked_products ?? 0;
      metrics.expiringBatches = result.rows[0]?.expiring_batches ?? 0;
      if ((metrics.expiringBatches ?? 0) > 0) {
        actionItems.push({
          category: "inventory",
          count: metrics.expiringBatches!,
          description: "Batch dengan stok akan kedaluwarsa dalam 30 hari.",
          href: "/inventory",
          severity: "high",
          title: "Stok mendekati kedaluwarsa",
        });
      }
    }

    if (context.permissions.has("logistics_shipments.read")) {
      availableSections.push("logistics");
      const result = await client.query<CountRow>(
        `select count(*)::int as count from public.logistics_shipments
         where organization_id = $1
           and status in ('dispatched','in_transit','return_requested','returning')
           and coalesce(dispatched_at, planned_dispatch_at, created_at) < now() - interval '3 days'`,
        [context.organizationId],
      );
      if ((result.rows[0]?.count ?? 0) > 0) {
        actionItems.push({
          category: "logistics",
          count: result.rows[0]!.count,
          description: "Shipment aktif lebih dari tiga hari tanpa selesai.",
          href: "/logistics",
          severity: "medium",
          title: "Shipment perlu dipantau",
        });
      }
    }

    if (context.permissions.has("kafalah.read")) {
      availableSections.push("kafalah");
      const contracts = await client.query<CountRow>(
        `select count(*)::int as count from public.kafalah_contracts
         where organization_id = $1 and status = 'active'`,
        [context.organizationId],
      );
      metrics.activeKafalahContracts = contracts.rows[0]?.count ?? 0;
      const overdue = await client.query<CountRow>(
        `select count(*)::int as count from public.kafalah_schedules
         where organization_id = $1 and status = 'scheduled' and due_date < current_date`,
        [context.organizationId],
      );
      if ((overdue.rows[0]?.count ?? 0) > 0) {
        actionItems.push({
          category: "kafalah",
          count: overdue.rows[0]!.count,
          description: "Jadwal kafalah telah melewati tanggal jatuh tempo.",
          href: "/kafalah",
          severity: "high",
          title: "Jadwal kafalah tertunggak",
        });
      }
    }

    if (context.permissions.has("evidence_files.read")) {
      availableSections.push("evidence");
      const result = await client.query<CountRow>(
        `select count(*)::int as count from public.evidence_files
         where organization_id = $1
           and ((status = 'pending_upload' and created_at < now() - interval '1 day') or status = 'quarantined')`,
        [context.organizationId],
      );
      if ((result.rows[0]?.count ?? 0) > 0) {
        actionItems.push({
          category: "evidence",
          count: result.rows[0]!.count,
          description: "Upload tertunda atau berkas berada dalam karantina.",
          href: "/evidence",
          severity: "medium",
          title: "Bukti membutuhkan pemeriksaan",
        });
      }
    }

    if (context.permissions.has("waqf.read")) {
      availableSections.push("waqf");
      const assets = await client.query<{
        active_assets: number;
        total_assets: number;
      }>(
        `select count(*)::int as total_assets,
                count(*) filter (where operational_status = 'active')::int as active_assets
         from public.waqf_assets where organization_id = $1`,
        [context.organizationId],
      );
      metrics.activeWaqfAssets = assets.rows[0]?.active_assets ?? 0;
      const activity = await client.query<MoneyRow & { kind: string }>(
        `select kind, currency, sum(amount)::numeric(20,2)::text as amount
         from (
           select 'income'::text as kind, currency::text, amount
           from public.waqf_income_records
           where organization_id = $1 and status = 'received' and received_at between $2 and $3
           union all
           select 'benefit'::text as kind, currency::text, amount
           from public.waqf_benefit_distributions
           where organization_id = $1 and status = 'completed' and distributed_at between $2 and $3
         ) waqf_activity group by kind, currency order by kind, currency`,
        [context.organizationId, period.from, period.to],
      );
      money.waqfIncome = activity.rows.filter((row) => row.kind === "income");
      money.waqfBenefits = activity.rows.filter((row) => row.kind === "benefit");
      waqfPerformance = (
        await client.query<{
          acquisition_value: string;
          active_assets: number;
          asset_type: string;
          currency: string;
          total_assets: number;
        }>(
          `select asset_type, currency::text,
                  count(*)::int as total_assets,
                  count(*) filter (where operational_status = 'active')::int as active_assets,
                  coalesce(sum(acquisition_value), 0)::numeric(20,2)::text as acquisition_value
           from public.waqf_assets where organization_id = $1
           group by asset_type, currency order by asset_type, currency`,
          [context.organizationId],
        )
      ).rows;
      const legal = await client.query<CountRow>(
        `select count(*)::int as count from public.waqf_assets
         where organization_id = $1 and legal_status in ('incomplete','pending_review','disputed')`,
        [context.organizationId],
      );
      if ((legal.rows[0]?.count ?? 0) > 0) {
        actionItems.push({
          category: "waqf",
          count: legal.rows[0]!.count,
          description: "Legalitas aset belum terverifikasi atau sedang disengketakan.",
          href: "/waqf",
          severity: "high",
          title: "Legalitas wakaf belum tuntas",
        });
      }
    }

    if (
      hasAll(context, ["programs.read", "cases.read", "distributions.read"])
    ) {
      programPerformance = (
        await client.query<ProgramPerformanceRow>(
          `select program.id, program.code, program.name, program.target_beneficiary_count,
                  coalesce(case_stat.active_cases, 0)::int as active_cases,
                  coalesce(case_stat.eligible_cases, 0)::int as eligible_cases,
                  coalesce(distribution_stat.completed_distributions, 0)::int as completed_distributions,
                  coalesce(distribution_stat.distributed_amount, 0)::numeric(20,2)::text as distributed_amount,
                  distribution_stat.distribution_currency
           from public.programs program
           left join lateral (
             select
               count(*) filter (where status not in ('closed','cancelled')) as active_cases,
               count(*) filter (where status = 'eligible') as eligible_cases
             from public.beneficiary_cases
             where organization_id = program.organization_id and program_id = program.id
           ) case_stat on true
           left join lateral (
             select count(*)::int as completed_distributions,
                    sum(amount)::numeric(20,2) as distributed_amount,
                    currency as distribution_currency
             from public.distribution_plans
             where organization_id = program.organization_id and program_id = program.id
               and status = 'completed' and completed_at between $2 and $3
             group by currency
           ) distribution_stat on true
           where program.organization_id = $1 and not program.is_archived
           order by program.name, distribution_stat.distribution_currency nulls last limit 50`,
          [context.organizationId, period.from, period.to],
        )
      ).rows;
    }

    actionItems.sort((left, right) =>
      left.severity === right.severity
        ? right.count - left.count
        : left.severity === "high"
          ? -1
          : 1,
    );

    return {
      actionItems,
      availableSections,
      generatedAt: new Date().toISOString(),
      metrics,
      money,
      period,
      programPerformance,
      waqfPerformance,
    };
  });
}
