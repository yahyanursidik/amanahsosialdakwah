import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { OrganizationProvider } from "./organization-provider";
import { useOrganization } from "./organization-context";
import type { OrganizationAccessRepository } from "./organization-access";

function Probe() {
  const navigate = useNavigate();
  const organization = useOrganization();

  return (
    <>
      <span>{organization.status}</span>
      <button onClick={() => navigate("/programs")} type="button">
        Pindah route
      </button>
    </>
  );
}

describe("OrganizationProvider", () => {
  it("tidak memuat ulang konteks organisasi pada setiap perubahan route", async () => {
    const user = userEvent.setup();
    const repository: OrganizationAccessRepository = {
      getAccess: vi.fn(async () => ({
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
              name: "Organisasi A",
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
      })),
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
});
