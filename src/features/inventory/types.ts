export type InventoryProduct = {
  base_unit: string;
  category?: string | null;
  created_at: string;
  id: string;
  name: string;
  sku: string;
  status: "active" | "archived" | "inactive";
  track_batch: boolean;
  track_expiry: boolean;
  updated_at: string;
};

export type InventoryWarehouse = {
  address_notes?: string | null;
  code: string;
  created_at: string;
  id: string;
  name: string;
  status: "active" | "archived" | "inactive";
  type: "central" | "field" | "partner" | "virtual";
  updated_at: string;
};

export type InventoryBalance = {
  base_unit: string;
  batch_number?: string | null;
  expires_at?: string | null;
  id: string;
  product_id: string;
  product_name: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  sku: string;
  warehouse_code: string;
  warehouse_id: string;
  warehouse_name: string;
};

export type InventoryMovement = {
  batch_number?: string | null;
  created_at: string;
  direction: "in" | "out";
  id: string;
  movement_type: string;
  occurred_at: string;
  product_name: string;
  quantity: string;
  source_type: string;
  unit: string;
  warehouse_code: string;
};

export type InventoryAdjustmentStatus =
  | "approved"
  | "cancelled"
  | "draft"
  | "posted"
  | "rejected"
  | "submitted";

export type InventoryAdjustment = {
  adjustment_type: string;
  approver_name?: string | null;
  base_unit: string;
  batch_number?: string | null;
  created_at: string;
  creator_name?: string | null;
  decision_notes?: string | null;
  expected_delta: string;
  expires_at?: string | null;
  id: string;
  notes: string;
  poster_name?: string | null;
  product_id: string;
  product_name: string;
  reference_number: string;
  sku: string;
  status: InventoryAdjustmentStatus;
  unit: string;
  updated_at: string;
  warehouse_code: string;
  warehouse_id: string;
  warehouse_name: string;
};
