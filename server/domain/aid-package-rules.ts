export type AidPackagePackingStatus =
  "cancelled" | "draft" | "packed" | "reversed";

const packingTransitions: Record<
  AidPackagePackingStatus,
  AidPackagePackingStatus[]
> = {
  cancelled: [],
  draft: ["cancelled", "packed"],
  packed: ["reversed"],
  reversed: [],
};

export function assertAidPackagePackingTransition(
  current: AidPackagePackingStatus,
  target: AidPackagePackingStatus,
): void {
  if (!packingTransitions[current].includes(target)) {
    throw new Error(
      `Transisi packing paket ${current} ke ${target} tidak valid.`,
    );
  }
}

export function assertSubstitutionAllowed(input: {
  allowSubstitution: boolean;
  actualProductId: string;
  reason?: string;
  requestedProductId: string;
}): void {
  const substituted = input.actualProductId !== input.requestedProductId;
  if (!substituted) return;
  if (!input.allowSubstitution) {
    throw new Error("Komponen paket ini tidak mengizinkan substitusi.");
  }
  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error("Alasan substitusi minimal 10 karakter.");
  }
}

export function assertPositivePackageCount(count: number): void {
  if (!Number.isInteger(count) || count <= 0 || count > 100_000) {
    throw new Error("Jumlah paket harus bilangan bulat antara 1 dan 100000.");
  }
}
