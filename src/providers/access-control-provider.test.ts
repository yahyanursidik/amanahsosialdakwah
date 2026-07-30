import { beforeEach, describe, expect, it, vi } from "vitest";

import { setCurrentAccessContext } from "@/features/access-control/access-context";

import {
  createAccessControlProvider,
  type AccessDecisionRepository,
} from "./access-control-provider";

describe("accessControlProvider", () => {
  beforeEach(() => {
    setCurrentAccessContext(null);
  });

  it("fail closed ketika konteks organisasi belum tersedia", async () => {
    const repository: AccessDecisionRepository = {
      can: vi.fn(async () => ({ can: true })),
    };
    const provider = createAccessControlProvider(repository);

    await expect(
      provider.can({ action: "read", resource: "programs" }),
    ).resolves.toEqual({
      can: false,
      reason: "Konteks organisasi aktif belum tersedia.",
    });
    expect(repository.can).not.toHaveBeenCalled();
  });

  it("meneruskan resource, action, dan konteks tenant ke pemeriksaan server", async () => {
    const repository: AccessDecisionRepository = {
      can: vi.fn(async () => ({ can: true })),
    };
    const provider = createAccessControlProvider(repository);
    setCurrentAccessContext({
      membershipId: "membership-a",
      organizationId: "organization-a",
      userId: "profile-a",
    });

    await expect(
      provider.can({ action: "manage", resource: "programs" }),
    ).resolves.toEqual({ can: true });
    expect(repository.can).toHaveBeenCalledWith({
      action: "manage",
      context: {
        membershipId: "membership-a",
        organizationId: "organization-a",
        userId: "profile-a",
      },
      resource: "programs",
    });
  });
});
