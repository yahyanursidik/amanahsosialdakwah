export type AidPackageTemplateStatus = "active" | "archived" | "draft";
export type AidPackagePackingStatus =
  "cancelled" | "draft" | "packed" | "reversed";

export type AidPackageTemplateItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: string;
  unit: string;
  allow_substitution: boolean;
  substitution_notes: string | null;
};

export type AidPackageTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AidPackageTemplateStatus;
  item_count: number;
  items?: AidPackageTemplateItem[];
  published_at: string | null;
  created_at: string;
};

export type AidPackagePackingItem = {
  id: string;
  requested_product_id: string;
  requested_product_name: string;
  requested_sku: string;
  actual_product_id: string;
  actual_product_name: string;
  actual_sku: string;
  batch_number: string | null;
  expires_at: string | null;
  quantity: string;
  unit: string;
  is_substitution: boolean;
  substitution_reason: string | null;
};

export type AidPackagePacking = {
  id: string;
  reference_number: string;
  template_id: string;
  template_code: string;
  template_name: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  package_count: number;
  recipient_label: string | null;
  notes: string | null;
  status: AidPackagePackingStatus;
  packed_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  items?: AidPackagePackingItem[];
  planned_items?: AidPackageTemplateItem[];
  created_at: string;
};
