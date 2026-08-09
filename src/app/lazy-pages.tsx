import { lazy } from "react";

export const AidPackageListPage = lazy(() =>
  import("@/pages/aid-packages/aid-package-list-page").then((module) => ({
    default: module.AidPackageListPage,
  })),
);
export const AidPackagePackingCreatePage = lazy(() =>
  import("@/pages/aid-packages/aid-package-packing-create-page").then(
    (module) => ({ default: module.AidPackagePackingCreatePage }),
  ),
);
export const AidPackagePackingDetailPage = lazy(() =>
  import("@/pages/aid-packages/aid-package-packing-detail-page").then(
    (module) => ({ default: module.AidPackagePackingDetailPage }),
  ),
);
export const AidPackageTemplateCreatePage = lazy(() =>
  import("@/pages/aid-packages/aid-package-template-create-page").then(
    (module) => ({ default: module.AidPackageTemplateCreatePage }),
  ),
);
export const AidPackageTemplateDetailPage = lazy(() =>
  import("@/pages/aid-packages/aid-package-template-detail-page").then(
    (module) => ({ default: module.AidPackageTemplateDetailPage }),
  ),
);
export const ApplicationCreatePage = lazy(() =>
  import("@/pages/applications/application-create-page").then((module) => ({
    default: module.ApplicationCreatePage,
  })),
);
export const ApplicationDetailPage = lazy(() =>
  import("@/pages/applications/application-detail-page").then((module) => ({
    default: module.ApplicationDetailPage,
  })),
);
export const ApplicationListPage = lazy(() =>
  import("@/pages/applications/application-list-page").then((module) => ({
    default: module.ApplicationListPage,
  })),
);
export const ApprovalRequestCreatePage = lazy(() =>
  import("@/pages/approvals/approval-request-create-page").then((module) => ({
    default: module.ApprovalRequestCreatePage,
  })),
);
export const ApprovalRequestDetailPage = lazy(() =>
  import("@/pages/approvals/approval-request-detail-page").then((module) => ({
    default: module.ApprovalRequestDetailPage,
  })),
);
export const ApprovalRequestListPage = lazy(() =>
  import("@/pages/approvals/approval-request-list-page").then((module) => ({
    default: module.ApprovalRequestListPage,
  })),
);
export const ApprovalWorkflowDetailPage = lazy(() =>
  import("@/pages/approvals/approval-workflow-detail-page").then((module) => ({
    default: module.ApprovalWorkflowDetailPage,
  })),
);
export const ApprovalWorkflowFormPage = lazy(() =>
  import("@/pages/approvals/approval-workflow-form-page").then((module) => ({
    default: module.ApprovalWorkflowFormPage,
  })),
);
export const ApprovalWorkflowListPage = lazy(() =>
  import("@/pages/approvals/approval-workflow-list-page").then((module) => ({
    default: module.ApprovalWorkflowListPage,
  })),
);
export const AssessmentCreatePage = lazy(() =>
  import("@/pages/assessments/assessment-create-page").then((module) => ({
    default: module.AssessmentCreatePage,
  })),
);
export const AssessmentDetailPage = lazy(() =>
  import("@/pages/assessments/assessment-detail-page").then((module) => ({
    default: module.AssessmentDetailPage,
  })),
);
export const AssessmentListPage = lazy(() =>
  import("@/pages/assessments/assessment-list-page").then((module) => ({
    default: module.AssessmentListPage,
  })),
);
export const AssessmentTemplateCreatePage = lazy(() =>
  import("@/pages/assessments/assessment-template-create-page").then(
    (module) => ({ default: module.AssessmentTemplateCreatePage }),
  ),
);
export const AssessmentTemplateDetailPage = lazy(() =>
  import("@/pages/assessments/assessment-template-detail-page").then(
    (module) => ({ default: module.AssessmentTemplateDetailPage }),
  ),
);
export const AssessmentTemplateListPage = lazy(() =>
  import("@/pages/assessments/assessment-template-list-page").then(
    (module) => ({ default: module.AssessmentTemplateListPage }),
  ),
);
export const CaseDetailPage = lazy(() =>
  import("@/pages/cases/case-detail-page").then((module) => ({
    default: module.CaseDetailPage,
  })),
);
export const CaseListPage = lazy(() =>
  import("@/pages/cases/case-list-page").then((module) => ({
    default: module.CaseListPage,
  })),
);
export const BeneficiaryProfilePage = lazy(() =>
  import("@/pages/crm/beneficiary-profile-page").then((module) => ({
    default: module.BeneficiaryProfilePage,
  })),
);
export const ContactDetailPage = lazy(() =>
  import("@/pages/crm/contact-detail-page").then((module) => ({
    default: module.ContactDetailPage,
  })),
);
export const ContactFormPage = lazy(() =>
  import("@/pages/crm/contact-form-page").then((module) => ({
    default: module.ContactFormPage,
  })),
);
export const ContactListPage = lazy(() =>
  import("@/pages/crm/contact-list-page").then((module) => ({
    default: module.ContactListPage,
  })),
);
export const InstitutionProfilePage = lazy(() =>
  import("@/pages/crm/institution-profile-page").then((module) => ({
    default: module.InstitutionProfilePage,
  })),
);
export const TagListPage = lazy(() =>
  import("@/pages/crm/tag-list-page").then((module) => ({
    default: module.TagListPage,
  })),
);
export const DistributionCreatePage = lazy(() =>
  import("@/pages/distributions/distribution-create-page").then((module) => ({
    default: module.DistributionCreatePage,
  })),
);
export const DistributionDetailPage = lazy(() =>
  import("@/pages/distributions/distribution-detail-page").then((module) => ({
    default: module.DistributionDetailPage,
  })),
);
export const DistributionListPage = lazy(() =>
  import("@/pages/distributions/distribution-list-page").then((module) => ({
    default: module.DistributionListPage,
  })),
);
export const EvidenceDetailPage = lazy(() =>
  import("@/pages/evidence/evidence-detail-page").then((module) => ({
    default: module.EvidenceDetailPage,
  })),
);
export const EvidenceListPage = lazy(() =>
  import("@/pages/evidence/evidence-list-page").then((module) => ({
    default: module.EvidenceListPage,
  })),
);
export const EvidenceUploadPage = lazy(() =>
  import("@/pages/evidence/evidence-upload-page").then((module) => ({
    default: module.EvidenceUploadPage,
  })),
);
export const ForgotPasswordPage = lazy(() =>
  import("@/pages/forgot-password/forgot-password-page").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
export const FundAllocationDetailPage = lazy(() =>
  import("@/pages/funds/fund-allocation-detail-page").then((module) => ({
    default: module.FundAllocationDetailPage,
  })),
);
export const FundCreatePage = lazy(() =>
  import("@/pages/funds/fund-create-page").then((module) => ({
    default: module.FundCreatePage,
  })),
);
export const FundsDashboardPage = lazy(() =>
  import("@/pages/funds/funds-dashboard-page").then((module) => ({
    default: module.FundsDashboardPage,
  })),
);
export const GovernanceCreatePage = lazy(() =>
  import("@/pages/governance/governance-create-page").then((module) => ({
    default: module.GovernanceCreatePage,
  })),
);
export const GovernancePage = lazy(() =>
  import("@/pages/governance/governance-page").then((module) => ({
    default: module.GovernancePage,
  })),
);
export const InventoryAdjustmentCreatePage = lazy(() =>
  import("@/pages/inventory/inventory-adjustment-create-page").then(
    (module) => ({ default: module.InventoryAdjustmentCreatePage }),
  ),
);
export const InventoryAdjustmentDetailPage = lazy(() =>
  import("@/pages/inventory/inventory-adjustment-detail-page").then(
    (module) => ({ default: module.InventoryAdjustmentDetailPage }),
  ),
);
export const InventoryListPage = lazy(() =>
  import("@/pages/inventory/inventory-list-page").then((module) => ({
    default: module.InventoryListPage,
  })),
);
export const KafalahContractDetailPage = lazy(() =>
  import("@/pages/kafalah/kafalah-contract-detail-page").then((module) => ({
    default: module.KafalahContractDetailPage,
  })),
);
export const KafalahCreatePage = lazy(() =>
  import("@/pages/kafalah/kafalah-create-page").then((module) => ({
    default: module.KafalahCreatePage,
  })),
);
export const KafalahListPage = lazy(() =>
  import("@/pages/kafalah/kafalah-list-page").then((module) => ({
    default: module.KafalahListPage,
  })),
);
export const LoginPage = lazy(() =>
  import("@/pages/login/login-page").then((module) => ({
    default: module.LoginPage,
  })),
);
export const LogisticsCourierCreatePage = lazy(() =>
  import("@/pages/logistics/logistics-courier-create-page").then((module) => ({
    default: module.LogisticsCourierCreatePage,
  })),
);
export const LogisticsListPage = lazy(() =>
  import("@/pages/logistics/logistics-list-page").then((module) => ({
    default: module.LogisticsListPage,
  })),
);
export const LogisticsShipmentCreatePage = lazy(() =>
  import("@/pages/logistics/logistics-shipment-create-page").then((module) => ({
    default: module.LogisticsShipmentCreatePage,
  })),
);
export const LogisticsShipmentDetailPage = lazy(() =>
  import("@/pages/logistics/logistics-shipment-detail-page").then((module) => ({
    default: module.LogisticsShipmentDetailPage,
  })),
);
export const NotFoundPage = lazy(() =>
  import("@/pages/not-found/not-found-page").then((module) => ({
    default: module.NotFoundPage,
  })),
);
export const ProcurementCreatePage = lazy(() =>
  import("@/pages/procurement/procurement-create-page").then((module) => ({
    default: module.ProcurementCreatePage,
  })),
);
export const ProcurementDetailPage = lazy(() =>
  import("@/pages/procurement/procurement-detail-page").then((module) => ({
    default: module.ProcurementDetailPage,
  })),
);
export const ProcurementListPage = lazy(() =>
  import("@/pages/procurement/procurement-list-page").then((module) => ({
    default: module.ProcurementListPage,
  })),
);
export const ProgramCreatePage = lazy(() =>
  import("@/pages/programs/program-create-page").then((module) => ({
    default: module.ProgramCreatePage,
  })),
);
export const ProgramEditPage = lazy(() =>
  import("@/pages/programs/program-edit-page").then((module) => ({
    default: module.ProgramEditPage,
  })),
);
export const ProgramListPage = lazy(() =>
  import("@/pages/programs/program-list-page").then((module) => ({
    default: module.ProgramListPage,
  })),
);
export const ProgramShowPage = lazy(() =>
  import("@/pages/programs/program-show-page").then((module) => ({
    default: module.ProgramShowPage,
  })),
);
export const ReportsPage = lazy(() =>
  import("@/pages/reports/reports-page").then((module) => ({
    default: module.ReportsPage,
  })),
);
export const UnauthorizedPage = lazy(() =>
  import("@/pages/unauthorized/unauthorized-page").then((module) => ({
    default: module.UnauthorizedPage,
  })),
);
export const UpdatePasswordPage = lazy(() =>
  import("@/pages/update-password/update-password-page").then((module) => ({
    default: module.UpdatePasswordPage,
  })),
);
export const WaqfCreatePage = lazy(() =>
  import("@/pages/waqf/waqf-create-page").then((module) => ({
    default: module.WaqfCreatePage,
  })),
);
export const WaqfDetailPage = lazy(() =>
  import("@/pages/waqf/waqf-detail-page").then((module) => ({
    default: module.WaqfDetailPage,
  })),
);
export const WaqfListPage = lazy(() =>
  import("@/pages/waqf/waqf-list-page").then((module) => ({
    default: module.WaqfListPage,
  })),
);
export const FoundationResourcePage = lazy(() =>
  import("@/pages/workspace/foundation-resource-page").then((module) => ({
    default: module.FoundationResourcePage,
  })),
);
export const WorkspacePage = lazy(() =>
  import("@/pages/workspace/workspace-page").then((module) => ({
    default: module.WorkspacePage,
  })),
);
