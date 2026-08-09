export type WaqfAssetStatus =
  | "active"
  | "draft"
  | "retired"
  | "suspended"
  | "under_maintenance";

export function assertWaqfRegistration(input: {
  currentStatus: WaqfAssetStatus;
  hasVerifiedLegalDocument: boolean;
  registeredBy: string;
  createdBy: string;
}): void {
  if (input.currentStatus !== "draft") {
    throw new Error("Hanya aset wakaf berstatus draft yang dapat diregistrasi.");
  }

  if (!input.hasVerifiedLegalDocument) {
    throw new Error(
      "Registrasi wakaf membutuhkan minimal satu dokumen legal terverifikasi.",
    );
  }

  if (input.registeredBy === input.createdBy) {
    throw new Error(
      "Pendaftar wakaf harus berbeda dari pembuat data awal aset.",
    );
  }
}

export function assertIndependentVerification(input: {
  createdBy: string;
  verifiedBy: string;
}): void {
  if (input.createdBy === input.verifiedBy) {
    throw new Error(
      "Verifikator dokumen legal harus berbeda dari pencatat dokumen.",
    );
  }
}

export function assertActiveWaqfAsset(status: WaqfAssetStatus): void {
  if (!["active", "under_maintenance"].includes(status)) {
    throw new Error(
      "Transaksi pemanfaatan, pendapatan, dan manfaat hanya dapat dicatat untuk aset wakaf aktif.",
    );
  }
}

export function assertBenefitDistributionCapacity(input: {
  distributedAmount: number;
  incomeAmount: number;
  requestedAmount: number;
}): void {
  if (input.distributedAmount + input.requestedAmount > input.incomeAmount) {
    throw new Error("Distribusi manfaat tidak boleh melebihi pendapatan wakaf.");
  }
}
