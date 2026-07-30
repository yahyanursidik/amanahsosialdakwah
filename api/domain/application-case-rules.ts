export type ApplicationStatus =
  | "accepted"
  | "cancelled"
  | "converted"
  | "draft"
  | "in_screening"
  | "rejected"
  | "submitted";

export type ScreeningResult = "pass" | "reject" | "review";

export function applicationStatusAfterScreening(
  currentStatus: ApplicationStatus,
  result: ScreeningResult,
): ApplicationStatus {
  if (currentStatus !== "submitted" && currentStatus !== "in_screening") {
    throw new Error(
      `Pengajuan berstatus ${currentStatus} tidak dapat di-screening.`,
    );
  }

  if (result === "pass") {
    return "accepted";
  }

  if (result === "reject") {
    return "rejected";
  }

  return "in_screening";
}

export function canSubmitApplication(status: ApplicationStatus): boolean {
  return status === "draft";
}

export function canConvertApplication(status: ApplicationStatus): boolean {
  return status === "accepted";
}

export function canAssignCase(status: string): boolean {
  return ["open", "assigned", "assessment"].includes(status);
}
