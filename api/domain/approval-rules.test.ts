import { describe, expect, it } from "vitest";

import {
  assertIndependentApprover,
  assertValidApprovalSteps,
  canActOnApprovalRequest,
  canCancelApprovalRequest,
  canSubmitApprovalRequest,
  resolveApprovalProgress,
} from "./approval-rules";

describe("approval rules", () => {
  it("requires sequential workflow steps", () => {
    expect(() =>
      assertValidApprovalSteps([
        {
          minimumApprovals: 1,
          position: 2,
          requiredPermission: "approval_requests.act",
        },
      ]),
    ).toThrow(/berurutan/);
  });

  it("prevents maker from approving the same request", () => {
    expect(() => assertIndependentApprover("profile-1", "profile-1")).toThrow(
      /Pembuat permintaan/,
    );
  });

  it("only permits commands from eligible states", () => {
    expect(canSubmitApprovalRequest("draft")).toBe(true);
    expect(canSubmitApprovalRequest("approved")).toBe(false);
    expect(canActOnApprovalRequest("in_progress")).toBe(true);
    expect(canActOnApprovalRequest("revision_requested")).toBe(false);
    expect(canCancelApprovalRequest("approved")).toBe(false);
  });

  it("advances after the configured approval quorum", () => {
    expect(
      resolveApprovalProgress({
        approvalCount: 1,
        decision: "approved",
        hasNextStep: true,
        minimumApprovals: 2,
      }),
    ).toEqual({ requestStatus: "in_progress", stepCompleted: false });

    expect(
      resolveApprovalProgress({
        approvalCount: 2,
        decision: "approved",
        hasNextStep: false,
        minimumApprovals: 2,
      }),
    ).toEqual({ requestStatus: "approved", stepCompleted: true });
  });
});
