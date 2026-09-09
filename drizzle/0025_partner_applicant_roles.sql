ALTER TABLE public.crm_contact_roles
  DROP CONSTRAINT IF EXISTS crm_contact_roles_role_type_check;
--> statement-breakpoint

ALTER TABLE public.crm_contact_roles
  ADD CONSTRAINT crm_contact_roles_role_type_check
  CHECK (
    role_type = ANY (
      ARRAY[
        'donor'::text,
        'kafil'::text,
        'volunteer'::text,
        'beneficiary'::text,
        'distribution_partner'::text,
        'applicant'::text
      ]
    )
  );
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_crm_contact_roles_org_role_status
  ON public.crm_contact_roles (organization_id, role_type, status);
