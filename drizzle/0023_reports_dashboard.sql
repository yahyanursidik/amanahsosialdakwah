INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('reports.read', 'reports', 'read', 'Melihat laporan agregat dan dashboard organisasi')
ON CONFLICT (key) DO UPDATE SET
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key = 'reports.read'
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_approval_requests_reporting
  ON public.approval_requests (organization_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_distribution_plans_reporting
  ON public.distribution_plans (organization_id, program_id, status, completed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_reporting
  ON public.inventory_batches (organization_id, expires_at, status)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_reporting
  ON public.logistics_shipments (organization_id, status, planned_dispatch_at);
CREATE INDEX IF NOT EXISTS idx_beneficiary_cases_reporting
  ON public.beneficiary_cases (organization_id, program_id, status, created_at);
--> statement-breakpoint
