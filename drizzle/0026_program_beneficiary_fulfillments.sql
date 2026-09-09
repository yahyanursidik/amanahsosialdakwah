-- Menghubungkan paket barang yang sudah packed dengan penerima di Program.
-- Status pengiriman tidak disalin ke tabel ini; baca dari logistics_shipments.

CREATE UNIQUE INDEX IF NOT EXISTS idx_aid_applications_id_org_unique
  ON public.aid_applications (id, organization_id);
--> statement-breakpoint

CREATE TABLE public.program_beneficiary_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  application_id uuid NOT NULL,
  case_id uuid,
  beneficiary_contact_id uuid NOT NULL,
  packing_id uuid NOT NULL,
  package_count integer NOT NULL,
  partner_contact_id uuid,
  partner_pic_name text,
  partner_readiness_status text DEFAULT 'pending' NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  notes text,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT program_beneficiary_fulfillments_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT program_beneficiary_fulfillments_idempotency_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT program_beneficiary_fulfillments_package_count_check CHECK (package_count > 0),
  CONSTRAINT program_beneficiary_fulfillments_partner_readiness_check CHECK (
    partner_readiness_status IN ('pending', 'ready', 'accepted', 'declined')
  ),
  CONSTRAINT program_beneficiary_fulfillments_status_check CHECK (
    status IN ('active', 'cancelled')
  )
);
--> statement-breakpoint

ALTER TABLE public.program_beneficiary_fulfillments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.program_beneficiary_fulfillments
  ADD CONSTRAINT program_beneficiary_fulfillments_program_fkey
    FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_application_fkey
    FOREIGN KEY (application_id, organization_id)
    REFERENCES public.aid_applications(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_case_fkey
    FOREIGN KEY (case_id, organization_id)
    REFERENCES public.beneficiary_cases(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_beneficiary_fkey
    FOREIGN KEY (beneficiary_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_packing_fkey
    FOREIGN KEY (packing_id, organization_id)
    REFERENCES public.aid_package_packings(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_partner_fkey
    FOREIGN KEY (partner_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_beneficiary_fulfillments_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX idx_program_beneficiary_fulfillments_program
  ON public.program_beneficiary_fulfillments (organization_id, program_id, status);
--> statement-breakpoint
CREATE INDEX idx_program_beneficiary_fulfillments_application
  ON public.program_beneficiary_fulfillments (organization_id, application_id, status);
--> statement-breakpoint
CREATE INDEX idx_program_beneficiary_fulfillments_packing
  ON public.program_beneficiary_fulfillments (organization_id, packing_id, status);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_program_beneficiary_fulfillments_active_application_packing
  ON public.program_beneficiary_fulfillments (application_id, packing_id)
  WHERE status = 'active';
--> statement-breakpoint

CREATE POLICY program_beneficiary_fulfillments_select
  ON public.program_beneficiary_fulfillments FOR SELECT TO app_runtime
  USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.read')
    AND private.has_permission(organization_id, 'aid_package_packings.read')
  );
--> statement-breakpoint
CREATE POLICY program_beneficiary_fulfillments_insert
  ON public.program_beneficiary_fulfillments FOR INSERT TO app_runtime
  WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'aid_package_packings.manage')
    AND created_by = private.current_profile_id()
  );
--> statement-breakpoint
CREATE POLICY program_beneficiary_fulfillments_update
  ON public.program_beneficiary_fulfillments FOR UPDATE TO app_runtime
  USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY program_beneficiary_fulfillments_delete
  ON public.program_beneficiary_fulfillments FOR DELETE TO app_runtime
  USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE public.program_beneficiary_fulfillments TO app_runtime;
--> statement-breakpoint

CREATE TRIGGER trg_program_beneficiary_fulfillments_touch_updated_at
  BEFORE UPDATE ON public.program_beneficiary_fulfillments
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
