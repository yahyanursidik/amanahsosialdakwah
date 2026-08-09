import { Authenticated } from "@refinedev/core";
import { Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import {
  AidPackageListPage,
  AidPackagePackingCreatePage,
  AidPackagePackingDetailPage,
  AidPackageTemplateCreatePage,
  AidPackageTemplateDetailPage,
  ApplicationCreatePage,
  ApplicationDetailPage,
  ApplicationListPage,
  ApprovalRequestCreatePage,
  ApprovalRequestDetailPage,
  ApprovalRequestListPage,
  ApprovalWorkflowDetailPage,
  ApprovalWorkflowFormPage,
  ApprovalWorkflowListPage,
  AssessmentCreatePage,
  AssessmentDetailPage,
  AssessmentListPage,
  AssessmentTemplateCreatePage,
  AssessmentTemplateDetailPage,
  AssessmentTemplateListPage,
  BeneficiaryProfilePage,
  CaseDetailPage,
  CaseListPage,
  ContactDetailPage,
  ContactFormPage,
  ContactListPage,
  DistributionCreatePage,
  DistributionDetailPage,
  DistributionListPage,
  EvidenceDetailPage,
  EvidenceListPage,
  EvidenceUploadPage,
  ForgotPasswordPage,
  FoundationResourcePage,
  FundAllocationDetailPage,
  FundCreatePage,
  FundsDashboardPage,
  GovernanceCreatePage,
  GovernancePage,
  InstitutionProfilePage,
  InventoryAdjustmentCreatePage,
  InventoryAdjustmentDetailPage,
  InventoryListPage,
  KafalahContractDetailPage,
  KafalahCreatePage,
  KafalahListPage,
  LoginPage,
  LogisticsCourierCreatePage,
  LogisticsListPage,
  LogisticsShipmentCreatePage,
  LogisticsShipmentDetailPage,
  NotFoundPage,
  ProcurementCreatePage,
  ProcurementDetailPage,
  ProcurementListPage,
  ProgramCreatePage,
  ProgramEditPage,
  ProgramListPage,
  ProgramShowPage,
  ReportsPage,
  TagListPage,
  UnauthorizedPage,
  UpdatePasswordPage,
  WaqfCreatePage,
  WaqfDetailPage,
  WaqfListPage,
  WorkspacePage,
} from "@/app/lazy-pages";
import { ProtectedRoute } from "@/components/access-control/protected-route";
import { AppBoot } from "@/components/layout/app-boot";
import { AppLayout } from "@/components/layout/app-layout";
import { OrganizationGuard } from "@/features/organizations/organization-guard";

function AuthenticationCheck() {
  return <AppBoot message="Memeriksa sesi…" />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<AppBoot message="Memuat halamanâ€¦" />}>
      <Routes>
        <Route
          element={
            <Authenticated
              key="protected-routes"
              redirectOnFail="/login"
              loading={<AuthenticationCheck />}
            >
              <Outlet />
            </Authenticated>
          }
        >
          <Route element={<AppLayout />}>
            <Route
              path="/account/password"
              element={<UpdatePasswordPage mode="session" />}
            />
          </Route>
          <Route element={<OrganizationGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<WorkspacePage />} />
              <Route
                element={<ProtectedRoute action="read" resource="risk_flags" />}
              >
                <Route path="/governance" element={<GovernancePage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="risk_flags" />
                }
              >
                <Route
                  path="/governance/new/risk"
                  element={<GovernanceCreatePage kind="risk" />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="report"
                    resource="governance_incidents"
                  />
                }
              >
                <Route
                  path="/governance/new/incident"
                  element={<GovernanceCreatePage kind="incident" />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="record" resource="complaints" />
                }
              >
                <Route
                  path="/governance/new/complaint"
                  element={<GovernanceCreatePage kind="complaint" />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="corrective_actions"
                  />
                }
              >
                <Route
                  path="/governance/new/corrective-action"
                  element={<GovernanceCreatePage kind="corrective-action" />}
                />
              </Route>
              <Route
                element={<ProtectedRoute action="read" resource="reports" />}
              >
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="organizations" />
                }
              >
                <Route
                  path="/organizations"
                  element={
                    <FoundationResourcePage
                      resource="organizations"
                      title="Organisasi"
                    />
                  }
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="memberships" />
                }
              >
                <Route
                  path="/memberships"
                  element={
                    <FoundationResourcePage
                      resource="memberships"
                      title="Membership"
                    />
                  }
                />
              </Route>
              <Route
                element={<ProtectedRoute action="read" resource="roles" />}
              >
                <Route
                  path="/roles"
                  element={
                    <FoundationResourcePage resource="roles" title="Role" />
                  }
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="crm_contacts" />
                }
              >
                <Route path="/crm/contacts" element={<ContactListPage />} />
                <Route path="/crm/contacts/new" element={<ContactFormPage />} />
                <Route
                  path="/crm/contacts/:id/edit"
                  element={<ContactFormPage />}
                />
                <Route
                  path="/crm/contacts/:id"
                  element={<ContactDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="crm_beneficiary_profiles"
                  />
                }
              >
                <Route
                  path="/crm/contacts/:id/beneficiary"
                  element={<BeneficiaryProfilePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="crm_institution_profiles"
                  />
                }
              >
                <Route
                  path="/crm/contacts/:id/institution"
                  element={<InstitutionProfilePage />}
                />
              </Route>
              <Route
                element={<ProtectedRoute action="read" resource="crm_tags" />}
              >
                <Route path="/crm/tags" element={<TagListPage />} />
              </Route>
              <Route
                element={<ProtectedRoute action="read" resource="programs" />}
              >
                <Route path="/programs" element={<ProgramListPage />} />
                <Route path="/programs/new" element={<ProgramCreatePage />} />
                <Route
                  path="/programs/:id/edit"
                  element={<ProgramEditPage />}
                />
                <Route path="/programs/:id" element={<ProgramShowPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="applications" />
                }
              >
                <Route path="/applications" element={<ApplicationListPage />} />
                <Route
                  path="/applications/:id"
                  element={<ApplicationDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="applications" />
                }
              >
                <Route
                  path="/applications/new"
                  element={<ApplicationCreatePage />}
                />
              </Route>
              <Route
                element={<ProtectedRoute action="read" resource="cases" />}
              >
                <Route path="/cases" element={<CaseListPage />} />
                <Route path="/cases/:id" element={<CaseDetailPage />} />
              </Route>
              <Route
                element={<ProtectedRoute action="read" resource="kafalah" />}
              >
                <Route path="/kafalah" element={<KafalahListPage />} />
                <Route
                  path="/kafalah/contracts/:id"
                  element={<KafalahContractDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="kafalah_needs" />
                }
              >
                <Route
                  path="/kafalah/needs/new"
                  element={<KafalahCreatePage kind="need" />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="kafalah_matches" />
                }
              >
                <Route
                  path="/kafalah/matches/new"
                  element={<KafalahCreatePage kind="match" />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="kafalah_contracts"
                  />
                }
              >
                <Route
                  path="/kafalah/contracts/new"
                  element={<KafalahCreatePage kind="contract" />}
                />
              </Route>
              <Route element={<ProtectedRoute action="read" resource="waqf" />}>
                <Route path="/waqf" element={<WaqfListPage />} />
                <Route path="/waqf/assets/:id" element={<WaqfDetailPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="waqf_assets" />
                }
              >
                <Route path="/waqf/assets/new" element={<WaqfCreatePage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="approval_workflows" />
                }
              >
                <Route
                  path="/approval-workflows"
                  element={<ApprovalWorkflowListPage />}
                />
                <Route
                  path="/approval-workflows/:id"
                  element={<ApprovalWorkflowDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="approval_workflows"
                  />
                }
              >
                <Route
                  path="/approval-workflows/new"
                  element={<ApprovalWorkflowFormPage />}
                />
                <Route
                  path="/approval-workflows/:id/versions/new"
                  element={<ApprovalWorkflowFormPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="approval_requests" />
                }
              >
                <Route
                  path="/approval-requests"
                  element={<ApprovalRequestListPage />}
                />
                <Route
                  path="/approval-requests/:id"
                  element={<ApprovalRequestDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="create"
                    resource="approval_requests"
                  />
                }
              >
                <Route
                  path="/approval-requests/new"
                  element={<ApprovalRequestCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="assessment_templates"
                  />
                }
              >
                <Route
                  path="/assessment-templates"
                  element={<AssessmentTemplateListPage />}
                />
                <Route
                  path="/assessment-templates/:id"
                  element={<AssessmentTemplateDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="assessment_templates"
                  />
                }
              >
                <Route
                  path="/assessment-templates/new"
                  element={<AssessmentTemplateCreatePage />}
                />
                <Route
                  path="/assessment-templates/:id/versions/new"
                  element={<AssessmentTemplateCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="assessments" />
                }
              >
                <Route path="/assessments" element={<AssessmentListPage />} />
                <Route
                  path="/assessments/:id"
                  element={<AssessmentDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="assessments" />
                }
              >
                <Route
                  path="/assessments/new"
                  element={<AssessmentCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="procurement_requests"
                  />
                }
              >
                <Route path="/procurement" element={<ProcurementListPage />} />
                <Route
                  path="/procurement/:id"
                  element={<ProcurementDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="procurement_requests"
                  />
                }
              >
                <Route
                  path="/procurement/new"
                  element={<ProcurementCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="inventory_balances" />
                }
              >
                <Route path="/inventory" element={<InventoryListPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="logistics_shipments"
                  />
                }
              >
                <Route path="/logistics" element={<LogisticsListPage />} />
                <Route
                  path="/logistics/shipments/:id"
                  element={<LogisticsShipmentDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="logistics_shipments"
                  />
                }
              >
                <Route
                  path="/logistics/shipments/new"
                  element={<LogisticsShipmentCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="logistics_couriers"
                  />
                }
              >
                <Route
                  path="/logistics/couriers/new"
                  element={<LogisticsCourierCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="inventory_adjustments"
                  />
                }
              >
                <Route
                  path="/inventory/adjustments/new"
                  element={<InventoryAdjustmentCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="aid_package_packings"
                  />
                }
              >
                <Route path="/aid-packages" element={<AidPackageListPage />} />
                <Route
                  path="/aid-packages/packings/:id"
                  element={<AidPackagePackingDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="aid_package_templates"
                  />
                }
              >
                <Route
                  path="/aid-packages/templates/:id"
                  element={<AidPackageTemplateDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="aid_package_templates"
                  />
                }
              >
                <Route
                  path="/aid-packages/templates/new"
                  element={<AidPackageTemplateCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="aid_package_packings"
                  />
                }
              >
                <Route
                  path="/aid-packages/packings/new"
                  element={<AidPackagePackingCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="read"
                    resource="inventory_adjustments"
                  />
                }
              >
                <Route
                  path="/inventory/adjustments/:id"
                  element={<InventoryAdjustmentDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="fund_ledger" />
                }
              >
                <Route path="/funds" element={<FundsDashboardPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="distributions" />
                }
              >
                <Route
                  path="/distributions"
                  element={<DistributionListPage />}
                />
                <Route
                  path="/distributions/:id"
                  element={<DistributionDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="evidence_files" />
                }
              >
                <Route path="/evidence" element={<EvidenceListPage />} />
                <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="upload" resource="evidence_files" />
                }
              >
                <Route
                  path="/evidence/upload"
                  element={<EvidenceUploadPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="distributions" />
                }
              >
                <Route
                  path="/distributions/new"
                  element={<DistributionCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="read" resource="fund_allocations" />
                }
              >
                <Route
                  path="/funds/allocations/:id"
                  element={<FundAllocationDetailPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="fund_restrictions"
                  />
                }
              >
                <Route
                  path="/funds/new/restriction"
                  element={<FundCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="fund_commitments" />
                }
              >
                <Route
                  path="/funds/new/commitment"
                  element={<FundCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="post" resource="fund_receipts" />
                }
              >
                <Route path="/funds/new/receipt" element={<FundCreatePage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="manage" resource="fund_allocations" />
                }
              >
                <Route
                  path="/funds/new/allocation"
                  element={<FundCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute action="post" resource="fund_disbursements" />
                }
              >
                <Route
                  path="/funds/new/disbursement"
                  element={<FundCreatePage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    action="manage"
                    resource="fund_reconciliations"
                  />
                }
              >
                <Route
                  path="/funds/new/reconciliation"
                  element={<FundCreatePage />}
                />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route
          path="/login"
          element={
            <Authenticated
              key="login-route"
              fallback={<Outlet />}
              loading={<AuthenticationCheck />}
            >
              <Navigate to="/" replace />
            </Authenticated>
          }
        >
          <Route index element={<LoginPage />} />
        </Route>

        <Route
          path="/forgot-password"
          element={
            <Authenticated
              key="forgot-password-route"
              fallback={<ForgotPasswordPage />}
              loading={<AuthenticationCheck />}
            >
              <Navigate to="/" replace />
            </Authenticated>
          }
        />
        <Route
          path="/update-password"
          element={<UpdatePasswordPage mode="recovery" />}
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
