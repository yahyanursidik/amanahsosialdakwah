import { Authenticated } from "@refinedev/core";
import { Navigate, Outlet, Route, Routes } from "react-router";

import { ProtectedRoute } from "@/components/access-control/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { OrganizationGuard } from "@/features/organizations/organization-guard";
import { ApplicationCreatePage } from "@/pages/applications/application-create-page";
import { ApplicationDetailPage } from "@/pages/applications/application-detail-page";
import { ApplicationListPage } from "@/pages/applications/application-list-page";
import { ApprovalRequestCreatePage } from "@/pages/approvals/approval-request-create-page";
import { ApprovalRequestDetailPage } from "@/pages/approvals/approval-request-detail-page";
import { ApprovalRequestListPage } from "@/pages/approvals/approval-request-list-page";
import { ApprovalWorkflowDetailPage } from "@/pages/approvals/approval-workflow-detail-page";
import { ApprovalWorkflowFormPage } from "@/pages/approvals/approval-workflow-form-page";
import { ApprovalWorkflowListPage } from "@/pages/approvals/approval-workflow-list-page";
import { AssessmentCreatePage } from "@/pages/assessments/assessment-create-page";
import { AssessmentDetailPage } from "@/pages/assessments/assessment-detail-page";
import { AssessmentListPage } from "@/pages/assessments/assessment-list-page";
import { AssessmentTemplateCreatePage } from "@/pages/assessments/assessment-template-create-page";
import { AssessmentTemplateDetailPage } from "@/pages/assessments/assessment-template-detail-page";
import { AssessmentTemplateListPage } from "@/pages/assessments/assessment-template-list-page";
import { CaseDetailPage } from "@/pages/cases/case-detail-page";
import { CaseListPage } from "@/pages/cases/case-list-page";
import { BeneficiaryProfilePage } from "@/pages/crm/beneficiary-profile-page";
import { ContactDetailPage } from "@/pages/crm/contact-detail-page";
import { ContactFormPage } from "@/pages/crm/contact-form-page";
import { ContactListPage } from "@/pages/crm/contact-list-page";
import { InstitutionProfilePage } from "@/pages/crm/institution-profile-page";
import { TagListPage } from "@/pages/crm/tag-list-page";
import { ForgotPasswordPage } from "@/pages/forgot-password/forgot-password-page";
import { DistributionCreatePage } from "@/pages/distributions/distribution-create-page";
import { DistributionDetailPage } from "@/pages/distributions/distribution-detail-page";
import { DistributionListPage } from "@/pages/distributions/distribution-list-page";
import { FundAllocationDetailPage } from "@/pages/funds/fund-allocation-detail-page";
import { FundCreatePage } from "@/pages/funds/fund-create-page";
import { FundsDashboardPage } from "@/pages/funds/funds-dashboard-page";
import { LoginPage } from "@/pages/login/login-page";
import { NotFoundPage } from "@/pages/not-found/not-found-page";
import { ProgramCreatePage } from "@/pages/programs/program-create-page";
import { ProgramEditPage } from "@/pages/programs/program-edit-page";
import { ProgramListPage } from "@/pages/programs/program-list-page";
import { ProgramShowPage } from "@/pages/programs/program-show-page";
import { ProcurementCreatePage } from "@/pages/procurement/procurement-create-page";
import { ProcurementDetailPage } from "@/pages/procurement/procurement-detail-page";
import { ProcurementListPage } from "@/pages/procurement/procurement-list-page";
import { UnauthorizedPage } from "@/pages/unauthorized/unauthorized-page";
import { UpdatePasswordPage } from "@/pages/update-password/update-password-page";
import { FoundationResourcePage } from "@/pages/workspace/foundation-resource-page";
import { WorkspacePage } from "@/pages/workspace/workspace-page";

function AuthenticationCheck() {
  return (
    <main className="system-page" aria-busy="true">
      <div className="system-page__inner">
        <p>Memeriksa sesi…</p>
      </div>
    </main>
  );
}

export function AppRouter() {
  return (
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
              element={<ProtectedRoute action="read" resource="memberships" />}
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
            <Route element={<ProtectedRoute action="read" resource="roles" />}>
              <Route
                path="/roles"
                element={
                  <FoundationResourcePage resource="roles" title="Role" />
                }
              />
            </Route>
            <Route
              element={<ProtectedRoute action="read" resource="crm_contacts" />}
            >
              <Route path="/crm/contacts" element={<ContactListPage />} />
              <Route path="/crm/contacts/new" element={<ContactFormPage />} />
              <Route
                path="/crm/contacts/:id/edit"
                element={<ContactFormPage />}
              />
              <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
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
              <Route path="/programs/:id/edit" element={<ProgramEditPage />} />
              <Route path="/programs/:id" element={<ProgramShowPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute action="read" resource="applications" />
              }
            >
              <Route
                path="/applications"
                element={<ApplicationListPage />}
              />
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
            <Route element={<ProtectedRoute action="read" resource="cases" />}>
              <Route path="/cases" element={<CaseListPage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
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
                <ProtectedRoute action="manage" resource="approval_workflows" />
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
                <ProtectedRoute action="create" resource="approval_requests" />
              }
            >
              <Route
                path="/approval-requests/new"
                element={<ApprovalRequestCreatePage />}
              />
            </Route>
            <Route
              element={
                <ProtectedRoute action="read" resource="assessment_templates" />
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
              element={<ProtectedRoute action="read" resource="assessments" />}
            >
              <Route path="/assessments" element={<AssessmentListPage />} />
              <Route
                path="/assessments/:id"
                element={<AssessmentDetailPage />}
              />
            </Route>
            <Route
              element={<ProtectedRoute action="manage" resource="assessments" />}
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
              element={<ProtectedRoute action="read" resource="fund_ledger" />}
            >
              <Route path="/funds" element={<FundsDashboardPage />} />
            </Route>
            <Route
              element={<ProtectedRoute action="read" resource="distributions" />}
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
                <ProtectedRoute action="manage" resource="fund_restrictions" />
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
              element={<ProtectedRoute action="post" resource="fund_receipts" />}
            >
              <Route path="/funds/new/receipt" element={<FundCreatePage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute action="manage" resource="fund_allocations" />
              }
            >
              <Route path="/funds/new/allocation" element={<FundCreatePage />} />
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
  );
}
