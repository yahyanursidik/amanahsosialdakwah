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

const requestTransitions: Record<
  ProcurementRequestStatus,
  ProcurementRequestStatus[]
> = {
  approved: ["cancelled", "ordered"],
  cancelled: [],
  draft: ["cancelled", "submitted"],
  goods_received: [],
  ordered: ["cancelled", "goods_received"],
  submitted: ["approved", "cancelled"],
};

const purchaseOrderTransitions: Record<
  PurchaseOrderStatus,
  PurchaseOrderStatus[]
> = {
  cancelled: [],
  draft: ["cancelled", "issued"],
  issued: ["cancelled", "partially_received", "received"],
  partially_received: ["cancelled", "received"],
  received: [],
};

export function assertProcurementRequestTransition(
  current: ProcurementRequestStatus,
  target: ProcurementRequestStatus,
): void {
  if (!requestTransitions[current].includes(target)) {
    throw new Error(`Transisi permintaan pengadaan ${current} ke ${target} tidak valid.`);
  }
}

export function assertPurchaseOrderTransition(
  current: PurchaseOrderStatus,
  target: PurchaseOrderStatus,
): void {
  if (!purchaseOrderTransitions[current].includes(target)) {
    throw new Error(`Transisi PO ${current} ke ${target} tidak valid.`);
  }
}

export function assertProcurementItems(
  items: Array<{ name: string; quantity: string; unit: string }>,
): void {
  if (items.length < 1) {
    throw new Error("Permintaan pengadaan memerlukan minimal satu item.");
  }
  for (const item of items) {
    if (Number(item.quantity) <= 0) {
      throw new Error("Kuantitas item pengadaan harus lebih dari nol.");
    }
  }
}
