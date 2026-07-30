ALTER POLICY "beneficiary_cases_update" ON "beneficiary_cases" TO app_runtime USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
  or private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.review')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
  or private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.review')
));