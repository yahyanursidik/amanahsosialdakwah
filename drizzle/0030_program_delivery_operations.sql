-- Area penyaluran, penugasan mitra, dan reservasi kuota pengajuan per program.
-- Reservasi bukan distribusi: pelaksanaan tetap dicatat pada Distribution Engine.

CREATE TABLE public.program_delivery_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  address_line text,
  village text,
  district text,
  city text,
  province text,
  postal_code text,
  quota_capacity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_delivery_areas_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT program_delivery_areas_program_code_unique UNIQUE (program_id, code),
  CONSTRAINT program_delivery_areas_quota_check CHECK (quota_capacity >= 0),
  CONSTRAINT program_delivery_areas_status_check CHECK (
    status IN ('planned', 'active', 'completed', 'cancelled')
  ),
  CONSTRAINT program_delivery_areas_program_fkey FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_delivery_areas_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT program_delivery_areas_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE public.program_partner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  delivery_area_id uuid,
  partner_contact_id uuid NOT NULL,
  assignment_role text NOT NULL DEFAULT 'distributor',
  pic_name text,
  pic_phone text,
  readiness_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_partner_assignments_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT program_partner_assignments_role_check CHECK (
    assignment_role IN ('lead', 'coordinator', 'distributor', 'monitor')
  ),
  CONSTRAINT program_partner_assignments_readiness_check CHECK (
    readiness_status IN ('pending', 'ready', 'accepted', 'declined')
  ),
  CONSTRAINT program_partner_assignments_status_check CHECK (
    status IN ('active', 'paused', 'ended')
  ),
  CONSTRAINT program_partner_assignments_program_fkey FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_partner_assignments_area_fkey FOREIGN KEY (delivery_area_id, organization_id)
    REFERENCES public.program_delivery_areas(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_partner_assignments_partner_fkey FOREIGN KEY (partner_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_partner_assignments_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT program_partner_assignments_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE public.program_application_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  application_id uuid NOT NULL,
  delivery_area_id uuid,
  partner_assignment_id uuid,
  status text NOT NULL DEFAULT 'waitlisted',
  notes text,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_application_allocations_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT program_application_allocations_program_application_unique UNIQUE (program_id, application_id),
  CONSTRAINT program_application_allocations_idempotency_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT program_application_allocations_status_check CHECK (
    status IN ('waitlisted', 'reserved', 'allocated', 'withdrawn', 'cancelled')
  ),
  CONSTRAINT program_application_allocations_program_fkey FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_application_allocations_application_fkey FOREIGN KEY (application_id, organization_id)
    REFERENCES public.aid_applications(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_application_allocations_area_fkey FOREIGN KEY (delivery_area_id, organization_id)
    REFERENCES public.program_delivery_areas(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_application_allocations_partner_assignment_fkey FOREIGN KEY (partner_assignment_id, organization_id)
    REFERENCES public.program_partner_assignments(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_application_allocations_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT program_application_allocations_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE INDEX idx_program_delivery_areas_program_status
  ON public.program_delivery_areas (organization_id, program_id, status);
--> statement-breakpoint
CREATE INDEX idx_program_partner_assignments_program_status
  ON public.program_partner_assignments (organization_id, program_id, status);
--> statement-breakpoint
CREATE INDEX idx_program_partner_assignments_partner
  ON public.program_partner_assignments (organization_id, partner_contact_id, status);
--> statement-breakpoint
CREATE INDEX idx_program_application_allocations_program_status
  ON public.program_application_allocations (organization_id, program_id, status);
--> statement-breakpoint
CREATE INDEX idx_program_application_allocations_area_status
  ON public.program_application_allocations (organization_id, delivery_area_id, status);
--> statement-breakpoint

ALTER TABLE public.program_delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_partner_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_application_allocations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY program_delivery_areas_select ON public.program_delivery_areas
  FOR SELECT TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.read')
  );
CREATE POLICY program_delivery_areas_insert ON public.program_delivery_areas
  FOR INSERT TO app_runtime WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND created_by = private.current_profile_id()
  );
CREATE POLICY program_delivery_areas_update ON public.program_delivery_areas
  FOR UPDATE TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
  ) WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
  );
CREATE POLICY program_delivery_areas_delete ON public.program_delivery_areas
  FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

CREATE POLICY program_partner_assignments_select ON public.program_partner_assignments
  FOR SELECT TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.read')
  );
CREATE POLICY program_partner_assignments_insert ON public.program_partner_assignments
  FOR INSERT TO app_runtime WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND created_by = private.current_profile_id()
  );
CREATE POLICY program_partner_assignments_update ON public.program_partner_assignments
  FOR UPDATE TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
  ) WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
  );
CREATE POLICY program_partner_assignments_delete ON public.program_partner_assignments
  FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

CREATE POLICY program_application_allocations_select ON public.program_application_allocations
  FOR SELECT TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.read')
    AND private.has_permission(organization_id, 'applications.read')
  );
CREATE POLICY program_application_allocations_insert ON public.program_application_allocations
  FOR INSERT TO app_runtime WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'applications.read')
    AND created_by = private.current_profile_id()
  );
CREATE POLICY program_application_allocations_update ON public.program_application_allocations
  FOR UPDATE TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'applications.read')
  ) WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'applications.read')
  );
CREATE POLICY program_application_allocations_delete ON public.program_application_allocations
  FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.program_delivery_areas TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON public.program_partner_assignments TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON public.program_application_allocations TO app_runtime;
--> statement-breakpoint

CREATE TRIGGER trg_program_delivery_areas_touch_updated_at
  BEFORE UPDATE ON public.program_delivery_areas
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_program_partner_assignments_touch_updated_at
  BEFORE UPDATE ON public.program_partner_assignments
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_program_application_allocations_touch_updated_at
  BEFORE UPDATE ON public.program_application_allocations
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
