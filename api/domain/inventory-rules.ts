export type InventoryAdjustmentStatus =
  | "approved"
  | "cancelled"
  | "draft"
  | "posted"
  | "rejected"
  | "submitted";

const adjustmentTransitions: Record<
  InventoryAdjustmentStatus,
  InventoryAdjustmentStatus[]
> = {
  approved: ["posted", "cancelled"],
  cancelled: [],
  draft: ["cancelled", "submitted"],
  posted: [],
  rejected: [],
  submitted: ["approved", "cancelled", "rejected"],
};

export function assertInventoryAdjustmentTransition(
  current: InventoryAdjustmentStatus,
  target: InventoryAdjustmentStatus,
): void {
  if (!adjustmentTransitions[current].includes(target)) {
    throw new Error(
      `Transisi adjustment inventory ${current} ke ${target} tidak valid.`,
    );
  }
}

export function assertPositiveInventoryQuantity(quantity: string): void {
  if (Number(quantity) <= 0) {
    throw new Error("Kuantitas inventory harus lebih dari nol.");
  }
}

export function assertNonZeroAdjustmentDelta(delta: string): void {
  if (Number(delta) === 0) {
    throw new Error("Delta adjustment tidak boleh nol.");
  }
}

export function assertNoNegativeInventoryBalance(nextQuantity: string): void {
  if (Number(nextQuantity) < 0) {
    throw new Error("Stok inventory tidak boleh negatif.");
  }
}

export function assertBatchRequirement(input: {
  batchNumber: string | null | undefined;
  expiresAt: string | null | undefined;
  productTracksBatch: boolean;
  productTracksExpiry: boolean;
}): void {
  if (input.productTracksBatch && !input.batchNumber) {
    throw new Error("Produk batch wajib memiliki nomor batch.");
  }
  if (input.productTracksExpiry && !input.expiresAt) {
    throw new Error("Produk expiry wajib memiliki tanggal kedaluwarsa.");
  }
}
