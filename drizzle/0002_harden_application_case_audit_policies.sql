ALTER POLICY "application_case_events_insert" ON "application_case_events" TO app_runtime WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
  or private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
));--> statement-breakpoint
ALTER POLICY "audit_events_insert" ON "audit_events" TO app_runtime WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
  or private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
));