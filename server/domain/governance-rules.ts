export type GovernanceSeverity = "low" | "medium" | "high" | "critical";
export type GovernanceEntityType =
  | "complaint"
  | "corrective_action"
  | "incident"
  | "risk_flag";

const transitions: Record<GovernanceEntityType, Record<string, string[]>> = {
  complaint: {
    in_progress: ["resolved"],
    received: ["rejected", "triaged"],
    resolved: ["closed"],
    triaged: ["in_progress", "rejected", "resolved"],
  },
  corrective_action: {
    completed: ["verified"],
    in_progress: ["cancelled", "completed"],
    open: ["cancelled", "completed", "in_progress"],
  },
  incident: {
    contained: ["resolved"],
    investigating: ["contained", "resolved"],
    reported: ["contained", "investigating", "resolved"],
    resolved: ["closed"],
  },
  risk_flag: {
    accepted: ["closed"],
    mitigated: ["closed"],
    monitoring: ["accepted", "closed", "mitigated"],
    open: ["accepted", "closed", "mitigated", "monitoring"],
  },
};

export function allowedGovernanceTransitions(
  entityType: GovernanceEntityType,
  currentStatus: string,
): string[] {
  return transitions[entityType][currentStatus] ?? [];
}

export function assertGovernanceTransition(
  entityType: GovernanceEntityType,
  currentStatus: string,
  targetStatus: string,
): void {
  if (!allowedGovernanceTransitions(entityType, currentStatus).includes(targetStatus)) {
    throw new Error(`Transisi ${currentStatus} ke ${targetStatus} tidak valid.`);
  }
}

const slaHours: Record<
  GovernanceSeverity,
  { resolution: number; response: number }
> = {
  critical: { resolution: 24, response: 4 },
  high: { resolution: 72, response: 8 },
  medium: { resolution: 168, response: 24 },
  low: { resolution: 720, response: 72 },
};

export function calculateGovernanceSla(
  severity: GovernanceSeverity,
  occurredAt: string,
) {
  const start = new Date(occurredAt);
  const policy = slaHours[severity];
  return {
    resolutionDueAt: new Date(
      start.getTime() + policy.resolution * 60 * 60 * 1000,
    ).toISOString(),
    responseDueAt: new Date(
      start.getTime() + policy.response * 60 * 60 * 1000,
    ).toISOString(),
  };
}

export function assertIndependentClosure(
  creatorProfileId: string,
  actorProfileId: string,
): void {
  if (creatorProfileId === actorProfileId) {
    throw new Error("Pelapor tidak boleh menyelesaikan laporannya sendiri.");
  }
}

export function assertIndependentVerification(
  completedBy: string,
  verifiedBy: string,
): void {
  if (completedBy === verifiedBy) {
    throw new Error(
      "Pelaksana corrective action tidak boleh memverifikasi pekerjaannya sendiri.",
    );
  }
}
