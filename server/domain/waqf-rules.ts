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

export type WaqfProposalStatus =
  | "approved"
  | "cancelled"
  | "converted"
  | "draft"
  | "rejected"
  | "submitted"
  | "under_review";

const proposalTransitions: Record<WaqfProposalStatus, WaqfProposalStatus[]> = {
  approved: ["converted"],
  cancelled: [],
  converted: [],
  draft: ["submitted", "cancelled"],
  rejected: [],
  submitted: ["under_review", "cancelled"],
  under_review: ["approved", "rejected"],
};

export function assertWaqfProposalTransition(
  current: WaqfProposalStatus,
  target: WaqfProposalStatus,
): void {
  if (!proposalTransitions[current]?.includes(target)) {
    throw new Error(
      `Pengajuan wakaf berstatus ${current} tidak dapat diubah menjadi ${target}.`,
    );
  }
}

export function assertIndependentProposalReview(input: {
  createdBy: string;
  reviewedBy: string;
}): void {
  if (input.createdBy === input.reviewedBy) {
    throw new Error(
      "Penilai pengajuan wakaf harus berbeda dari pencatat pengajuan.",
    );
  }
}

export function assertWaqfDuration(input: {
  durationEndDate?: string | null;
  pledgeDate?: string | null;
  waqfDuration: "permanent" | "temporary";
}): void {
  if (input.waqfDuration === "temporary" && !input.durationEndDate) {
    throw new Error("Wakaf berjangka (muaqqat) wajib memiliki tanggal berakhir.");
  }
  if (input.waqfDuration === "permanent" && input.durationEndDate) {
    throw new Error("Wakaf selamanya (muabbad) tidak memiliki tanggal berakhir.");
  }
  if (
    input.durationEndDate &&
    input.pledgeDate &&
    input.durationEndDate <= input.pledgeDate
  ) {
    throw new Error("Tanggal berakhir wakaf harus setelah tanggal ikrar.");
  }
}

/**
 * Wakaf uang menjaga pokok: yang boleh disalurkan hanya hasil pengelolaan.
 * Aset yang sedang menghimpun dana (wakaf melalui uang) menerima setoran
 * meskipun masih draft agar pembangunan/pembelian aset bisa dibiayai.
 */
export type WaqfCollectionScheme =
  | "cash_for_asset"
  | "cash_waqf"
  | "direct_asset"
  | "productive";

export function assertWaqfAcceptsContribution(input: {
  collectionScheme: WaqfCollectionScheme;
  operationalStatus: WaqfAssetStatus;
}): void {
  if (input.operationalStatus === "retired") {
    throw new Error("Aset wakaf yang sudah dihentikan tidak menerima setoran.");
  }
  if (
    input.operationalStatus === "draft" &&
    input.collectionScheme !== "cash_for_asset"
  ) {
    throw new Error(
      "Setoran hanya dapat dicatat pada aset draft berskema wakaf melalui uang (penghimpunan).",
    );
  }
}
