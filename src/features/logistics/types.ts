export type LogisticsCourier = {
  id: string;
  code: string;
  name: string;
  courier_type: "external" | "internal" | "partner";
  contact_name: string | null;
  contact_phone: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type LogisticsShipmentStatus =
  | "cancelled"
  | "delivered"
  | "dispatched"
  | "draft"
  | "in_transit"
  | "returned"
  | "returning"
  | "return_requested";

export type LogisticsTrackingEvent = {
  id: string;
  event_type: string;
  event_at: string;
  location: string | null;
  notes: string | null;
};

export type LogisticsIncident = {
  id: string;
  incident_type: string;
  severity: "critical" | "high" | "low" | "medium";
  occurred_at: string;
  description: string;
  status: "open" | "resolved";
  resolution_notes: string | null;
};

export type LogisticsReturn = {
  id: string;
  reason_code: string;
  reason_notes: string;
  status: "in_transit" | "received" | "requested";
  received_at: string | null;
  condition_on_return: string | null;
};

export type LogisticsDelivery = {
  id: string;
  recipient_name: string;
  relationship_to_recipient: string | null;
  received_at: string;
  confirmation_method: string;
  notes: string | null;
};

export type LogisticsShipment = {
  id: string;
  reference_number: string;
  packing_id: string;
  packing_reference: string;
  package_name?: string;
  package_count: number;
  courier_id: string;
  courier_code: string;
  courier_name: string;
  tracking_number: string | null;
  service_level: string | null;
  destination_name: string;
  destination_phone?: string | null;
  destination_address?: string;
  planned_dispatch_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  status: LogisticsShipmentStatus;
  notes?: string | null;
  created_at: string;
  tracking_events?: LogisticsTrackingEvent[];
  deliveries?: LogisticsDelivery[];
  returns?: LogisticsReturn[];
  incidents?: LogisticsIncident[];
};
