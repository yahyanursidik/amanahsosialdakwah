export type LogisticsShipmentStatus =
  | "cancelled"
  | "delivered"
  | "dispatched"
  | "draft"
  | "in_transit"
  | "returned"
  | "returning"
  | "return_requested";

const transitions: Record<LogisticsShipmentStatus, LogisticsShipmentStatus[]> =
  {
    cancelled: [],
    delivered: ["return_requested"],
    dispatched: ["delivered", "in_transit", "return_requested"],
    draft: ["cancelled", "dispatched"],
    in_transit: ["delivered", "return_requested"],
    returned: [],
    returning: ["returned"],
    return_requested: ["returned", "returning"],
  };

export function assertLogisticsShipmentTransition(
  current: LogisticsShipmentStatus,
  target: LogisticsShipmentStatus,
): void {
  if (!transitions[current].includes(target)) {
    throw new Error(`Transisi shipment ${current} ke ${target} tidak valid.`);
  }
}

export function nextStatusForTrackingEvent(
  current: LogisticsShipmentStatus,
  eventType: string,
): LogisticsShipmentStatus {
  if (
    ["picked_up", "in_transit", "arrived_hub", "out_for_delivery"].includes(
      eventType,
    )
  ) {
    if (current === "dispatched") return "in_transit";
    if (current === "in_transit") return current;
  }
  if (eventType === "return_in_transit" && current === "return_requested") {
    return "returning";
  }
  if (eventType === "note" || eventType === "delivery_attempt") return current;
  throw new Error(
    `Event tracking ${eventType} tidak sesuai status ${current}.`,
  );
}

export function assertIndependentIncidentResolution(input: {
  reportedBy: string;
  resolvedBy: string;
}): void {
  if (input.reportedBy === input.resolvedBy) {
    throw new Error(
      "Pelapor insiden tidak boleh menyelesaikan insidennya sendiri.",
    );
  }
}
