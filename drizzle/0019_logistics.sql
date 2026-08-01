CREATE TABLE public.logistics_couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  courier_type text DEFAULT 'external' NOT NULL,
  contact_name text,
  contact_phone text,
  service_notes text,
  status text DEFAULT 'active' NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT logistics_couriers_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT logistics_couriers_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT logistics_couriers_code_check CHECK (code ~ '^[A-Z0-9._:-]{2,80}$'),
  CONSTRAINT logistics_couriers_name_check CHECK (length(trim(name)) >= 3),
  CONSTRAINT logistics_couriers_type_check CHECK (courier_type IN ('internal', 'external', 'partner')),
  CONSTRAINT logistics_couriers_status_check CHECK (status IN ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE public.logistics_couriers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.logistics_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  packing_id uuid NOT NULL,
  courier_id uuid NOT NULL,
  tracking_number text,
  service_level text,
  destination_name text NOT NULL,
  destination_phone text,
  destination_address text NOT NULL,
  planned_dispatch_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  status text DEFAULT 'draft' NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT logistics_shipments_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT logistics_shipments_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT logistics_shipments_destination_check CHECK (
    length(trim(destination_name)) >= 2 AND length(trim(destination_address)) >= 10
  ),
  CONSTRAINT logistics_shipments_status_check CHECK (status IN (
    'draft', 'dispatched', 'in_transit', 'delivered', 'return_requested',
    'returning', 'returned', 'cancelled'
  ))
);
--> statement-breakpoint
ALTER TABLE public.logistics_shipments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.logistics_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  shipment_id uuid NOT NULL,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL,
  location text,
  notes text,
  external_event_id text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT logistics_tracking_events_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT logistics_tracking_events_external_unique UNIQUE (organization_id, shipment_id, external_event_id),
  CONSTRAINT logistics_tracking_events_type_check CHECK (event_type IN (
    'dispatched', 'picked_up', 'in_transit', 'arrived_hub', 'out_for_delivery',
    'delivery_attempt', 'delivered', 'return_requested', 'return_in_transit',
    'returned', 'damaged', 'lost', 'note'
  )),
  CONSTRAINT logistics_tracking_events_notes_check CHECK (
    event_type <> 'note' OR length(trim(notes)) >= 5
  )
);
--> statement-breakpoint
ALTER TABLE public.logistics_tracking_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.logistics_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  shipment_id uuid NOT NULL,
  recipient_name text NOT NULL,
  relationship_to_recipient text,
  received_at timestamptz NOT NULL,
  confirmation_method text DEFAULT 'field_confirmation' NOT NULL,
  notes text,
  confirmed_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT logistics_deliveries_shipment_unique UNIQUE (shipment_id),
  CONSTRAINT logistics_deliveries_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT logistics_deliveries_recipient_check CHECK (length(trim(recipient_name)) >= 2),
  CONSTRAINT logistics_deliveries_method_check CHECK (confirmation_method IN ('field_confirmation', 'courier_webhook', 'manual_verification'))
);
--> statement-breakpoint
ALTER TABLE public.logistics_deliveries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.logistics_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  shipment_id uuid NOT NULL,
  reason_code text NOT NULL,
  reason_notes text NOT NULL,
  requested_at timestamptz DEFAULT now() NOT NULL,
  requested_by uuid NOT NULL,
  received_at timestamptz,
  received_by uuid,
  condition_on_return text,
  status text DEFAULT 'requested' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT logistics_returns_shipment_unique UNIQUE (shipment_id),
  CONSTRAINT logistics_returns_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT logistics_returns_reason_check CHECK (reason_code IN ('recipient_unavailable', 'address_invalid', 'refused', 'damaged', 'delivery_failed', 'other')),
  CONSTRAINT logistics_returns_notes_check CHECK (length(trim(reason_notes)) >= 10),
  CONSTRAINT logistics_returns_status_check CHECK (status IN ('requested', 'in_transit', 'received')),
  CONSTRAINT logistics_returns_receive_check CHECK (
    (status <> 'received' AND received_at IS NULL AND received_by IS NULL AND condition_on_return IS NULL)
    OR (status = 'received' AND received_at IS NOT NULL AND received_by IS NOT NULL AND length(trim(condition_on_return)) >= 10)
  )
);
--> statement-breakpoint
ALTER TABLE public.logistics_returns ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.logistics_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  shipment_id uuid NOT NULL,
  incident_type text NOT NULL,
  severity text DEFAULT 'medium' NOT NULL,
  occurred_at timestamptz NOT NULL,
  location text,
  description text NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  resolution_notes text,
  reported_by uuid NOT NULL,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT logistics_incidents_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT logistics_incidents_type_check CHECK (incident_type IN ('damage', 'loss', 'delay', 'security', 'other')),
  CONSTRAINT logistics_incidents_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT logistics_incidents_description_check CHECK (length(trim(description)) >= 10),
  CONSTRAINT logistics_incidents_status_check CHECK (status IN ('open', 'resolved')),
  CONSTRAINT logistics_incidents_resolution_check CHECK (
    (status = 'open' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution_notes IS NULL)
    OR (status = 'resolved' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(trim(resolution_notes)) >= 10)
  )
);
--> statement-breakpoint
ALTER TABLE public.logistics_incidents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.logistics_idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  command_type text NOT NULL,
  request_hash text NOT NULL,
  status text DEFAULT 'processing' NOT NULL,
  response_snapshot jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  CONSTRAINT logistics_idempotency_org_key_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT logistics_idempotency_values_check CHECK (
    status IN ('processing', 'completed') AND length(idempotency_key) BETWEEN 16 AND 200
  )
);
--> statement-breakpoint
ALTER TABLE public.logistics_idempotency_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.logistics_couriers
  ADD CONSTRAINT logistics_couriers_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_couriers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_couriers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.logistics_shipments
  ADD CONSTRAINT logistics_shipments_packing_fkey FOREIGN KEY (packing_id, organization_id) REFERENCES public.aid_package_packings(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_shipments_courier_fkey FOREIGN KEY (courier_id, organization_id) REFERENCES public.logistics_couriers(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_shipments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_shipments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.logistics_tracking_events
  ADD CONSTRAINT logistics_tracking_events_shipment_fkey FOREIGN KEY (shipment_id, organization_id) REFERENCES public.logistics_shipments(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_tracking_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.logistics_deliveries
  ADD CONSTRAINT logistics_deliveries_shipment_fkey FOREIGN KEY (shipment_id, organization_id) REFERENCES public.logistics_shipments(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_deliveries_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.logistics_returns
  ADD CONSTRAINT logistics_returns_shipment_fkey FOREIGN KEY (shipment_id, organization_id) REFERENCES public.logistics_shipments(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_returns_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_returns_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.logistics_incidents
  ADD CONSTRAINT logistics_incidents_shipment_fkey FOREIGN KEY (shipment_id, organization_id) REFERENCES public.logistics_shipments(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_incidents_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_incidents_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.logistics_idempotency_records
  ADD CONSTRAINT logistics_idempotency_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT logistics_idempotency_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE INDEX idx_logistics_couriers_org_status ON public.logistics_couriers (organization_id, status, name);
CREATE INDEX idx_logistics_shipments_org_status ON public.logistics_shipments (organization_id, status, created_at DESC);
CREATE INDEX idx_logistics_shipments_packing ON public.logistics_shipments (organization_id, packing_id);
CREATE INDEX idx_logistics_shipments_tracking ON public.logistics_shipments (organization_id, tracking_number) WHERE tracking_number IS NOT NULL;
CREATE UNIQUE INDEX idx_logistics_shipments_active_packing ON public.logistics_shipments (organization_id, packing_id) WHERE status NOT IN ('cancelled', 'returned');
CREATE INDEX idx_logistics_tracking_shipment ON public.logistics_tracking_events (organization_id, shipment_id, event_at DESC);
CREATE INDEX idx_logistics_returns_org_status ON public.logistics_returns (organization_id, status, requested_at DESC);
CREATE INDEX idx_logistics_incidents_org_status ON public.logistics_incidents (organization_id, status, severity, occurred_at DESC);
CREATE INDEX idx_logistics_idempotency_created ON public.logistics_idempotency_records (organization_id, created_at);
--> statement-breakpoint

CREATE POLICY logistics_couriers_select ON public.logistics_couriers FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_couriers.read'));
CREATE POLICY logistics_couriers_insert ON public.logistics_couriers FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_couriers.manage') AND created_by = private.current_profile_id());
CREATE POLICY logistics_couriers_update ON public.logistics_couriers FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_couriers.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_couriers.manage'));
CREATE POLICY logistics_couriers_delete ON public.logistics_couriers FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY logistics_shipments_select ON public.logistics_shipments FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.read'));
CREATE POLICY logistics_shipments_insert ON public.logistics_shipments FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.manage') AND created_by = private.current_profile_id());
CREATE POLICY logistics_shipments_update ON public.logistics_shipments FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'logistics_shipments.manage') OR
    private.has_permission(organization_id, 'logistics_shipments.dispatch') OR
    private.has_permission(organization_id, 'logistics_shipments.track') OR
    private.has_permission(organization_id, 'logistics_shipments.deliver') OR
    private.has_permission(organization_id, 'logistics_shipments.return')
  )) WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'logistics_shipments.manage') OR
    private.has_permission(organization_id, 'logistics_shipments.dispatch') OR
    private.has_permission(organization_id, 'logistics_shipments.track') OR
    private.has_permission(organization_id, 'logistics_shipments.deliver') OR
    private.has_permission(organization_id, 'logistics_shipments.return')
  ));
CREATE POLICY logistics_shipments_delete ON public.logistics_shipments FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY logistics_tracking_events_select ON public.logistics_tracking_events FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.read'));
CREATE POLICY logistics_tracking_events_insert ON public.logistics_tracking_events FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'logistics_shipments.track') OR
    private.has_permission(organization_id, 'logistics_shipments.dispatch') OR
    private.has_permission(organization_id, 'logistics_shipments.deliver') OR
    private.has_permission(organization_id, 'logistics_shipments.return')
  ) AND created_by = private.current_profile_id());
CREATE POLICY logistics_tracking_events_update ON public.logistics_tracking_events FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY logistics_tracking_events_delete ON public.logistics_tracking_events FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY logistics_deliveries_select ON public.logistics_deliveries FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.read'));
CREATE POLICY logistics_deliveries_insert ON public.logistics_deliveries FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.deliver') AND confirmed_by = private.current_profile_id());
CREATE POLICY logistics_deliveries_update ON public.logistics_deliveries FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY logistics_deliveries_delete ON public.logistics_deliveries FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY logistics_returns_select ON public.logistics_returns FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.read'));
CREATE POLICY logistics_returns_insert ON public.logistics_returns FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.return') AND requested_by = private.current_profile_id());
CREATE POLICY logistics_returns_update ON public.logistics_returns FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.return'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_shipments.return'));
CREATE POLICY logistics_returns_delete ON public.logistics_returns FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY logistics_incidents_select ON public.logistics_incidents FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_incidents.read'));
CREATE POLICY logistics_incidents_insert ON public.logistics_incidents FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_incidents.manage') AND reported_by = private.current_profile_id());
CREATE POLICY logistics_incidents_update ON public.logistics_incidents FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_incidents.resolve'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'logistics_incidents.resolve'));
CREATE POLICY logistics_incidents_delete ON public.logistics_incidents FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY logistics_idempotency_select ON public.logistics_idempotency_records FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id));
CREATE POLICY logistics_idempotency_insert ON public.logistics_idempotency_records FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND created_by = private.current_profile_id());
CREATE POLICY logistics_idempotency_update ON public.logistics_idempotency_records FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id)) WITH CHECK (private.has_active_membership(organization_id));
CREATE POLICY logistics_idempotency_delete ON public.logistics_idempotency_records FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.logistics_couriers,
  public.logistics_shipments,
  public.logistics_tracking_events,
  public.logistics_deliveries,
  public.logistics_returns,
  public.logistics_incidents,
  public.logistics_idempotency_records
TO app_runtime;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.prevent_logistics_append_only_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Logistics event records are append-only';
END;
$$;
CREATE TRIGGER trg_logistics_tracking_append_only BEFORE UPDATE OR DELETE ON public.logistics_tracking_events FOR EACH ROW EXECUTE FUNCTION private.prevent_logistics_append_only_mutation();
CREATE TRIGGER trg_logistics_delivery_append_only BEFORE UPDATE OR DELETE ON public.logistics_deliveries FOR EACH ROW EXECUTE FUNCTION private.prevent_logistics_append_only_mutation();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.protect_logistics_shipment_state()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.organization_id <> NEW.organization_id OR OLD.packing_id <> NEW.packing_id OR OLD.reference_number <> NEW.reference_number THEN
    RAISE EXCEPTION 'Shipment ownership and source are immutable';
  END IF;
  IF OLD.status <> 'draft' AND (
    OLD.courier_id <> NEW.courier_id OR
    OLD.destination_name <> NEW.destination_name OR
    OLD.destination_address <> NEW.destination_address OR
    OLD.destination_phone IS DISTINCT FROM NEW.destination_phone
  ) THEN
    RAISE EXCEPTION 'Dispatched shipment context is immutable';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('dispatched', 'cancelled')) OR
    (OLD.status = 'dispatched' AND NEW.status IN ('in_transit', 'delivered', 'return_requested')) OR
    (OLD.status = 'in_transit' AND NEW.status IN ('delivered', 'return_requested')) OR
    (OLD.status = 'delivered' AND NEW.status = 'return_requested') OR
    (OLD.status = 'return_requested' AND NEW.status IN ('returning', 'returned')) OR
    (OLD.status = 'returning' AND NEW.status = 'returned')
  ) THEN
    RAISE EXCEPTION 'Invalid logistics shipment status transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_logistics_shipment_state BEFORE UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION private.protect_logistics_shipment_state();
CREATE TRIGGER trg_logistics_couriers_touch_updated_at BEFORE UPDATE ON public.logistics_couriers FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_logistics_shipments_touch_updated_at BEFORE UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_logistics_returns_touch_updated_at BEFORE UPDATE ON public.logistics_returns FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_logistics_incidents_touch_updated_at BEFORE UPDATE ON public.logistics_incidents FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('logistics_couriers.read', 'logistics_couriers', 'read', 'Melihat master kurir logistik'),
  ('logistics_couriers.manage', 'logistics_couriers', 'manage', 'Mengelola master kurir logistik'),
  ('logistics_shipments.read', 'logistics_shipments', 'read', 'Melihat shipment dan tracking logistik'),
  ('logistics_shipments.manage', 'logistics_shipments', 'manage', 'Membuat draft shipment logistik'),
  ('logistics_shipments.dispatch', 'logistics_shipments', 'dispatch', 'Memberangkatkan shipment logistik'),
  ('logistics_shipments.track', 'logistics_shipments', 'track', 'Mencatat tracking shipment append-only'),
  ('logistics_shipments.deliver', 'logistics_shipments', 'deliver', 'Mengonfirmasi penerimaan shipment'),
  ('logistics_shipments.return', 'logistics_shipments', 'return', 'Mengelola pengembalian shipment'),
  ('logistics_incidents.read', 'logistics_incidents', 'read', 'Melihat insiden logistik'),
  ('logistics_incidents.manage', 'logistics_incidents', 'manage', 'Melaporkan insiden logistik'),
  ('logistics_incidents.resolve', 'logistics_incidents', 'resolve', 'Menyelesaikan insiden logistik')
ON CONFLICT (key) DO UPDATE SET resource = EXCLUDED.resource, action = EXCLUDED.action, description = EXCLUDED.description, updated_at = now();
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.resource IN ('logistics_couriers', 'logistics_shipments', 'logistics_incidents')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'logistics_couriers.read', 'logistics_shipments.read', 'logistics_shipments.manage',
  'logistics_shipments.dispatch', 'logistics_shipments.track', 'logistics_shipments.deliver',
  'logistics_shipments.return', 'logistics_incidents.read', 'logistics_incidents.manage'
)
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'logistics_couriers.read', 'logistics_shipments.read', 'logistics_incidents.read'
)
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
