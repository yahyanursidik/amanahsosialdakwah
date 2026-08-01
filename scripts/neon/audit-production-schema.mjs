import { createPool, loadDotEnv } from "./shared.mjs";

loadDotEnv();

if (
  process.env.NEON_BRANCH !== "production" &&
  !process.env.NEON_BRANCH?.startsWith("prod-rehearsal-")
) {
  throw new Error(
    "Audit ini hanya boleh dijalankan pada branch production atau rehearsal production.",
  );
}

const pool = createPool({ direct: true });

try {
  const migrationTable = await pool.query(
    "select to_regclass('public.schema_migrations')::text as name",
  );
  const migrations = migrationTable.rows[0]?.name
    ? await pool.query(
        "select version, applied_at from public.schema_migrations order by version",
      )
    : { rows: [] };
  const tables = await pool.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const roles = await pool.query(`
    select rolname
    from pg_roles
    where rolname in ('app_runtime', current_user)
    order by rolname
  `);
  const triggers = await pool.query(`
    select event_object_table as table_name, trigger_name
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table in (
        'approval_actions', 'approval_requests', 'fund_ledger_entries',
        'fund_reversals', 'fund_reconciliations', 'distribution_events',
        'distribution_executions', 'distribution_confirmations',
        'distribution_evidence', 'distribution_verifications',
        'procurement_events', 'goods_receipts', 'vendor_invoices'
      )
    order by event_object_table, trigger_name
  `);
  const distributionPolicies = await pool.query(`
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename like 'distribution_%'
    order by tablename, policyname
  `);
  const distributionPermissions = await pool.query(`
    select key
    from public.permissions
    where resource in ('distributions', 'distribution_evidence')
    order by key
  `);
  const roleAccounts = await pool.query(`
    select
      auth_user.email,
      profile.status as profile_status,
      membership.status as membership_status,
      organization.code as organization_code,
      role.key as role_key
    from neon_auth."user" auth_user
    left join public.profiles profile on profile.auth_user_id = auth_user.id::text
    left join public.memberships membership on membership.profile_id = profile.id
    left join public.organizations organization on organization.id = membership.organization_id
    left join public.membership_roles membership_role on membership_role.membership_id = membership.id
    left join public.roles role on role.id = membership_role.role_id
    where lower(auth_user.email) in (
      'owner@ihsanuladab.or.id',
      'admin@ihsanuladab.or.id',
      'field.officer@ihsanuladab.or.id',
      'auditor@ihsanuladab.or.id'
    )
    order by auth_user.email, organization.code, role.key
  `);
  const organizations = await pool.query(`
    select code, name, status
    from public.organizations
    order by created_at
  `);
  const systemRoles = await pool.query(`
    select key, name, is_system
    from public.roles
    where organization_id is null
    order by key
  `);
  const relations = await pool.query(`
    select relation_name, to_regclass('public.' || relation_name)::text as resolved
    from unnest(array[
      'organizations', 'profiles', 'memberships', 'roles', 'permissions',
      'programs', 'crm_contacts', 'aid_applications', 'beneficiary_cases',
      'assessment_templates', 'case_assessments', 'approval_workflows',
      'approval_requests', 'fund_ledger_entries', 'distribution_plans',
      'procurement_requests', 'inventory_movements',
      'aid_package_templates'
    ]) as relation_name
  `);

  const accountsOnly = process.argv.includes("--accounts-only");

  console.log(
    JSON.stringify(
      accountsOnly
        ? {
            branch: process.env.NEON_BRANCH,
            organizations: organizations.rows,
            roleAccounts: roleAccounts.rows,
            systemRoles: systemRoles.rows,
          }
        : {
            branch: process.env.NEON_BRANCH,
            migrationTable: migrationTable.rows[0]?.name ?? null,
            migrations: migrations.rows,
            relations: relations.rows,
            roles: roles.rows.map((row) => row.rolname),
            triggers: triggers.rows,
            distributionPolicies: distributionPolicies.rows,
            distributionPermissions: distributionPermissions.rows.map(
              (row) => row.key,
            ),
            roleAccounts: roleAccounts.rows,
            tableCount: tables.rowCount,
            tables: tables.rows.map((row) => row.table_name),
          },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
