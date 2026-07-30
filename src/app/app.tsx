import { Refine } from "@refinedev/core";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter } from "react-router";

import { AppRouter } from "@/app/router";
import { OrganizationProvider } from "@/features/organizations/organization-provider";
import { neonDataProvider } from "@/lib/neon/data-provider";
import { accessControlProvider } from "@/providers/access-control-provider";
import { authProvider } from "@/providers/auth-provider";

export function App() {
  return (
    <BrowserRouter>
      <Refine
        accessControlProvider={accessControlProvider}
        authProvider={authProvider}
        dataProvider={neonDataProvider}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
        resources={[
          {
            name: "procurement",
            list: "/procurement",
            create: "/procurement/new",
            show: "/procurement/:id",
            meta: { label: "Pengadaan" },
          },
          {
            name: "inventory_products",
            list: "/inventory",
            meta: { label: "Produk Inventory" },
          },
          {
            name: "inventory_warehouses",
            list: "/inventory",
            meta: { label: "Gudang Inventory" },
          },
          {
            name: "inventory_balances",
            list: "/inventory",
            meta: { label: "Saldo Inventory" },
          },
          {
            name: "inventory_movements",
            list: "/inventory",
            meta: { label: "Movement Inventory" },
          },
          {
            name: "inventory_adjustments",
            list: "/inventory",
            create: "/inventory/adjustments/new",
            show: "/inventory/adjustments/:id",
            meta: { label: "Adjustment Inventory" },
          },
          {
            name: "distributions",
            list: "/distributions",
            create: "/distributions/new",
            show: "/distributions/:id",
            meta: { label: "Distribusi Amanah" },
          },
          {
            name: "fund_restrictions",
            list: "/funds",
            create: "/funds/new/restriction",
            meta: { label: "Dana Amanah" },
          },
          {
            name: "fund_commitments",
            list: "/funds",
            create: "/funds/new/commitment",
            meta: { label: "Komitmen Dana" },
          },
          {
            name: "fund_receipts",
            list: "/funds",
            create: "/funds/new/receipt",
            meta: { label: "Penerimaan Dana" },
          },
          {
            name: "fund_allocations",
            list: "/funds",
            create: "/funds/new/allocation",
            show: "/funds/allocations/:id",
            meta: { label: "Alokasi Dana" },
          },
          {
            name: "fund_disbursements",
            list: "/funds",
            create: "/funds/new/disbursement",
            meta: { label: "Penyaluran Dana" },
          },
          {
            name: "fund_reconciliations",
            list: "/funds",
            create: "/funds/new/reconciliation",
            meta: { label: "Rekonsiliasi Dana" },
          },
          {
            name: "approval_requests",
            list: "/approval-requests",
            create: "/approval-requests/new",
            show: "/approval-requests/:id",
            meta: {
              label: "Permintaan Approval",
            },
          },
          {
            name: "approval_workflows",
            list: "/approval-workflows",
            create: "/approval-workflows/new",
            show: "/approval-workflows/:id",
            meta: {
              label: "Workflow Approval",
            },
          },
          {
            name: "assessments",
            list: "/assessments",
            create: "/assessments/new",
            show: "/assessments/:id",
            meta: {
              label: "Asesmen",
            },
          },
          {
            name: "assessment_templates",
            list: "/assessment-templates",
            create: "/assessment-templates/new",
            show: "/assessment-templates/:id",
            meta: {
              label: "Template Asesmen",
            },
          },
          {
            name: "applications",
            list: "/applications",
            create: "/applications/new",
            show: "/applications/:id",
            meta: {
              label: "Pengajuan",
            },
          },
          {
            name: "cases",
            list: "/cases",
            show: "/cases/:id",
            meta: {
              label: "Kasus",
            },
          },
          {
            name: "programs",
            list: "/programs",
            create: "/programs/new",
            edit: "/programs/:id/edit",
            show: "/programs/:id",
            meta: {
              label: "Program",
            },
          },
          {
            name: "crm_contacts",
            list: "/crm/contacts",
            create: "/crm/contacts/new",
            edit: "/crm/contacts/:id/edit",
            show: "/crm/contacts/:id",
            meta: {
              label: "Contact Master",
            },
          },
          {
            name: "crm_tags",
            list: "/crm/tags",
            meta: {
              label: "CRM Tags",
            },
          },
        ]}
        routerProvider={routerProvider}
      >
        <OrganizationProvider>
          <AppRouter />
        </OrganizationProvider>
        <UnsavedChangesNotifier />
        <DocumentTitleHandler />
      </Refine>
    </BrowserRouter>
  );
}
