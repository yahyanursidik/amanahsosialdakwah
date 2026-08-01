DROP POLICY IF EXISTS distribution_assignments_select ON public.distribution_assignments;
DROP POLICY IF EXISTS distribution_assignments_insert ON public.distribution_assignments;
DROP POLICY IF EXISTS distribution_assignments_update ON public.distribution_assignments;
DROP POLICY IF EXISTS distribution_assignments_delete ON public.distribution_assignments;
CREATE POLICY distribution_assignments_select ON public.distribution_assignments FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.read'));
CREATE POLICY distribution_assignments_insert ON public.distribution_assignments FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.assign'));
CREATE POLICY distribution_assignments_update ON public.distribution_assignments FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.assign'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.assign'));
CREATE POLICY distribution_assignments_delete ON public.distribution_assignments FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_confirmations_select ON public.distribution_confirmations;
DROP POLICY IF EXISTS distribution_confirmations_insert ON public.distribution_confirmations;
DROP POLICY IF EXISTS distribution_confirmations_update ON public.distribution_confirmations;
DROP POLICY IF EXISTS distribution_confirmations_delete ON public.distribution_confirmations;
CREATE POLICY distribution_confirmations_select ON public.distribution_confirmations FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.read'));
CREATE POLICY distribution_confirmations_insert ON public.distribution_confirmations FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.confirm') AND recorded_by = private.current_profile_id());
CREATE POLICY distribution_confirmations_update ON public.distribution_confirmations FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY distribution_confirmations_delete ON public.distribution_confirmations FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_events_select ON public.distribution_events;
DROP POLICY IF EXISTS distribution_events_insert ON public.distribution_events;
DROP POLICY IF EXISTS distribution_events_update ON public.distribution_events;
DROP POLICY IF EXISTS distribution_events_delete ON public.distribution_events;
CREATE POLICY distribution_events_select ON public.distribution_events FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.read'));
CREATE POLICY distribution_events_insert ON public.distribution_events FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND actor_profile_id = private.current_profile_id() AND (
    private.has_permission(organization_id, 'distributions.manage') OR
    private.has_permission(organization_id, 'distributions.ready') OR
    private.has_permission(organization_id, 'distributions.assign') OR
    private.has_permission(organization_id, 'distributions.execute') OR
    private.has_permission(organization_id, 'distributions.confirm') OR
    private.has_permission(organization_id, 'distributions.verify') OR
    private.has_permission(organization_id, 'distributions.complete') OR
    private.has_permission(organization_id, 'distributions.cancel') OR
    private.has_permission(organization_id, 'distribution_evidence.manage')
  ));
CREATE POLICY distribution_events_update ON public.distribution_events FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY distribution_events_delete ON public.distribution_events FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_evidence_select ON public.distribution_evidence;
DROP POLICY IF EXISTS distribution_evidence_insert ON public.distribution_evidence;
DROP POLICY IF EXISTS distribution_evidence_update ON public.distribution_evidence;
DROP POLICY IF EXISTS distribution_evidence_delete ON public.distribution_evidence;
CREATE POLICY distribution_evidence_select ON public.distribution_evidence FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distribution_evidence.read'));
CREATE POLICY distribution_evidence_insert ON public.distribution_evidence FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distribution_evidence.manage') AND created_by = private.current_profile_id());
CREATE POLICY distribution_evidence_update ON public.distribution_evidence FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY distribution_evidence_delete ON public.distribution_evidence FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_executions_select ON public.distribution_executions;
DROP POLICY IF EXISTS distribution_executions_insert ON public.distribution_executions;
DROP POLICY IF EXISTS distribution_executions_update ON public.distribution_executions;
DROP POLICY IF EXISTS distribution_executions_delete ON public.distribution_executions;
CREATE POLICY distribution_executions_select ON public.distribution_executions FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.read'));
CREATE POLICY distribution_executions_insert ON public.distribution_executions FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.execute') AND executed_by = private.current_profile_id());
CREATE POLICY distribution_executions_update ON public.distribution_executions FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY distribution_executions_delete ON public.distribution_executions FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_idempotency_select ON public.distribution_idempotency_records;
DROP POLICY IF EXISTS distribution_idempotency_insert ON public.distribution_idempotency_records;
DROP POLICY IF EXISTS distribution_idempotency_update ON public.distribution_idempotency_records;
DROP POLICY IF EXISTS distribution_idempotency_delete ON public.distribution_idempotency_records;
CREATE POLICY distribution_idempotency_select ON public.distribution_idempotency_records FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'distributions.ready') OR
    private.has_permission(organization_id, 'distributions.assign') OR
    private.has_permission(organization_id, 'distributions.execute') OR
    private.has_permission(organization_id, 'distributions.confirm') OR
    private.has_permission(organization_id, 'distributions.verify') OR
    private.has_permission(organization_id, 'distributions.complete') OR
    private.has_permission(organization_id, 'distributions.cancel') OR
    private.has_permission(organization_id, 'distribution_evidence.manage')
  ));
CREATE POLICY distribution_idempotency_insert ON public.distribution_idempotency_records FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'distributions.ready') OR
    private.has_permission(organization_id, 'distributions.assign') OR
    private.has_permission(organization_id, 'distributions.execute') OR
    private.has_permission(organization_id, 'distributions.confirm') OR
    private.has_permission(organization_id, 'distributions.verify') OR
    private.has_permission(organization_id, 'distributions.complete') OR
    private.has_permission(organization_id, 'distributions.cancel') OR
    private.has_permission(organization_id, 'distribution_evidence.manage')
  ));
CREATE POLICY distribution_idempotency_update ON public.distribution_idempotency_records FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'distributions.ready') OR
    private.has_permission(organization_id, 'distributions.assign') OR
    private.has_permission(organization_id, 'distributions.execute') OR
    private.has_permission(organization_id, 'distributions.confirm') OR
    private.has_permission(organization_id, 'distributions.verify') OR
    private.has_permission(organization_id, 'distributions.complete') OR
    private.has_permission(organization_id, 'distributions.cancel') OR
    private.has_permission(organization_id, 'distribution_evidence.manage')
  ))
  WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'distributions.ready') OR
    private.has_permission(organization_id, 'distributions.assign') OR
    private.has_permission(organization_id, 'distributions.execute') OR
    private.has_permission(organization_id, 'distributions.confirm') OR
    private.has_permission(organization_id, 'distributions.verify') OR
    private.has_permission(organization_id, 'distributions.complete') OR
    private.has_permission(organization_id, 'distributions.cancel') OR
    private.has_permission(organization_id, 'distribution_evidence.manage')
  ));
CREATE POLICY distribution_idempotency_delete ON public.distribution_idempotency_records FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_plans_select ON public.distribution_plans;
DROP POLICY IF EXISTS distribution_plans_insert ON public.distribution_plans;
DROP POLICY IF EXISTS distribution_plans_update ON public.distribution_plans;
DROP POLICY IF EXISTS distribution_plans_delete ON public.distribution_plans;
CREATE POLICY distribution_plans_select ON public.distribution_plans FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.read'));
CREATE POLICY distribution_plans_insert ON public.distribution_plans FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.manage'));
CREATE POLICY distribution_plans_update ON public.distribution_plans FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'distributions.ready') OR
    private.has_permission(organization_id, 'distributions.assign') OR
    private.has_permission(organization_id, 'distributions.execute') OR
    private.has_permission(organization_id, 'distributions.confirm') OR
    private.has_permission(organization_id, 'distributions.verify') OR
    private.has_permission(organization_id, 'distributions.complete') OR
    private.has_permission(organization_id, 'distributions.cancel')
  ))
  WITH CHECK (private.has_active_membership(organization_id) AND (
    (status = 'draft' AND private.has_permission(organization_id, 'distributions.manage')) OR
    (status = 'ready' AND private.has_permission(organization_id, 'distributions.ready')) OR
    (status = 'assigned' AND private.has_permission(organization_id, 'distributions.assign')) OR
    (status IN ('in_progress', 'executed') AND private.has_permission(organization_id, 'distributions.execute')) OR
    (status = 'confirmed' AND private.has_permission(organization_id, 'distributions.confirm')) OR
    (status IN ('verified', 'revision_required') AND private.has_permission(organization_id, 'distributions.verify')) OR
    (status = 'completed' AND private.has_permission(organization_id, 'distributions.complete')) OR
    (status = 'cancelled' AND private.has_permission(organization_id, 'distributions.cancel'))
  ));
CREATE POLICY distribution_plans_delete ON public.distribution_plans FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
DROP POLICY IF EXISTS distribution_verifications_select ON public.distribution_verifications;
DROP POLICY IF EXISTS distribution_verifications_insert ON public.distribution_verifications;
DROP POLICY IF EXISTS distribution_verifications_update ON public.distribution_verifications;
DROP POLICY IF EXISTS distribution_verifications_delete ON public.distribution_verifications;
CREATE POLICY distribution_verifications_select ON public.distribution_verifications FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.read'));
CREATE POLICY distribution_verifications_insert ON public.distribution_verifications FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'distributions.verify') AND verified_by = private.current_profile_id());
CREATE POLICY distribution_verifications_update ON public.distribution_verifications FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY distribution_verifications_delete ON public.distribution_verifications FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('distributions.read', 'distributions', 'read', 'Melihat rencana dan pelaksanaan distribusi'),
  ('distributions.manage', 'distributions', 'manage', 'Membuat rencana distribusi'),
  ('distributions.ready', 'distributions', 'ready', 'Menandai rencana distribusi siap ditugaskan'),
  ('distributions.assign', 'distributions', 'assign', 'Menugaskan petugas distribusi'),
  ('distributions.execute', 'distributions', 'execute', 'Melaksanakan distribusi yang ditugaskan'),
  ('distributions.confirm', 'distributions', 'confirm', 'Mencatat konfirmasi penerima manfaat'),
  ('distributions.verify', 'distributions', 'verify', 'Memverifikasi distribusi secara independen'),
  ('distributions.complete', 'distributions', 'complete', 'Menutup distribusi yang telah terverifikasi'),
  ('distributions.cancel', 'distributions', 'cancel', 'Membatalkan rencana distribusi secara tercatat'),
  ('distribution_evidence.read', 'distribution_evidence', 'read', 'Melihat metadata bukti distribusi privat'),
  ('distribution_evidence.manage', 'distribution_evidence', 'manage', 'Mencatat metadata bukti distribusi privat')
ON CONFLICT (key) DO UPDATE SET
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.resource IN ('distributions', 'distribution_evidence')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('distributions.read', 'distribution_evidence.read')
WHERE role.organization_id IS NULL AND role.key IN ('field_officer', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('distributions.execute', 'distributions.confirm', 'distribution_evidence.manage')
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('distributions.verify', 'distributions.complete')
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
