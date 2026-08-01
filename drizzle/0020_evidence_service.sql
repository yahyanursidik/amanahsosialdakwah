CREATE TABLE public.evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  logical_file_id uuid DEFAULT gen_random_uuid() NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  previous_version_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  classification text DEFAULT 'internal' NOT NULL,
  purpose text NOT NULL,
  original_file_name text NOT NULL,
  safe_file_name text NOT NULL,
  object_key text NOT NULL,
  storage_bucket text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  checksum_sha256 text,
  status text DEFAULT 'pending_upload' NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz,
  superseded_at timestamptz,
  deleted_by uuid,
  deleted_at timestamptz,
  deletion_reason text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT evidence_files_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT evidence_files_object_key_unique UNIQUE (object_key),
  CONSTRAINT evidence_files_logical_version_unique UNIQUE (organization_id, logical_file_id, version),
  CONSTRAINT evidence_files_version_check CHECK (version > 0),
  CONSTRAINT evidence_files_entity_type_check CHECK (entity_type IN (
    'application', 'case', 'assessment', 'distribution', 'procurement',
    'inventory_adjustment', 'aid_package_packing', 'logistics_shipment',
    'logistics_incident', 'crm_contact'
  )),
  CONSTRAINT evidence_files_classification_check CHECK (classification IN ('internal', 'confidential', 'restricted')),
  CONSTRAINT evidence_files_status_check CHECK (status IN ('pending_upload', 'available', 'quarantined', 'superseded', 'deleted')),
  CONSTRAINT evidence_files_name_check CHECK (length(trim(original_file_name)) BETWEEN 1 AND 255 AND safe_file_name ~ '^[A-Za-z0-9._-]{1,180}$'),
  CONSTRAINT evidence_files_size_check CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  CONSTRAINT evidence_files_checksum_check CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT evidence_files_confirmation_check CHECK (
    (status = 'pending_upload' AND confirmed_by IS NULL AND confirmed_at IS NULL)
    OR (status <> 'pending_upload' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)
  ),
  CONSTRAINT evidence_files_deletion_check CHECK (
    (status <> 'deleted' AND deleted_by IS NULL AND deleted_at IS NULL AND deletion_reason IS NULL)
    OR (status = 'deleted' AND deleted_by IS NOT NULL AND deleted_at IS NOT NULL AND length(trim(deletion_reason)) >= 10)
  )
);
--> statement-breakpoint
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.evidence_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  evidence_file_id uuid NOT NULL,
  action text NOT NULL,
  actor_profile_id uuid NOT NULL,
  request_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT evidence_access_events_action_check CHECK (action IN (
    'upload_intent_created', 'upload_confirmed', 'metadata_viewed',
    'download_url_created', 'version_superseded', 'marked_deleted',
    'publication_created', 'publication_revoked'
  ))
);
--> statement-breakpoint
ALTER TABLE public.evidence_access_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.evidence_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  evidence_file_id uuid NOT NULL,
  consent_reference text NOT NULL,
  redaction_notes text NOT NULL,
  status text DEFAULT 'published' NOT NULL,
  published_by uuid NOT NULL,
  published_at timestamptz DEFAULT now() NOT NULL,
  revoked_by uuid,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT evidence_publications_file_unique UNIQUE (evidence_file_id),
  CONSTRAINT evidence_publications_status_check CHECK (status IN ('published', 'revoked')),
  CONSTRAINT evidence_publications_consent_check CHECK (length(trim(consent_reference)) >= 5 AND length(trim(redaction_notes)) >= 10),
  CONSTRAINT evidence_publications_revocation_check CHECK (
    (status = 'published' AND revoked_by IS NULL AND revoked_at IS NULL AND revocation_reason IS NULL)
    OR (status = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL AND length(trim(revocation_reason)) >= 10)
  )
);
--> statement-breakpoint
ALTER TABLE public.evidence_publications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.evidence_files
  ADD CONSTRAINT evidence_files_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_files_previous_fkey FOREIGN KEY (previous_version_id, organization_id) REFERENCES public.evidence_files(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_files_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_files_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.evidence_access_events
  ADD CONSTRAINT evidence_access_events_file_fkey FOREIGN KEY (evidence_file_id, organization_id) REFERENCES public.evidence_files(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_access_events_actor_fkey FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.evidence_publications
  ADD CONSTRAINT evidence_publications_file_fkey FOREIGN KEY (evidence_file_id, organization_id) REFERENCES public.evidence_files(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_publications_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_publications_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE INDEX idx_evidence_files_org_entity ON public.evidence_files (organization_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_evidence_files_org_status ON public.evidence_files (organization_id, status, classification, created_at DESC);
CREATE INDEX idx_evidence_files_logical ON public.evidence_files (organization_id, logical_file_id, version DESC);
CREATE INDEX idx_evidence_events_file ON public.evidence_access_events (organization_id, evidence_file_id, created_at DESC);
CREATE INDEX idx_evidence_publications_status ON public.evidence_publications (organization_id, status, published_at DESC);
--> statement-breakpoint

CREATE POLICY evidence_files_select ON public.evidence_files FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_files.read') AND (classification <> 'restricted' OR private.has_permission(organization_id, 'evidence_files.restricted_read')));
CREATE POLICY evidence_files_insert ON public.evidence_files FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_files.upload') AND created_by = private.current_profile_id());
CREATE POLICY evidence_files_update ON public.evidence_files FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'evidence_files.upload') OR
    private.has_permission(organization_id, 'evidence_files.delete')
  )) WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'evidence_files.upload') OR
    private.has_permission(organization_id, 'evidence_files.delete')
  ));
CREATE POLICY evidence_files_delete ON public.evidence_files FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY evidence_access_events_select ON public.evidence_access_events FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_audit.read'));
CREATE POLICY evidence_access_events_insert ON public.evidence_access_events FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND actor_profile_id = private.current_profile_id());
CREATE POLICY evidence_access_events_update ON public.evidence_access_events FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY evidence_access_events_delete ON public.evidence_access_events FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY evidence_publications_select ON public.evidence_publications FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_files.read'));
CREATE POLICY evidence_publications_insert ON public.evidence_publications FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_files.publish') AND published_by = private.current_profile_id());
CREATE POLICY evidence_publications_update ON public.evidence_publications FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_files.publish'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'evidence_files.publish'));
CREATE POLICY evidence_publications_delete ON public.evidence_publications FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE public.evidence_files, public.evidence_access_events, public.evidence_publications TO app_runtime;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.prevent_evidence_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Evidence audit events are append-only';
END;
$$;
CREATE TRIGGER trg_evidence_events_append_only BEFORE UPDATE OR DELETE ON public.evidence_access_events FOR EACH ROW EXECUTE FUNCTION private.prevent_evidence_event_mutation();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.protect_evidence_file_state()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.organization_id <> NEW.organization_id OR OLD.logical_file_id <> NEW.logical_file_id OR OLD.version <> NEW.version
    OR OLD.entity_type <> NEW.entity_type OR OLD.entity_id <> NEW.entity_id OR OLD.object_key <> NEW.object_key
    OR OLD.mime_type <> NEW.mime_type OR OLD.size_bytes <> NEW.size_bytes THEN
    RAISE EXCEPTION 'Evidence identity and storage metadata are immutable';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'pending_upload' AND NEW.status IN ('available', 'quarantined', 'deleted')) OR
    (OLD.status = 'available' AND NEW.status IN ('quarantined', 'superseded', 'deleted')) OR
    (OLD.status = 'quarantined' AND NEW.status = 'deleted')
  ) THEN
    RAISE EXCEPTION 'Invalid evidence status transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_evidence_file_state BEFORE UPDATE ON public.evidence_files FOR EACH ROW EXECUTE FUNCTION private.protect_evidence_file_state();
CREATE TRIGGER trg_evidence_files_touch_updated_at BEFORE UPDATE ON public.evidence_files FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('evidence_files.read', 'evidence_files', 'read', 'Melihat metadata bukti'),
  ('evidence_files.restricted_read', 'evidence_files', 'restricted_read', 'Melihat bukti berklasifikasi restricted'),
  ('evidence_files.upload', 'evidence_files', 'upload', 'Membuat upload intent dan konfirmasi bukti'),
  ('evidence_files.download', 'evidence_files', 'download', 'Membuat signed download URL'),
  ('evidence_files.delete', 'evidence_files', 'delete', 'Menandai bukti terhapus secara terkontrol'),
  ('evidence_files.publish', 'evidence_files', 'publish', 'Mempublikasikan bukti dengan consent dan redaksi'),
  ('evidence_audit.read', 'evidence_audit', 'read', 'Melihat audit akses bukti')
ON CONFLICT (key) DO UPDATE SET resource = EXCLUDED.resource, action = EXCLUDED.action, description = EXCLUDED.description, updated_at = now();
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.resource IN ('evidence_files', 'evidence_audit')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('evidence_files.read', 'evidence_files.upload', 'evidence_files.download')
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('evidence_files.read', 'evidence_files.restricted_read', 'evidence_files.download', 'evidence_audit.read')
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
