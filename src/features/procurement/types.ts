export type ProcurementRequestStatus =
  | "approved"
  | "cancelled"
  | "draft"
  | "goods_received"
  | "ordered"
  | "submitted";

export type PurchaseOrderStatus =
  | "cancelled"
  | "draft"
  | "issued"
  | "partially_received"
  | "received";

export type ProcurementItem = {
  estimated_unit_price?: string;
  name: string;
  quantity: string;
  unit: string;
};

export type ProcurementEvent = {
  actor_name?: string;
  entity_type: string;
  event_type: string;
  from_status?: string | null;
  id: string;
  notes?: string | null;
  occurred_at: string;
  to_status: string;
};

export type PurchaseOrder = {
  amount: string;
  currency: string;
  expected_delivery_at?: string | null;
  id: string;
  issued_at?: string | null;
  payment_terms?: string | null;
  procurement_request_id: string;
  reference_number: string;
  status: PurchaseOrderStatus;
  vendor_contact_id: string;
};

export type GoodsReceipt = {
  condition_summary: string;
  id: string;
  items_received: ProcurementItem[];
  receipt_number: string;
  received_at: string;
  received_status: "partially_received" | "received";
  receiver_name?: string;
};

export type VendorInvoice = {
  amount: string;
  currency: string;
  id: string;
  invoice_date: string;
  invoice_number: string;
  payment_reference?: string | null;
  status: "cancelled" | "paid" | "recorded";
};

export type ProcurementRequest = {
  created_at: string;
  currency: string;
  events?: ProcurementEvent[];
  expected_at?: string | null;
  goods_receipts?: GoodsReceipt[];
  id: string;
  items: ProcurementItem[];
  program_id?: string | null;
  program_name?: string | null;
  purchase_order_id?: string | null;
  purchase_order_reference?: string | null;
  purchase_order_status?: PurchaseOrderStatus | null;
  purchase_orders?: PurchaseOrder[];
  purpose: string;
  quote_amount?: string | null;
  quote_currency?: string | null;
  reference_number: string;
  status: ProcurementRequestStatus;
  title: string;
  updated_at: string;
  vendor_contact_id?: string | null;
  vendor_invoices?: VendorInvoice[];
  vendor_name?: string | null;
};
