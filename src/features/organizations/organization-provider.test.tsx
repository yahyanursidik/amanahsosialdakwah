import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { OrganizationProvider } from "./organization-provider";
import { useOrganization } from "./organization-context";
import type { OrganizationAccessRepository } from "./organization-access";

function organizationResponse(name = "Organisasi A") {
  return {
    organizations: [
      {
        membershipId: "membership-a",
        organization: {
          $collectionId: "organizations",
          $createdAt: "2026-01-01T00:00:00.000Z",
          $databaseId: "neon",
          $id: "organization-a",
          $permissions: [],
          $updatedAt: "2026-01-01T00:00:00.000Z",
          code: "organization-a",
          name,
          status: "active" as const,
          type: "manager",
        },
      },
    ],
    user: {
      $id: "profile-a",
      authUserId: "auth-user-a",
      email: "owner@example.test",
      id: "profile-a",
      name: "Owner",
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

function Probe() {
  const navigate = useNavigate();
  const organization = useOrganization();

  return (
    <>
      <span>{organization.status}</span>
      <button onClick={() => navigate("/programs")} type="button">
        Pindah route
      </button>
      <button onClick={() => void organization.refresh()} type="button">
        Validasi ulang
      </button>
    </>
  );
}

describe("OrganizationProvider", () => {
  it("tidak memuat ulang konteks organisasi pada setiap perubahan route", async () => {
    const user = userEvent.setup();
    const repository: OrganizationAccessRepository = {
      getAccess: vi.fn(async () => organizationResponse()),
    };

    render(
      <MemoryRouter>
        <OrganizationProvider repository={repository}>
          <Probe />
        </OrganizationProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(repository.getAccess).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Pindah route" }));

    await waitFor(() => expect(repository.getAccess).toHaveBeenCalledTimes(1));
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("menjaga dashboard tetap siap selama revalidasi membership berjalan", async () => {
    const user = userEvent.setup();
    const refresh = deferred<Awaited<ReturnType<OrganizationAccessRepository["getAccess"]>>>();
    const repository: OrganizationAccessRepository = {
      getAccess: vi
        .fn()
        .mockResolvedValueOnce(organizationResponse())
        .mockReturnValueOnce(refresh.promise),
    };

    render(
      <MemoryRouter>
        <OrganizationProvider repository={repository}>
          <Probe />
        </OrganizationProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("ready")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Validasi ulang" }));

    expect(repository.getAccess).toHaveBeenCalledTimes(2);
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.queryByText("loading")).not.toBeInTheDocument();

    refresh.resolve(organizationResponse("Organisasi A Terverifikasi"));

    expect(await screen.findByText("ready")).toBeInTheDocument();
  });
});
