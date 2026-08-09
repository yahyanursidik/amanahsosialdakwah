export type MoneyTotal = { amount: string; currency: string };

export type OrganizationReport = {
  actionItems: Array<{
    category: string;
    count: number;
    description: string;
    href: string;
    severity: "high" | "medium";
    title: string;
  }>;
  availableSections: string[];
  generatedAt: string;
  metrics: {
    activeKafalahContracts: number | null;
    activePrograms: number | null;
    activeWaqfAssets: number | null;
    completedDistributions: number | null;
    eligibleCases: number | null;
    expiringBatches: number | null;
    stockedProducts: number | null;
    openCases: number | null;
    pendingApprovals: number | null;
  };
  money: {
    disbursed: MoneyTotal[];
    distributed: MoneyTotal[];
    received: MoneyTotal[];
    waqfBenefits: MoneyTotal[];
    waqfIncome: MoneyTotal[];
  };
  period: { from: string; range: "30d" | "90d" | "365d"; to: string };
  programPerformance: Array<{
    active_cases: number;
    code: string;
    completed_distributions: number;
    distributed_amount: string;
    distribution_currency: string | null;
    eligible_cases: number;
    id: string;
    name: string;
    target_beneficiary_count: number | null;
  }>;
  waqfPerformance: Array<{
    acquisition_value: string;
    active_assets: number;
    asset_type: string;
    currency: string;
    total_assets: number;
  }>;
};

export type OrganizationReportEnvelope = {
  data: OrganizationReport;
  meta: { requestId: string };
};
