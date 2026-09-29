export type InKindDonationItem = {
  batch_number: string | null;
  expires_at: string | null;
  id: string;
  item_condition: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: string;
  total_value?: string;
  unit: string;
  unit_value: string;
};

export type InKindDonation = {
  created_at: string;
  currency: string;
  donor_contact_id: string | null;
  donor_contact_name: string | null;
  donor_name: string;
  donor_type: string;
  estimated_total_value: string;
  giving_type: string;
  id: string;
  item_count?: number;
  items?: InKindDonationItem[];
  notes: string | null;
  program_code: string | null;
  program_id: string | null;
  program_name: string | null;
  received_at: string;
  reference_number: string;
  warehouse_id: string;
  warehouse_name: string | null;
  waqf_asset_id: string | null;
  waqf_asset_name: string | null;
};

export type InventoryProductOption = {
  base_unit: string;
  id: string;
  name: string;
  sku: string;
  status: string;
};

export type InventoryWarehouseOption = {
  code: string;
  id: string;
  name: string;
  status: string;
};
