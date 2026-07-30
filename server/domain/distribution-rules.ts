export type DistributionStatus =
  | "assigned"
  | "cancelled"
  | "completed"
  | "confirmed"
  | "draft"
  | "executed"
  | "in_progress"
  | "ready"
  | "revision_required"
  | "verified";

const transitions: Record<DistributionStatus, DistributionStatus[]> = {
  assigned: ["assigned", "cancelled", "in_progress"],
  cancelled: [],
  completed: [],
  confirmed: ["revision_required", "verified"],
  draft: ["cancelled", "ready"],
  executed: ["confirmed", "revision_required", "verified"],
  in_progress: ["executed", "revision_required"],
  ready: ["assigned", "cancelled"],
  revision_required: ["in_progress"],
  verified: ["completed"],
};

export function assertDistributionTransition(
  current: DistributionStatus,
  target: DistributionStatus,
): void {
  if (!transitions[current].includes(target)) {
    throw new Error(`Transisi distribusi ${current} ke ${target} tidak valid.`);
  }
}

export function assertIndependentDistributionVerifier(
  creatorProfileId: string,
  executorProfileId: string,
  verifierProfileId: string,
): void {
  if (
    verifierProfileId === creatorProfileId ||
    verifierProfileId === executorProfileId
  ) {
    throw new Error(
      "Pembuat atau pelaksana distribusi tidak boleh memverifikasi sendiri.",
    );
  }
}

export function assertDistributionCompletion(input: {
  beneficiaryValid: boolean;
  evidenceCount: number;
  executed: boolean;
  hasConfirmation: boolean;
  requiresConfirmation: boolean;
  verified: boolean;
}): void {
  if (!input.beneficiaryValid) {
    throw new Error("Penerima manfaat tidak lagi valid.");
  }
  if (!input.executed) {
    throw new Error("Distribusi belum dilaksanakan.");
  }
  if (input.evidenceCount < 1) {
    throw new Error("Distribusi memerlukan minimal satu bukti.");
  }
  if (input.requiresConfirmation && !input.hasConfirmation) {
    throw new Error("Konfirmasi penerima manfaat belum tersedia.");
  }
  if (!input.verified) {
    throw new Error("Distribusi belum diverifikasi secara independen.");
  }
}
