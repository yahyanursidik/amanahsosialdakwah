import { createPool, loadDotEnv } from "./shared.mjs";

loadDotEnv();

const branch = process.env.NEON_BRANCH ?? "";
const isRehearsal = branch.startsWith("prod-rehearsal-");
const productionAllowed =
  branch === "production" &&
  process.env.NEON_ALLOW_PRODUCTION_RECONCILE === "1";

if (!isRehearsal && !productionAllowed) {
  throw new Error(
    "Rekonsiliasi hanya boleh dijalankan pada branch rehearsal production atau production dengan NEON_ALLOW_PRODUCTION_RECONCILE=1.",
  );
}

const baseline = [
  {
    version: "0001_multi_tenant_foundation.sql",
    tables: [
      "organizations",
      "profiles",
      "organization_units",
      "memberships",
      "roles",
      "permissions",
      "role_permissions",
      "membership_roles",
      "organization_relationships",
    ],
  },
  {
    version: "0002_app_runtime_role.sql",
    tables: ["organizations", "memberships", "roles", "permissions"],
  },
  {
    version: "0003_grant_runtime_to_owner.sql",
    tables: [],
  },
  {
    version: "0004_programs_crm_foundation.sql",
    tables: [
      "program_categories",
      "programs",
      "program_revisions",
      "crm_contacts",
      "crm_contact_roles",
      "crm_sensitive_identities",
      "crm_beneficiary_profiles",
      "crm_institution_profiles",
      "crm_tags",
      "crm_contact_tags",
      "crm_interactions",
      "crm_consents",
      "crm_duplicate_candidates",
      "crm_merge_requests",
    ],
  },
  {
    version: "0005_runtime_private_schema_grants.sql",
    tables: [],
  },
  {
    version: "drizzle/0001_applications_cases.sql",
    tables: [
      "aid_applications",
      "application_screenings",
      "beneficiary_cases",
      "application_case_events",
      "audit_events",
    ],
  },
  {
    version: "drizzle/0002_harden_application_case_audit_policies.sql",
    tables: ["application_case_events", "audit_events"],
  },
  {
    version: "drizzle/0006_wealthy_madame_web.sql",
    tables: [
      "approval_workflows",
      "approval_workflow_versions",
      "approval_workflow_steps",
      "approval_requests",
      "approval_request_steps",
      "approval_actions",
    ],
  },
  {
    version: "drizzle/0007_dusty_sauron.sql",
    tables: ["approval_requests", "approval_request_steps", "approval_actions"],
  },
  {
    version: "drizzle/0008_magenta_boomer.sql",
    tables: [
      "fund_restrictions",
      "fund_commitments",
      "fund_receipts",
      "fund_allocations",
      "fund_disbursements",
      "fund_reversals",
      "fund_ledger_entries",
      "fund_reconciliations",
      "fund_idempotency_records",
    ],
  },
  {
    version: "drizzle/0009_lyrical_mongoose.sql",
    tables: ["fund_allocations", "fund_ledger_entries", "fund_reversals"],
  },
  {
    version: "drizzle/0010_optimal_sebastian_shaw.sql",
    tables: ["fund_commitments", "fund_ledger_entries", "fund_reversals"],
  },
  {
    version: "drizzle/0011_magenta_morlocks.sql",
    tables: [
      "distribution_plans",
      "distribution_assignments",
      "distribution_executions",
      "distribution_confirmations",
      "distribution_evidence",
      "distribution_verifications",
      "distribution_events",
      "distribution_idempotency_records",
    ],
  },
  {
    version: "drizzle/0012_procurement_vertical_slice.sql",
    tables: [
      "procurement_requests",
      "purchase_orders",
      "goods_receipts",
      "vendor_invoices",
      "procurement_events",
      "procurement_idempotency_records",
    ],
  },
];

const pool = createPool({ direct: true });

try {
  await pool.query("begin");
  await pool.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const role = await pool.query(
    "select 1 from pg_roles where rolname = 'app_runtime'",
  );
  if (role.rowCount !== 1) {
    throw new Error("Role app_runtime tidak ditemukan; baseline dibatalkan.");
  }

  for (const migration of baseline) {
    for (const table of migration.tables) {
      const relation = await pool.query(
        "select to_regclass($1)::text as relation",
        [`public.${table}`],
      );
      if (!relation.rows[0]?.relation) {
        throw new Error(
          `Tidak dapat membaseline ${migration.version}; tabel ${table} tidak ditemukan.`,
        );
      }
    }

    await pool.query(
      `insert into public.schema_migrations (version)
       values ($1) on conflict (version) do nothing`,
      [migration.version],
    );
    console.log(`Baseline terverifikasi: ${migration.version}`);
  }

  await pool.query("commit");
} catch (error) {
  await pool.query("rollback");
  throw error;
} finally {
  await pool.end();
}
