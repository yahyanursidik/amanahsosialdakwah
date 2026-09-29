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
  inKindByGivingType?: Array<{
    amount: string;
    count: number;
    currency: string;
    giving_type: string;
  }>;
  metrics: {
    activeKafalahContracts: number | null;
    activePrograms: number | null;
    activeWaqfAssets: number | null;
    completedDistributions: number | null;
    eligibleCases: number | null;
    expiringBatches: number | null;
    stockedProducts: number | null;
    openCases: number | null;
    pendingApplications?: number | null;
    pendingApprovals: number | null;
    pendingWaqfProposals?: number | null;
  };
  money: {
    disbursed: MoneyTotal[];
    distributed: MoneyTotal[];
    inKindReceived?: MoneyTotal[];
    received: MoneyTotal[];
    waqfBenefits: MoneyTotal[];
    waqfContributions?: MoneyTotal[];
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

export type StakeholderRole = "applicant" | "distribution_partner" | "donor";

export type StakeholderSummaryRow = {
  accepted?: number;
  active_assignments?: number;
  applications?: number;
  beneficiaries?: number;
  cash_amount?: string;
  cash_count?: number;
  city?: string | null;
  contact_type?: string;
  display_name: string;
  fulfillments?: number;
  goods_count?: number;
  goods_value?: string;
  id: string;
  in_progress?: number;
  on_behalf_applications?: number;
  packages?: number;
  program_count?: number;
  ready_assignments?: number;
  rejected?: number;
  total_value?: string;
  waqf_amount?: string;
  waqf_count?: number;
  waqf_proposals?: number;
};

export type StakeholderSummary = {
  anonymous?: { cash_amount: string; goods_value: string; waqf_amount: string };
  data: StakeholderSummaryRow[];
  period: { from: string; range: string; to: string };
};

type Row = Record<string, string | number | boolean | null>;

export type StakeholderStatement = {
  applications?: Row[];
  cashReceipts?: Row[];
  contact: {
    city: string | null;
    contact_type: string;
    display_name: string;
    id: string;
    primary_email: string | null;
    primary_phone: string | null;
    province: string | null;
    roles: string[];
    status: string;
  };
  generatedAt: string;
  inKindDonations?: Row[];
  partnerAssignments?: Row[];
  partnerFulfillments?: Row[];
  sections: string[];
  supportedPrograms?: Row[];
  totals: { cashGiven: string; inKindValue: string; waqfGiven: string };
  waqfAssetsDonated?: Row[];
  waqfContributions?: Row[];
  waqfProposals?: Row[];
};
