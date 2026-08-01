CREATE UNIQUE INDEX IF NOT EXISTS distribution_assignments_one_active_per_plan
ON public.distribution_assignments (distribution_plan_id)
WHERE status = 'active';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_distribution_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Distribution execution, confirmation, evidence, verification, and event records are append-only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_distribution_execution_mutation
ON public.distribution_executions;
CREATE TRIGGER trg_prevent_distribution_execution_mutation
BEFORE UPDATE OR DELETE ON public.distribution_executions
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_distribution_confirmation_mutation
ON public.distribution_confirmations;
CREATE TRIGGER trg_prevent_distribution_confirmation_mutation
BEFORE UPDATE OR DELETE ON public.distribution_confirmations
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_distribution_evidence_mutation
ON public.distribution_evidence;
CREATE TRIGGER trg_prevent_distribution_evidence_mutation
BEFORE UPDATE OR DELETE ON public.distribution_evidence
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_distribution_verification_mutation
ON public.distribution_verifications;
CREATE TRIGGER trg_prevent_distribution_verification_mutation
BEFORE UPDATE OR DELETE ON public.distribution_verifications
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_distribution_event_mutation
ON public.distribution_events;
CREATE TRIGGER trg_prevent_distribution_event_mutation
BEFORE UPDATE OR DELETE ON public.distribution_events
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_distribution_plan_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Distribution plans cannot be deleted';
  END IF;
  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Completed or cancelled distribution plans are immutable';
  END IF;
  IF (NEW.organization_id, NEW.reference_number, NEW.disbursement_id,
      NEW.allocation_id, NEW.program_id, NEW.case_id,
      NEW.beneficiary_contact_id, NEW.amount, NEW.currency,
      NEW.distribution_method, NEW.purpose, NEW.planned_at,
      NEW.requires_confirmation, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id, OLD.reference_number, OLD.disbursement_id,
      OLD.allocation_id, OLD.program_id, OLD.case_id,
      OLD.beneficiary_contact_id, OLD.amount, OLD.currency,
      OLD.distribution_method, OLD.purpose, OLD.planned_at,
      OLD.requires_confirmation, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Distribution context and amount are immutable; cancel and create a new plan';
  END IF;
  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('ready', 'cancelled'))
    OR (OLD.status = 'ready' AND NEW.status IN ('assigned', 'cancelled'))
    OR (OLD.status = 'assigned' AND NEW.status IN ('assigned', 'in_progress', 'cancelled'))
    OR (OLD.status = 'in_progress' AND NEW.status IN ('executed', 'revision_required'))
    OR (OLD.status = 'executed' AND NEW.status IN ('confirmed', 'verified', 'revision_required'))
    OR (OLD.status = 'confirmed' AND NEW.status IN ('verified', 'revision_required'))
    OR (OLD.status = 'revision_required' AND NEW.status = 'in_progress')
    OR (OLD.status = 'verified' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid distribution state transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_protect_distribution_plan_state
ON public.distribution_plans;
CREATE TRIGGER trg_protect_distribution_plan_state
BEFORE UPDATE OR DELETE ON public.distribution_plans
FOR EACH ROW EXECUTE FUNCTION private.protect_distribution_plan_state();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_distribution_assignment_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Distribution assignments cannot be deleted';
  END IF;
  IF OLD.status <> 'active' OR NEW.status <> 'revoked'
     OR NEW.revoked_at IS NULL
     OR (NEW.organization_id, NEW.distribution_plan_id, NEW.membership_id,
         NEW.assignee_profile_id, NEW.sequence_number, NEW.assigned_by,
         NEW.assigned_at, NEW.notes, NEW.created_at)
        IS DISTINCT FROM
        (OLD.organization_id, OLD.distribution_plan_id, OLD.membership_id,
         OLD.assignee_profile_id, OLD.sequence_number, OLD.assigned_by,
         OLD.assigned_at, OLD.notes, OLD.created_at) THEN
    RAISE EXCEPTION 'Distribution assignment may only transition from active to revoked';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_protect_distribution_assignment_state
ON public.distribution_assignments;
CREATE TRIGGER trg_protect_distribution_assignment_state
BEFORE UPDATE OR DELETE ON public.distribution_assignments
FOR EACH ROW EXECUTE FUNCTION private.protect_distribution_assignment_state();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_distribution_plans_touch_updated_at
ON public.distribution_plans;
CREATE TRIGGER trg_distribution_plans_touch_updated_at
BEFORE UPDATE ON public.distribution_plans
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_distribution_assignments_touch_updated_at
ON public.distribution_assignments;
CREATE TRIGGER trg_distribution_assignments_touch_updated_at
BEFORE UPDATE ON public.distribution_assignments
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
