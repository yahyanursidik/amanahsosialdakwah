CREATE TABLE public.risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid,
  risk_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  source text NOT NULL DEFAULT 'manual',
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  owner_profile_id uuid,
  response_due_at timestamptz NOT NULL,
  resolution_due_at timestamptz NOT NULL,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT risk_flags_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT risk_flags_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT risk_flags_severity_check CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT risk_flags_source_check CHECK (source IN ('manual','system','audit','incident','complaint')),
  CONSTRAINT risk_flags_status_check CHECK (status IN ('open','monitoring','mitigated','accepted','closed')),
  CONSTRAINT risk_flags_text_check CHECK (length(trim(title)) >= 5 AND length(trim(description)) >= 10),
  CONSTRAINT risk_flags_resolution_check CHECK ((status <> 'closed') OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(trim(resolution_notes)) >= 10))
);
ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.governance_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz NOT NULL,
  reported_by uuid NOT NULL,
  owner_profile_id uuid,
  status text NOT NULL DEFAULT 'reported',
  response_due_at timestamptz NOT NULL,
  resolution_due_at timestamptz NOT NULL,
  containment_notes text,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT governance_incidents_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT governance_incidents_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT governance_incidents_category_check CHECK (category IN ('security','financial','safeguarding','fraud','privacy','operational','legal','reputation','other')),
  CONSTRAINT governance_incidents_severity_check CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT governance_incidents_status_check CHECK (status IN ('reported','investigating','contained','resolved','closed')),
  CONSTRAINT governance_incidents_text_check CHECK (length(trim(title)) >= 5 AND length(trim(description)) >= 10),
  CONSTRAINT governance_incidents_resolution_check CHECK ((status NOT IN ('resolved','closed')) OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(trim(resolution_notes)) >= 10))
);
ALTER TABLE public.governance_incidents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  channel text NOT NULL,
  category text NOT NULL,
  classification text NOT NULL DEFAULT 'confidential',
  complainant_contact_id uuid,
  is_anonymous boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  description text NOT NULL,
  received_at timestamptz NOT NULL,
  recorded_by uuid NOT NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'received',
  response_due_at timestamptz NOT NULL,
  resolution_due_at timestamptz NOT NULL,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT complaints_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT complaints_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT complaints_channel_check CHECK (channel IN ('web','email','phone','whatsapp','letter','in_person','referral','other')),
  CONSTRAINT complaints_category_check CHECK (category IN ('service','distribution','staff_conduct','fraud','safeguarding','privacy','discrimination','other')),
  CONSTRAINT complaints_classification_check CHECK (classification IN ('internal','confidential','restricted')),
  CONSTRAINT complaints_status_check CHECK (status IN ('received','triaged','in_progress','resolved','closed','rejected')),
  CONSTRAINT complaints_identity_check CHECK ((is_anonymous AND complainant_contact_id IS NULL) OR NOT is_anonymous),
  CONSTRAINT complaints_text_check CHECK (length(trim(title)) >= 5 AND length(trim(description)) >= 10),
  CONSTRAINT complaints_resolution_check CHECK ((status NOT IN ('resolved','closed','rejected')) OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(trim(resolution_notes)) >= 10))
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  owner_profile_id uuid NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  completion_notes text,
  completed_by uuid,
  completed_at timestamptz,
  effectiveness_notes text,
  verified_by uuid,
  verified_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT corrective_actions_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT corrective_actions_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT corrective_actions_source_check CHECK (source_type IN ('risk_flag','incident','complaint','audit_event')),
  CONSTRAINT corrective_actions_status_check CHECK (status IN ('open','in_progress','completed','verified','cancelled')),
  CONSTRAINT corrective_actions_text_check CHECK (length(trim(title)) >= 5 AND length(trim(description)) >= 10),
  CONSTRAINT corrective_actions_completion_check CHECK ((status NOT IN ('completed','verified')) OR (completed_by IS NOT NULL AND completed_at IS NOT NULL AND length(trim(completion_notes)) >= 10)),
  CONSTRAINT corrective_actions_verification_check CHECK ((status <> 'verified') OR (verified_by IS NOT NULL AND verified_at IS NOT NULL AND verified_by <> completed_by AND length(trim(effectiveness_notes)) >= 10))
);
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.governance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  event_data jsonb,
  actor_profile_id uuid NOT NULL,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT governance_events_entity_check CHECK (entity_type IN ('risk_flag','incident','complaint','corrective_action'))
);
ALTER TABLE public.governance_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.risk_flags
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.governance_incidents
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.complaints
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (complainant_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.corrective_actions
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.governance_events
  ADD FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE INDEX idx_risk_flags_org_status ON public.risk_flags (organization_id, status, severity, resolution_due_at);
CREATE INDEX idx_risk_flags_subject ON public.risk_flags (organization_id, subject_type, subject_id);
CREATE INDEX idx_governance_incidents_org_status ON public.governance_incidents (organization_id, status, severity, resolution_due_at);
CREATE INDEX idx_complaints_org_status ON public.complaints (organization_id, status, classification, resolution_due_at);
CREATE INDEX idx_complaints_contact ON public.complaints (organization_id, complainant_contact_id);
CREATE INDEX idx_corrective_actions_org_status ON public.corrective_actions (organization_id, status, due_at);
CREATE INDEX idx_corrective_actions_source ON public.corrective_actions (organization_id, source_type, source_id);
CREATE INDEX idx_governance_events_entity ON public.governance_events (organization_id, entity_type, entity_id, created_at DESC);
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('risk_flags.read','risk_flags','read','Melihat register risiko organisasi'),
  ('risk_flags.manage','risk_flags','manage','Mencatat dan mengelola mitigasi risiko'),
  ('risk_flags.resolve','risk_flags','resolve','Menerima atau menutup risiko'),
  ('governance_incidents.read','governance_incidents','read','Melihat insiden tata kelola'),
  ('governance_incidents.report','governance_incidents','report','Melaporkan insiden tata kelola'),
  ('governance_incidents.manage','governance_incidents','manage','Menangani dan menyelesaikan insiden'),
  ('complaints.read','complaints','read','Melihat pengaduan non-restricted'),
  ('complaints.record','complaints','record','Mencatat pengaduan'),
  ('complaints.manage','complaints','manage','Menangani dan menyelesaikan pengaduan'),
  ('complaints.restricted_read','complaints','restricted_read','Melihat pengaduan restricted'),
  ('corrective_actions.read','corrective_actions','read','Melihat corrective action'),
  ('corrective_actions.manage','corrective_actions','manage','Membuat dan menyelesaikan corrective action'),
  ('corrective_actions.verify','corrective_actions','verify','Memverifikasi efektivitas corrective action')
ON CONFLICT (key) DO UPDATE SET resource=excluded.resource, action=excluded.action, description=excluded.description, updated_at=now();

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'risk_flags.read','risk_flags.manage','risk_flags.resolve',
  'governance_incidents.read','governance_incidents.report','governance_incidents.manage',
  'complaints.read','complaints.record','complaints.manage','complaints.restricted_read',
  'corrective_actions.read','corrective_actions.manage','corrective_actions.verify'
)
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner','organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('governance_incidents.report','complaints.record')
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'risk_flags.read','governance_incidents.read','complaints.read','complaints.restricted_read',
  'corrective_actions.read','corrective_actions.verify','audit.read'
)
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint

CREATE POLICY risk_flags_select ON public.risk_flags FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'risk_flags.read'));
CREATE POLICY risk_flags_insert ON public.risk_flags FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'risk_flags.manage') AND created_by=private.current_profile_id());
CREATE POLICY risk_flags_update ON public.risk_flags FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id,'risk_flags.manage') OR private.has_permission(organization_id,'risk_flags.resolve'))) WITH CHECK (private.has_active_membership(organization_id));
CREATE POLICY risk_flags_delete ON public.risk_flags FOR DELETE TO app_runtime USING (false);

CREATE POLICY governance_incidents_select ON public.governance_incidents FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'governance_incidents.read'));
CREATE POLICY governance_incidents_insert ON public.governance_incidents FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'governance_incidents.report') AND reported_by=private.current_profile_id());
CREATE POLICY governance_incidents_update ON public.governance_incidents FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'governance_incidents.manage')) WITH CHECK (private.has_active_membership(organization_id));
CREATE POLICY governance_incidents_delete ON public.governance_incidents FOR DELETE TO app_runtime USING (false);

CREATE POLICY complaints_select ON public.complaints FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'complaints.read') AND (classification <> 'restricted' OR private.has_permission(organization_id,'complaints.restricted_read')));
CREATE POLICY complaints_insert ON public.complaints FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'complaints.record') AND recorded_by=private.current_profile_id());
CREATE POLICY complaints_update ON public.complaints FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'complaints.manage')) WITH CHECK (private.has_active_membership(organization_id));
CREATE POLICY complaints_delete ON public.complaints FOR DELETE TO app_runtime USING (false);

CREATE POLICY corrective_actions_select ON public.corrective_actions FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'corrective_actions.read'));
CREATE POLICY corrective_actions_insert ON public.corrective_actions FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id,'corrective_actions.manage') AND created_by=private.current_profile_id());
CREATE POLICY corrective_actions_update ON public.corrective_actions FOR UPDATE TO app_runtime USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id,'corrective_actions.manage') OR private.has_permission(organization_id,'corrective_actions.verify'))) WITH CHECK (private.has_active_membership(organization_id));
CREATE POLICY corrective_actions_delete ON public.corrective_actions FOR DELETE TO app_runtime USING (false);

CREATE POLICY governance_events_select ON public.governance_events FOR SELECT TO app_runtime USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id,'audit.read') OR private.has_permission(organization_id,'risk_flags.read')));
CREATE POLICY governance_events_insert ON public.governance_events FOR INSERT TO app_runtime WITH CHECK (private.has_active_membership(organization_id) AND actor_profile_id=private.current_profile_id());
CREATE POLICY governance_events_update ON public.governance_events FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY governance_events_delete ON public.governance_events FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT,INSERT,UPDATE ON public.risk_flags,public.governance_incidents,public.complaints,public.corrective_actions,public.governance_events TO app_runtime;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.enforce_governance_status_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'risk_flags' AND NOT (
    (OLD.status='open' AND NEW.status IN ('monitoring','mitigated','accepted','closed')) OR
    (OLD.status='monitoring' AND NEW.status IN ('mitigated','accepted','closed')) OR
    (OLD.status IN ('mitigated','accepted') AND NEW.status='closed')
  ) THEN RAISE EXCEPTION 'Invalid risk transition'; END IF;
  IF TG_TABLE_NAME = 'governance_incidents' AND NOT (
    (OLD.status='reported' AND NEW.status IN ('investigating','contained','resolved')) OR
    (OLD.status='investigating' AND NEW.status IN ('contained','resolved')) OR
    (OLD.status='contained' AND NEW.status='resolved') OR
    (OLD.status='resolved' AND NEW.status='closed')
  ) THEN RAISE EXCEPTION 'Invalid incident transition'; END IF;
  IF TG_TABLE_NAME = 'complaints' AND NOT (
    (OLD.status='received' AND NEW.status IN ('triaged','rejected')) OR
    (OLD.status='triaged' AND NEW.status IN ('in_progress','resolved','rejected')) OR
    (OLD.status='in_progress' AND NEW.status='resolved') OR
    (OLD.status='resolved' AND NEW.status='closed')
  ) THEN RAISE EXCEPTION 'Invalid complaint transition'; END IF;
  IF TG_TABLE_NAME = 'corrective_actions' AND NOT (
    (OLD.status='open' AND NEW.status IN ('in_progress','completed','cancelled')) OR
    (OLD.status='in_progress' AND NEW.status IN ('completed','cancelled')) OR
    (OLD.status='completed' AND NEW.status='verified')
  ) THEN RAISE EXCEPTION 'Invalid corrective action transition'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_risk_flags_transition BEFORE UPDATE OF status ON public.risk_flags FOR EACH ROW EXECUTE FUNCTION private.enforce_governance_status_transition();
CREATE TRIGGER trg_governance_incidents_transition BEFORE UPDATE OF status ON public.governance_incidents FOR EACH ROW EXECUTE FUNCTION private.enforce_governance_status_transition();
CREATE TRIGGER trg_complaints_transition BEFORE UPDATE OF status ON public.complaints FOR EACH ROW EXECUTE FUNCTION private.enforce_governance_status_transition();
CREATE TRIGGER trg_corrective_actions_transition BEFORE UPDATE OF status ON public.corrective_actions FOR EACH ROW EXECUTE FUNCTION private.enforce_governance_status_transition();

CREATE TRIGGER trg_risk_flags_touch BEFORE UPDATE ON public.risk_flags FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_governance_incidents_touch BEFORE UPDATE ON public.governance_incidents FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_complaints_touch BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_corrective_actions_touch BEFORE UPDATE ON public.corrective_actions FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE OR REPLACE FUNCTION private.prevent_governance_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Governance event is append-only'; END $$;
CREATE TRIGGER trg_governance_events_append_only BEFORE UPDATE OR DELETE ON public.governance_events FOR EACH ROW EXECUTE FUNCTION private.prevent_governance_event_mutation();
