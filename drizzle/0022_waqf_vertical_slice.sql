CREATE TABLE public.waqf_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  asset_type text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  donor_contact_id uuid,
  acquisition_date date,
  acquisition_value numeric(20,2),
  currency char(3) DEFAULT 'IDR' NOT NULL,
  location_text text,
  legal_status text DEFAULT 'incomplete' NOT NULL,
  operational_status text DEFAULT 'draft' NOT NULL,
  registration_notes text,
  registered_by uuid,
  registered_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_assets_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT waqf_assets_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_assets_type_check CHECK (asset_type IN ('land','building','cash','productive_asset','vehicle','equipment','other')),
  CONSTRAINT waqf_assets_value_check CHECK (acquisition_value IS NULL OR acquisition_value >= 0),
  CONSTRAINT waqf_assets_name_check CHECK (length(trim(name)) >= 3),
  CONSTRAINT waqf_assets_description_check CHECK (length(trim(description)) >= 10),
  CONSTRAINT waqf_assets_legal_status_check CHECK (legal_status IN ('incomplete','pending_review','verified','disputed')),
  CONSTRAINT waqf_assets_operational_status_check CHECK (operational_status IN ('draft','active','under_maintenance','suspended','retired')),
  CONSTRAINT waqf_assets_registration_check CHECK (
    (operational_status = 'draft' AND registered_by IS NULL AND registered_at IS NULL)
    OR (operational_status <> 'draft' AND registered_by IS NOT NULL AND registered_at IS NOT NULL AND legal_status = 'verified')
  )
);
ALTER TABLE public.waqf_assets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  document_type text NOT NULL,
  document_number text NOT NULL,
  issuer text,
  issued_at date,
  verification_status text DEFAULT 'pending' NOT NULL,
  verification_notes text,
  evidence_file_id uuid,
  created_by uuid NOT NULL,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_legal_documents_asset_number_unique UNIQUE (organization_id, asset_id, document_type, document_number),
  CONSTRAINT waqf_legal_documents_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_legal_documents_type_check CHECK (document_type IN ('akta_ikrar_wakaf','sertifikat_wakaf','sertifikat_tanah','bukti_transfer','surat_pernyataan','izin_operasional','other')),
  CONSTRAINT waqf_legal_documents_number_check CHECK (length(trim(document_number)) >= 2),
  CONSTRAINT waqf_legal_documents_status_check CHECK (verification_status IN ('pending','verified','rejected')),
  CONSTRAINT waqf_legal_documents_verify_check CHECK (
    (verification_status = 'pending' AND verified_by IS NULL AND verified_at IS NULL)
    OR (verification_status <> 'pending' AND verified_by IS NOT NULL AND verified_at IS NOT NULL AND length(trim(coalesce(verification_notes,''))) >= 10)
  )
);
ALTER TABLE public.waqf_legal_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_nazhir_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  assignment_scope text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'active' NOT NULL,
  created_by uuid NOT NULL,
  ended_by uuid,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_nazhir_assignments_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_nazhir_assignments_period_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT waqf_nazhir_assignments_scope_check CHECK (length(trim(assignment_scope)) >= 5),
  CONSTRAINT waqf_nazhir_assignments_status_check CHECK (status IN ('active','ended')),
  CONSTRAINT waqf_nazhir_assignments_end_check CHECK (
    (status = 'active' AND ended_by IS NULL AND ended_at IS NULL)
    OR (status = 'ended' AND ended_by IS NOT NULL AND ended_at IS NOT NULL AND end_date IS NOT NULL)
  )
);
ALTER TABLE public.waqf_nazhir_assignments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  valuation_date date NOT NULL,
  amount numeric(20,2) NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  method text NOT NULL,
  appraiser text,
  notes text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_valuations_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_valuations_amount_check CHECK (amount > 0),
  CONSTRAINT waqf_valuations_method_check CHECK (method IN ('internal_estimate','market_comparison','independent_appraiser','book_value','other')),
  CONSTRAINT waqf_valuations_notes_check CHECK (length(trim(notes)) >= 10)
);
ALTER TABLE public.waqf_valuations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_utilizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  utilization_type text NOT NULL,
  beneficiary_contact_id uuid,
  program_id uuid,
  start_date date NOT NULL,
  end_date date,
  expected_benefit text NOT NULL,
  status text DEFAULT 'planned' NOT NULL,
  created_by uuid NOT NULL,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_utilizations_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_utilizations_period_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT waqf_utilizations_type_check CHECK (utilization_type IN ('education','dakwah','health','economic','social','rental','other')),
  CONSTRAINT waqf_utilizations_status_check CHECK (status IN ('planned','active','completed','cancelled')),
  CONSTRAINT waqf_utilizations_benefit_check CHECK (length(trim(expected_benefit)) >= 10)
);
ALTER TABLE public.waqf_utilizations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  maintenance_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  amount numeric(20,2) DEFAULT 0 NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  vendor_contact_id uuid,
  description text NOT NULL,
  status text DEFAULT 'recorded' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_maintenance_records_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_maintenance_records_amount_check CHECK (amount >= 0),
  CONSTRAINT waqf_maintenance_records_type_check CHECK (maintenance_type IN ('inspection','repair','renovation','tax','security','cleaning','other')),
  CONSTRAINT waqf_maintenance_records_status_check CHECK (status IN ('recorded','reversed')),
  CONSTRAINT waqf_maintenance_records_description_check CHECK (length(trim(description)) >= 10)
);
ALTER TABLE public.waqf_maintenance_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_income_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  utilization_id uuid,
  income_reference text NOT NULL,
  income_type text NOT NULL,
  amount numeric(20,2) NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  received_at timestamptz NOT NULL,
  payer_contact_id uuid,
  notes text NOT NULL,
  status text DEFAULT 'received' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_income_records_org_reference_unique UNIQUE (organization_id, income_reference),
  CONSTRAINT waqf_income_records_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_income_records_amount_check CHECK (amount > 0),
  CONSTRAINT waqf_income_records_type_check CHECK (income_type IN ('rent','profit_share','harvest','service_fee','donation_return','other')),
  CONSTRAINT waqf_income_records_status_check CHECK (status IN ('received','reversed')),
  CONSTRAINT waqf_income_records_notes_check CHECK (length(trim(notes)) >= 10)
);
ALTER TABLE public.waqf_income_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_benefit_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  income_record_id uuid,
  beneficiary_contact_id uuid,
  program_id uuid,
  distribution_reference text NOT NULL,
  amount numeric(20,2) NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  distributed_at timestamptz NOT NULL,
  benefit_type text NOT NULL,
  notes text NOT NULL,
  status text DEFAULT 'completed' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_benefit_distributions_org_reference_unique UNIQUE (organization_id, distribution_reference),
  CONSTRAINT waqf_benefit_distributions_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_benefit_distributions_amount_check CHECK (amount > 0),
  CONSTRAINT waqf_benefit_distributions_type_check CHECK (benefit_type IN ('cash','goods','service','scholarship','facility_access','other')),
  CONSTRAINT waqf_benefit_distributions_status_check CHECK (status IN ('completed','reversed')),
  CONSTRAINT waqf_benefit_distributions_notes_check CHECK (length(trim(notes)) >= 10)
);
ALTER TABLE public.waqf_benefit_distributions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  event_data jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.waqf_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.waqf_idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  command_type text NOT NULL,
  request_hash text NOT NULL,
  status text DEFAULT 'processing' NOT NULL,
  response_snapshot jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  CONSTRAINT waqf_idempotency_org_key_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT waqf_idempotency_values_check CHECK (status IN ('processing','completed') AND length(idempotency_key) BETWEEN 16 AND 200)
);
ALTER TABLE public.waqf_idempotency_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.waqf_assets
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (donor_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (registered_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.waqf_legal_documents
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (evidence_file_id, organization_id) REFERENCES public.evidence_files(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_nazhir_assignments
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (ended_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_valuations
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_utilizations
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (beneficiary_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (program_id, organization_id) REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_maintenance_records
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (vendor_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_income_records
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (utilization_id, organization_id) REFERENCES public.waqf_utilizations(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (payer_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_benefit_distributions
  ADD FOREIGN KEY (asset_id, organization_id) REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (income_record_id, organization_id) REFERENCES public.waqf_income_records(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (beneficiary_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (program_id, organization_id) REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_events
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.waqf_idempotency_records
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE INDEX idx_waqf_assets_org_status ON public.waqf_assets (organization_id, operational_status, created_at DESC);
CREATE INDEX idx_waqf_assets_donor ON public.waqf_assets (organization_id, donor_contact_id);
CREATE INDEX idx_waqf_legal_documents_asset ON public.waqf_legal_documents (organization_id, asset_id, verification_status);
CREATE INDEX idx_waqf_nazhir_assignments_asset ON public.waqf_nazhir_assignments (organization_id, asset_id, status);
CREATE INDEX idx_waqf_valuations_asset ON public.waqf_valuations (organization_id, asset_id, valuation_date DESC);
CREATE INDEX idx_waqf_utilizations_asset ON public.waqf_utilizations (organization_id, asset_id, status);
CREATE INDEX idx_waqf_maintenance_asset ON public.waqf_maintenance_records (organization_id, asset_id, occurred_at DESC);
CREATE INDEX idx_waqf_income_asset ON public.waqf_income_records (organization_id, asset_id, received_at DESC);
CREATE INDEX idx_waqf_benefit_asset ON public.waqf_benefit_distributions (organization_id, asset_id, distributed_at DESC);
CREATE INDEX idx_waqf_events_entity ON public.waqf_events (organization_id, entity_type, entity_id, created_at DESC);
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('waqf.read', 'waqf', 'read', 'Melihat aset, legalitas, manfaat, dan histori wakaf'),
  ('waqf_assets.manage', 'waqf_assets', 'manage', 'Membuat dan memperbarui data awal aset wakaf'),
  ('waqf_assets.register', 'waqf_assets', 'register', 'Mendaftarkan aset wakaf setelah legalitas terverifikasi'),
  ('waqf_legal_documents.manage', 'waqf_legal_documents', 'manage', 'Mencatat dokumen legal wakaf'),
  ('waqf_legal_documents.verify', 'waqf_legal_documents', 'verify', 'Memverifikasi dokumen legal wakaf'),
  ('waqf_nazhir.manage', 'waqf_nazhir', 'manage', 'Menetapkan nazhir/pengelola aset wakaf'),
  ('waqf_valuations.record', 'waqf_valuations', 'record', 'Mencatat valuasi aset wakaf'),
  ('waqf_utilizations.manage', 'waqf_utilizations', 'manage', 'Mencatat pemanfaatan aset wakaf'),
  ('waqf_maintenance.record', 'waqf_maintenance', 'record', 'Mencatat pemeliharaan aset wakaf'),
  ('waqf_income.record', 'waqf_income', 'record', 'Mencatat pendapatan aset wakaf'),
  ('waqf_benefits.distribute', 'waqf_benefits', 'distribute', 'Mencatat distribusi manfaat wakaf')
ON CONFLICT (key) DO UPDATE SET resource = excluded.resource, action = excluded.action, description = excluded.description, updated_at = now();
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key LIKE 'waqf%'
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'waqf.read',
  'waqf_legal_documents.manage',
  'waqf_valuations.record',
  'waqf_utilizations.manage',
  'waqf_maintenance.record',
  'waqf_income.record',
  'waqf_benefits.distribute'
)
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key = 'waqf.read'
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'waqf_assets',
    'waqf_legal_documents',
    'waqf_nazhir_assignments',
    'waqf_valuations',
    'waqf_utilizations',
    'waqf_maintenance_records',
    'waqf_income_records',
    'waqf_benefit_distributions',
    'waqf_events',
    'waqf_idempotency_records'
  ] LOOP
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, ''waqf.read''))', table_name, table_name);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO app_runtime USING (false)', table_name, table_name);
  END LOOP;
END $$;
CREATE POLICY waqf_assets_insert ON public.waqf_assets FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_assets.manage') AND created_by = private.current_profile_id());
CREATE POLICY waqf_assets_update ON public.waqf_assets FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_assets.register')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_assets.register'));
CREATE POLICY waqf_legal_documents_insert ON public.waqf_legal_documents FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_legal_documents.manage') AND created_by = private.current_profile_id());
CREATE POLICY waqf_legal_documents_update ON public.waqf_legal_documents FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_legal_documents.verify')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_legal_documents.verify'));
CREATE POLICY waqf_nazhir_assignments_insert ON public.waqf_nazhir_assignments FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_nazhir.manage') AND created_by = private.current_profile_id());
CREATE POLICY waqf_nazhir_assignments_update ON public.waqf_nazhir_assignments FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_nazhir.manage')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_nazhir.manage'));
CREATE POLICY waqf_valuations_insert ON public.waqf_valuations FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_valuations.record') AND created_by = private.current_profile_id());
CREATE POLICY waqf_valuations_update ON public.waqf_valuations FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY waqf_utilizations_insert ON public.waqf_utilizations FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_utilizations.manage') AND created_by = private.current_profile_id());
CREATE POLICY waqf_utilizations_update ON public.waqf_utilizations FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_utilizations.manage')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_utilizations.manage'));
CREATE POLICY waqf_maintenance_insert ON public.waqf_maintenance_records FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_maintenance.record') AND created_by = private.current_profile_id());
CREATE POLICY waqf_maintenance_update ON public.waqf_maintenance_records FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY waqf_income_insert ON public.waqf_income_records FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_income.record') AND created_by = private.current_profile_id());
CREATE POLICY waqf_income_update ON public.waqf_income_records FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY waqf_benefits_insert ON public.waqf_benefit_distributions FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_benefits.distribute') AND created_by = private.current_profile_id());
CREATE POLICY waqf_benefits_update ON public.waqf_benefit_distributions FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY waqf_events_insert ON public.waqf_events FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND created_by = private.current_profile_id());
CREATE POLICY waqf_events_update ON public.waqf_events FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY waqf_idempotency_insert ON public.waqf_idempotency_records FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND created_by = private.current_profile_id());
CREATE POLICY waqf_idempotency_update ON public.waqf_idempotency_records FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id)) WITH CHECK (private.has_active_membership(organization_id));
GRANT SELECT, INSERT, UPDATE ON public.waqf_assets, public.waqf_legal_documents, public.waqf_nazhir_assignments, public.waqf_valuations, public.waqf_utilizations, public.waqf_maintenance_records, public.waqf_income_records, public.waqf_benefit_distributions, public.waqf_events, public.waqf_idempotency_records TO app_runtime;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.prevent_waqf_append_only_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Waqf record is append-only'; END $$;
CREATE TRIGGER trg_waqf_valuations_append_only BEFORE UPDATE OR DELETE ON public.waqf_valuations FOR EACH ROW EXECUTE FUNCTION private.prevent_waqf_append_only_mutation();
CREATE TRIGGER trg_waqf_maintenance_append_only BEFORE UPDATE OR DELETE ON public.waqf_maintenance_records FOR EACH ROW EXECUTE FUNCTION private.prevent_waqf_append_only_mutation();
CREATE TRIGGER trg_waqf_income_append_only BEFORE UPDATE OR DELETE ON public.waqf_income_records FOR EACH ROW EXECUTE FUNCTION private.prevent_waqf_append_only_mutation();
CREATE TRIGGER trg_waqf_benefits_append_only BEFORE UPDATE OR DELETE ON public.waqf_benefit_distributions FOR EACH ROW EXECUTE FUNCTION private.prevent_waqf_append_only_mutation();
CREATE TRIGGER trg_waqf_events_append_only BEFORE UPDATE OR DELETE ON public.waqf_events FOR EACH ROW EXECUTE FUNCTION private.prevent_waqf_append_only_mutation();
CREATE TRIGGER trg_waqf_assets_touch BEFORE UPDATE ON public.waqf_assets FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_waqf_legal_documents_touch BEFORE UPDATE ON public.waqf_legal_documents FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_waqf_nazhir_assignments_touch BEFORE UPDATE ON public.waqf_nazhir_assignments FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_waqf_utilizations_touch BEFORE UPDATE ON public.waqf_utilizations FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
