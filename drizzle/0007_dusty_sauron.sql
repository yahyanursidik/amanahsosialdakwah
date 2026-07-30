ALTER POLICY "approval_actions_insert" ON "approval_actions" TO app_runtime WITH CHECK (private.has_active_membership(organization_id)
  and actor_profile_id = private.current_profile_id()
  and (
    (action = 'created' and private.has_permission(organization_id, 'approval_requests.create'))
    or (action in ('submitted', 'resubmitted') and private.has_permission(organization_id, 'approval_requests.submit'))
    or (
      action in ('approved', 'rejected', 'revision_requested')
      and approval_request_step_id is not null
      and private.has_permission(
        organization_id,
        (select step.required_permission from public.approval_request_steps step where step.id = approval_request_step_id)
      )
    )
    or (action = 'cancelled' and private.has_permission(organization_id, 'approval_requests.cancel'))
  ));--> statement-breakpoint
ALTER POLICY "approval_request_steps_insert" ON "approval_request_steps" TO app_runtime WITH CHECK (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'approval_requests.create'));--> statement-breakpoint
ALTER POLICY "approval_request_steps_update" ON "approval_request_steps" TO app_runtime USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, required_permission)
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, required_permission)
));--> statement-breakpoint
ALTER POLICY "approval_requests_insert" ON "approval_requests" TO app_runtime WITH CHECK (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'approval_requests.create')
  and requested_by = private.current_profile_id());--> statement-breakpoint
ALTER POLICY "approval_requests_update" ON "approval_requests" TO app_runtime USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
  or (
    requested_by = private.current_profile_id()
    and private.has_permission(organization_id, 'approval_requests.submit')
  )
)) WITH CHECK (private.has_active_membership(organization_id) and (
  (status = 'draft' and requested_by = private.current_profile_id()
    and private.has_permission(organization_id, 'approval_requests.create'))
  or (status = 'in_progress' and (
    private.has_permission(organization_id, 'approval_requests.act')
    or (
      requested_by = private.current_profile_id()
      and private.has_permission(organization_id, 'approval_requests.submit')
    )
  ))
  or (status in ('approved', 'rejected', 'revision_requested')
    and private.has_permission(organization_id, 'approval_requests.act'))
  or (status = 'cancelled'
    and private.has_permission(organization_id, 'approval_requests.cancel'))
));