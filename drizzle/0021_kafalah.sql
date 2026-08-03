CREATE TABLE public.kafalah_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  beneficiary_contact_id uuid NOT NULL,
  case_id uuid,
  need_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  approved_amount numeric(20,2) NOT NULL,
  matched_amount numeric(20,2) DEFAULT 0 NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  period_months integer NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kafalah_needs_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT kafalah_needs_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_needs_type_check CHECK (need_type IN ('education','living','health','orphan_care','dakwah','other')),
  CONSTRAINT kafalah_needs_amount_check CHECK (approved_amount > 0 AND matched_amount >= 0 AND matched_amount <= approved_amount),
  CONSTRAINT kafalah_needs_period_check CHECK (period_months BETWEEN 1 AND 120),
  CONSTRAINT kafalah_needs_status_check CHECK (status IN ('draft','approved','matched','fulfilled','cancelled')),
  CONSTRAINT kafalah_needs_approval_check CHECK ((status = 'draft' AND approved_by IS NULL AND approved_at IS NULL) OR (status <> 'draft' AND approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
ALTER TABLE public.kafalah_needs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  need_id uuid NOT NULL,
  sponsor_contact_id uuid NOT NULL,
  matched_amount numeric(20,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'proposed' NOT NULL,
  activated_by uuid,
  activated_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kafalah_matches_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT kafalah_matches_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_matches_amount_check CHECK (matched_amount > 0),
  CONSTRAINT kafalah_matches_period_check CHECK (end_date >= start_date),
  CONSTRAINT kafalah_matches_status_check CHECK (status IN ('proposed','active','completed','cancelled'))
);
ALTER TABLE public.kafalah_matches ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  match_id uuid NOT NULL,
  frequency text NOT NULL,
  periodic_amount numeric(20,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  terms text NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  activated_by uuid,
  activated_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kafalah_contracts_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT kafalah_contracts_match_unique UNIQUE (match_id),
  CONSTRAINT kafalah_contracts_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_contracts_frequency_check CHECK (frequency IN ('monthly','quarterly','one_time')),
  CONSTRAINT kafalah_contracts_amount_check CHECK (periodic_amount > 0),
  CONSTRAINT kafalah_contracts_period_check CHECK (end_date >= start_date),
  CONSTRAINT kafalah_contracts_terms_check CHECK (length(trim(terms)) >= 20),
  CONSTRAINT kafalah_contracts_status_check CHECK (status IN ('draft','active','completed','cancelled'))
);
ALTER TABLE public.kafalah_contracts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(20,2) NOT NULL,
  paid_amount numeric(20,2) DEFAULT 0 NOT NULL,
  distributed_amount numeric(20,2) DEFAULT 0 NOT NULL,
  status text DEFAULT 'scheduled' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kafalah_schedules_contract_installment_unique UNIQUE (contract_id, installment_number),
  CONSTRAINT kafalah_schedules_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_schedules_amount_check CHECK (amount > 0 AND paid_amount >= 0 AND paid_amount <= amount AND distributed_amount >= 0 AND distributed_amount <= paid_amount),
  CONSTRAINT kafalah_schedules_status_check CHECK (status IN ('scheduled','paid','distributed','cancelled'))
);
ALTER TABLE public.kafalah_schedules ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  payment_reference text NOT NULL,
  amount numeric(20,2) NOT NULL,
  paid_at timestamptz NOT NULL,
  channel text NOT NULL,
  status text DEFAULT 'received' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kafalah_payments_org_reference_unique UNIQUE (organization_id, payment_reference),
  CONSTRAINT kafalah_payments_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_payments_amount_check CHECK (amount > 0),
  CONSTRAINT kafalah_payments_status_check CHECK (status IN ('received','reversed'))
);
ALTER TABLE public.kafalah_payments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  amount numeric(20,2) NOT NULL,
  distributed_at timestamptz NOT NULL,
  method text NOT NULL,
  confirmation_notes text NOT NULL,
  status text DEFAULT 'completed' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kafalah_distributions_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_distributions_amount_check CHECK (amount > 0),
  CONSTRAINT kafalah_distributions_notes_check CHECK (length(trim(confirmation_notes)) >= 10),
  CONSTRAINT kafalah_distributions_status_check CHECK (status IN ('completed','reversed'))
);
ALTER TABLE public.kafalah_distributions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_monitoring_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  outcome text NOT NULL,
  summary text NOT NULL,
  status text DEFAULT 'submitted' NOT NULL,
  submitted_by uuid NOT NULL,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  verified_by uuid,
  verified_at timestamptz,
  verification_notes text,
  CONSTRAINT kafalah_monitoring_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_monitoring_period_check CHECK (period_end >= period_start),
  CONSTRAINT kafalah_monitoring_outcome_check CHECK (outcome IN ('stable','improved','declined','critical')),
  CONSTRAINT kafalah_monitoring_summary_check CHECK (length(trim(summary)) >= 20),
  CONSTRAINT kafalah_monitoring_status_check CHECK (status IN ('submitted','verified','revision_requested')),
  CONSTRAINT kafalah_monitoring_verify_check CHECK ((status = 'submitted' AND verified_by IS NULL AND verified_at IS NULL) OR (status <> 'submitted' AND verified_by IS NOT NULL AND verified_at IS NOT NULL AND length(trim(verification_notes)) >= 10))
);
ALTER TABLE public.kafalah_monitoring_reports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  requested_start_date date NOT NULL,
  requested_end_date date NOT NULL,
  periodic_amount numeric(20,2) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'requested' NOT NULL,
  requested_by uuid NOT NULL,
  requested_at timestamptz DEFAULT now() NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  CONSTRAINT kafalah_renewals_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT kafalah_renewals_period_check CHECK (requested_end_date >= requested_start_date),
  CONSTRAINT kafalah_renewals_amount_check CHECK (periodic_amount > 0),
  CONSTRAINT kafalah_renewals_reason_check CHECK (length(trim(reason)) >= 20),
  CONSTRAINT kafalah_renewals_status_check CHECK (status IN ('requested','approved','rejected')),
  CONSTRAINT kafalah_renewals_decision_check CHECK ((status = 'requested' AND decided_by IS NULL AND decided_at IS NULL) OR (status <> 'requested' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND length(trim(decision_notes)) >= 10))
);
ALTER TABLE public.kafalah_renewals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.kafalah_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  entity_type text NOT NULL, entity_id uuid NOT NULL, event_type text NOT NULL,
  event_data jsonb, created_by uuid NOT NULL, created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.kafalah_events ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.kafalah_idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  idempotency_key text NOT NULL, command_type text NOT NULL, request_hash text NOT NULL,
  status text DEFAULT 'processing' NOT NULL, response_snapshot jsonb,
  created_by uuid NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, completed_at timestamptz,
  CONSTRAINT kafalah_idempotency_org_key_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT kafalah_idempotency_values_check CHECK (status IN ('processing','completed') AND length(idempotency_key) BETWEEN 16 AND 200)
);
ALTER TABLE public.kafalah_idempotency_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.kafalah_needs
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (beneficiary_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (case_id, organization_id) REFERENCES public.beneficiary_cases(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kafalah_matches
  ADD FOREIGN KEY (need_id, organization_id) REFERENCES public.kafalah_needs(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (sponsor_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (activated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_contracts
  ADD FOREIGN KEY (match_id, organization_id) REFERENCES public.kafalah_matches(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (activated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_schedules ADD FOREIGN KEY (contract_id, organization_id) REFERENCES public.kafalah_contracts(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_payments ADD FOREIGN KEY (schedule_id, organization_id) REFERENCES public.kafalah_schedules(id, organization_id) ON DELETE RESTRICT, ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_distributions ADD FOREIGN KEY (schedule_id, organization_id) REFERENCES public.kafalah_schedules(id, organization_id) ON DELETE RESTRICT, ADD FOREIGN KEY (payment_id, organization_id) REFERENCES public.kafalah_payments(id, organization_id) ON DELETE RESTRICT, ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_monitoring_reports ADD FOREIGN KEY (contract_id, organization_id) REFERENCES public.kafalah_contracts(id, organization_id) ON DELETE RESTRICT, ADD FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT, ADD FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_renewals ADD FOREIGN KEY (contract_id, organization_id) REFERENCES public.kafalah_contracts(id, organization_id) ON DELETE RESTRICT, ADD FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE RESTRICT, ADD FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_events ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.kafalah_idempotency_records ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE INDEX idx_kafalah_needs_org_status ON public.kafalah_needs (organization_id,status,created_at DESC);
CREATE INDEX idx_kafalah_needs_beneficiary ON public.kafalah_needs (organization_id,beneficiary_contact_id);
CREATE INDEX idx_kafalah_matches_need ON public.kafalah_matches (organization_id,need_id,status);
CREATE INDEX idx_kafalah_matches_sponsor ON public.kafalah_matches (organization_id,sponsor_contact_id,status);
CREATE INDEX idx_kafalah_contracts_org_status ON public.kafalah_contracts (organization_id,status,created_at DESC);
CREATE INDEX idx_kafalah_schedules_due ON public.kafalah_schedules (organization_id,status,due_date);
CREATE INDEX idx_kafalah_payments_schedule ON public.kafalah_payments (organization_id,schedule_id,paid_at DESC);
CREATE INDEX idx_kafalah_distributions_schedule ON public.kafalah_distributions (organization_id,schedule_id,distributed_at DESC);
CREATE INDEX idx_kafalah_monitoring_contract ON public.kafalah_monitoring_reports (organization_id,contract_id,period_end DESC);
CREATE INDEX idx_kafalah_renewals_contract ON public.kafalah_renewals (organization_id,contract_id,requested_at DESC);
CREATE INDEX idx_kafalah_events_entity ON public.kafalah_events (organization_id,entity_type,entity_id,created_at DESC);
--> statement-breakpoint

INSERT INTO public.permissions (key,resource,action,description) VALUES
 ('kafalah.read','kafalah','read','Melihat kebutuhan, matching, kontrak, dan realisasi kafalah'),
 ('kafalah_needs.manage','kafalah_needs','manage','Membuat kebutuhan kafalah'),
 ('kafalah_needs.approve','kafalah_needs','approve','Menyetujui kebutuhan kafalah'),
 ('kafalah_matches.manage','kafalah_matches','manage','Membuat matching sponsor dengan kebutuhan'),
 ('kafalah_contracts.manage','kafalah_contracts','manage','Membuat dan mengaktifkan kontrak kafalah'),
 ('kafalah_payments.post','kafalah_payments','post','Mencatat pembayaran sponsor'),
 ('kafalah_distributions.record','kafalah_distributions','record','Mencatat distribusi kafalah'),
 ('kafalah_monitoring.manage','kafalah_monitoring','manage','Membuat monitoring kafalah'),
 ('kafalah_monitoring.verify','kafalah_monitoring','verify','Memverifikasi monitoring kafalah'),
 ('kafalah_renewals.manage','kafalah_renewals','manage','Mengajukan renewal kafalah'),
 ('kafalah_renewals.decide','kafalah_renewals','decide','Memutuskan renewal kafalah')
ON CONFLICT (key) DO UPDATE SET resource=excluded.resource,action=excluded.action,description=excluded.description,updated_at=now();
INSERT INTO public.role_permissions (organization_id,role_id,permission_id)
SELECT NULL,r.id,p.id FROM public.roles r JOIN public.permissions p ON p.key LIKE 'kafalah%'
WHERE r.organization_id IS NULL AND r.key IN ('organization_owner','organization_admin') ON CONFLICT (role_id,permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id,role_id,permission_id)
SELECT NULL,r.id,p.id FROM public.roles r JOIN public.permissions p ON p.key IN ('kafalah.read','kafalah_needs.manage','kafalah_matches.manage','kafalah_contracts.manage','kafalah_payments.post','kafalah_distributions.record','kafalah_monitoring.manage','kafalah_renewals.manage')
WHERE r.organization_id IS NULL AND r.key='field_officer' ON CONFLICT (role_id,permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id,role_id,permission_id)
SELECT NULL,r.id,p.id FROM public.roles r JOIN public.permissions p ON p.key='kafalah.read'
WHERE r.organization_id IS NULL AND r.key='auditor' ON CONFLICT (role_id,permission_id) DO NOTHING;
--> statement-breakpoint

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['kafalah_needs','kafalah_matches','kafalah_contracts','kafalah_schedules','kafalah_payments','kafalah_distributions','kafalah_monitoring_reports','kafalah_renewals','kafalah_events','kafalah_idempotency_records'] LOOP
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, ''kafalah.read''))',table_name,table_name);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO app_runtime USING (false)',table_name,table_name);
  END LOOP;
END $$;
CREATE POLICY kafalah_needs_insert ON public.kafalah_needs FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_needs.manage') AND created_by=private.current_profile_id());
CREATE POLICY kafalah_needs_update ON public.kafalah_needs FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_needs.approve')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_needs.approve'));
CREATE POLICY kafalah_matches_insert ON public.kafalah_matches FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_matches.manage') AND created_by=private.current_profile_id());
CREATE POLICY kafalah_matches_update ON public.kafalah_matches FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_contracts.manage')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_contracts.manage'));
CREATE POLICY kafalah_contracts_insert ON public.kafalah_contracts FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_contracts.manage') AND created_by=private.current_profile_id());
CREATE POLICY kafalah_contracts_update ON public.kafalah_contracts FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_contracts.manage')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_contracts.manage'));
CREATE POLICY kafalah_schedules_insert ON public.kafalah_schedules FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_contracts.manage'));
CREATE POLICY kafalah_schedules_update ON public.kafalah_schedules FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id,'kafalah_payments.post') OR private.has_permission(organization_id,'kafalah_distributions.record'))) WITH CHECK (private.has_active_membership(organization_id));
CREATE POLICY kafalah_payments_insert ON public.kafalah_payments FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_payments.post') AND created_by=private.current_profile_id());
CREATE POLICY kafalah_payments_update ON public.kafalah_payments FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY kafalah_distributions_insert ON public.kafalah_distributions FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_distributions.record') AND created_by=private.current_profile_id());
CREATE POLICY kafalah_distributions_update ON public.kafalah_distributions FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY kafalah_monitoring_reports_insert ON public.kafalah_monitoring_reports FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_monitoring.manage') AND submitted_by=private.current_profile_id());
CREATE POLICY kafalah_monitoring_reports_update ON public.kafalah_monitoring_reports FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_monitoring.verify')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_monitoring.verify'));
CREATE POLICY kafalah_renewals_insert ON public.kafalah_renewals FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_renewals.manage') AND requested_by=private.current_profile_id());
CREATE POLICY kafalah_renewals_update ON public.kafalah_renewals FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_renewals.decide')) WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'kafalah_renewals.decide'));
CREATE POLICY kafalah_events_insert ON public.kafalah_events FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND created_by=private.current_profile_id());
CREATE POLICY kafalah_events_update ON public.kafalah_events FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY kafalah_idempotency_records_insert ON public.kafalah_idempotency_records FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND created_by=private.current_profile_id());
CREATE POLICY kafalah_idempotency_records_update ON public.kafalah_idempotency_records FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id)) WITH CHECK (private.has_active_membership(organization_id));
GRANT SELECT,INSERT,UPDATE ON public.kafalah_needs,public.kafalah_matches,public.kafalah_contracts,public.kafalah_schedules,public.kafalah_payments,public.kafalah_distributions,public.kafalah_monitoring_reports,public.kafalah_renewals,public.kafalah_events,public.kafalah_idempotency_records TO app_runtime;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.prevent_kafalah_append_only_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Kafalah record is append-only'; END $$;
CREATE TRIGGER trg_kafalah_payments_append_only BEFORE UPDATE OR DELETE ON public.kafalah_payments FOR EACH ROW EXECUTE FUNCTION private.prevent_kafalah_append_only_mutation();
CREATE TRIGGER trg_kafalah_distributions_append_only BEFORE UPDATE OR DELETE ON public.kafalah_distributions FOR EACH ROW EXECUTE FUNCTION private.prevent_kafalah_append_only_mutation();
CREATE TRIGGER trg_kafalah_events_append_only BEFORE UPDATE OR DELETE ON public.kafalah_events FOR EACH ROW EXECUTE FUNCTION private.prevent_kafalah_append_only_mutation();
CREATE TRIGGER trg_kafalah_needs_touch BEFORE UPDATE ON public.kafalah_needs FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_kafalah_matches_touch BEFORE UPDATE ON public.kafalah_matches FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_kafalah_contracts_touch BEFORE UPDATE ON public.kafalah_contracts FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_kafalah_schedules_touch BEFORE UPDATE ON public.kafalah_schedules FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
