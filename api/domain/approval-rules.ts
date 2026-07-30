export type ApprovalRequestStatus =
  | "approved"
  | "cancelled"
  | "draft"
  | "in_progress"
  | "rejected"
  | "revision_requested";

export type ApprovalDecision = "approved" | "rejected" | "revision_requested";

export type ApprovalStepDefinition = {
  minimumApprovals: number;
  position: number;
  requiredPermission: string;
};

export function assertValidApprovalSteps(
  steps: ApprovalStepDefinition[],
): void {
  if (steps.length === 0) {
    throw new Error("Workflow approval memerlukan minimal satu langkah.");
  }

  const sortedPositions = steps
    .map((step) => step.position)
    .sort((left, right) => left - right);

  for (const [index, step] of steps.entries()) {
    if (step.minimumApprovals < 1) {
      throw new Error("Jumlah persetujuan minimum harus lebih dari nol.");
    }
    if (!step.requiredPermission.includes(".")) {
      throw new Error("Permission langkah approval tidak valid.");
    }
    if (sortedPositions[index] !== index + 1) {
      throw new Error(
        "Posisi langkah approval harus berurutan mulai dari satu.",
      );
    }
  }
}

export function assertIndependentApprover(
  requesterProfileId: string,
  actorProfileId: string,
): void {
  if (requesterProfileId === actorProfileId) {
    throw new Error(
      "Pembuat permintaan tidak boleh menyetujui permintaannya sendiri.",
    );
  }
}

export function canSubmitApprovalRequest(
  status: ApprovalRequestStatus,
): boolean {
  return status === "draft" || status === "revision_requested";
}

export function canCancelApprovalRequest(
  status: ApprovalRequestStatus,
): boolean {
  return (
    status === "draft" ||
    status === "in_progress" ||
    status === "revision_requested"
  );
}

export function canActOnApprovalRequest(
  status: ApprovalRequestStatus,
): boolean {
  return status === "in_progress";
}

export function resolveApprovalProgress(input: {
  approvalCount: number;
  decision: ApprovalDecision;
  hasNextStep: boolean;
  minimumApprovals: number;
}): {
  requestStatus: ApprovalRequestStatus;
  stepCompleted: boolean;
} {
  if (input.decision === "rejected") {
    return { requestStatus: "rejected", stepCompleted: true };
  }
  if (input.decision === "revision_requested") {
    return { requestStatus: "revision_requested", stepCompleted: true };
  }

  const stepCompleted = input.approvalCount >= input.minimumApprovals;
  return {
    requestStatus:
      stepCompleted && !input.hasNextStep ? "approved" : "in_progress",
    stepCompleted,
  };
}
