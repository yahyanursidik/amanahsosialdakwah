import type { AccessControlProvider } from "@refinedev/core";
import { Refine } from "@refinedev/core";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { CanAccess } from "@/components/access-control/can-access";
import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import { ProtectedRoute } from "@/components/access-control/protected-route";
import type { ActiveOrganization } from "@/features/organizations/organization-access";
import type { OrganizationContextValue } from "@/features/organizations/organization-context";
import { OrganizationContext } from "@/features/organizations/organization-context";

function organization(id: string): ActiveOrganization {
  return {
    $collectionId: "organizations",
    $createdAt: "2026-01-01T00:00:00.000Z",
    $databaseId: "neon",
    $id: id,
    $permissions: [],
    $updatedAt: "2026-01-01T00:00:00.000Z",
    code: id,
    name: `Organisasi ${id}`,
    status: "active",
    type: "manager",
  };
}

function organizationContext(
  organizationId = "organization-a",
): OrganizationContextValue {
  return {
    activeOrganization: {
      membershipId: `membership-${organizationId}`,
      organization: organization(organizationId),
    },
    error: null,
    organizations: [],
    refresh: vi.fn(async () => undefined),
    status: "ready",
    switchOrganization: vi.fn(async () => undefined),
    user: {
      $id: "user-a",
      authUserId: "auth-user-a",
      email: "user@example.test",
      id: "user-a",
      name: "User A",
    },
  };
}

function renderWithAccess(
  children: React.ReactNode,
  accessControlProvider: AccessControlProvider,
  organizationValue: OrganizationContextValue = organizationContext(),
) {
  return render(
    <Refine accessControlProvider={accessControlProvider} resources={[]}>
      <OrganizationContext.Provider value={organizationValue}>
        {children}
      </OrganizationContext.Provider>
    </Refine>,
  );
}

describe("access control UI", () => {
  it("pengguna tanpa permission tidak melihat tombol", async () => {
    renderWithAccess(
      <ProtectedActionButton action="manage" resource="memberships">
        Tambah membership
      </ProtectedActionButton>,
      {
        can: vi.fn(async () => ({
          can: false,
          reason: "Permission memberships.manage belum diberikan.",
        })),
      },
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Tambah membership" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("menyembunyikan command konversi kasus tanpa permission", async () => {
    const can = vi.fn(async ({ action, resource }) => ({
      can: resource === "applications" && action === "read",
      reason: "Permission applications.convert belum diberikan.",
    }));

    renderWithAccess(
      <ProtectedActionButton action="convert" resource="applications">
        Jadikan Kasus
      </ProtectedActionButton>,
      { can },
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Jadikan Kasus" }),
      ).not.toBeInTheDocument(),
    );
    expect(can).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "convert",
        resource: "applications",
      }),
    );
  });

  it("menyembunyikan keputusan review asesmen tanpa permission", async () => {
    const can = vi.fn(async () => ({
      can: false,
      reason: "Permission assessments.review belum diberikan.",
    }));

    renderWithAccess(
      <ProtectedActionButton action="review" resource="assessments">
        Simpan Keputusan
      </ProtectedActionButton>,
      { can },
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Simpan Keputusan" }),
      ).not.toBeInTheDocument(),
    );
    expect(can).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "review",
        resource: "assessments",
      }),
    );
  });

  it("route ditolak ketika permission tidak tersedia", async () => {
    renderWithAccess(
      <MemoryRouter initialEntries={["/memberships"]}>
        <Routes>
          <Route
            element={<ProtectedRoute action="read" resource="memberships" />}
          >
            <Route path="/memberships" element={<p>Membership terbuka</p>} />
          </Route>
          <Route path="/unauthorized" element={<p>Akses ditolak</p>} />
        </Routes>
      </MemoryRouter>,
      {
        can: vi.fn(async () => ({
          can: false,
          reason: "Permission memberships.read belum diberikan.",
        })),
      },
    );

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.queryByText("Membership terbuka")).not.toBeInTheDocument();
  });

  it("pengguna dengan permission dapat mengakses route", async () => {
    renderWithAccess(
      <MemoryRouter initialEntries={["/memberships"]}>
        <Routes>
          <Route
            element={<ProtectedRoute action="read" resource="memberships" />}
          >
            <Route path="/memberships" element={<p>Membership terbuka</p>} />
          </Route>
          <Route path="/unauthorized" element={<p>Akses ditolak</p>} />
        </Routes>
      </MemoryRouter>,
      {
        can: vi.fn(async () => ({ can: true })),
      },
    );

    expect(await screen.findByText("Membership terbuka")).toBeInTheDocument();
  });

  it("pergantian organisasi memperbarui permission", async () => {
    const provider: AccessControlProvider = {
      can: vi.fn(async ({ params }) => ({
        can: params?.organizationId === "organization-b",
      })),
    };
    const { rerender } = render(
      <Refine accessControlProvider={provider} resources={[]}>
        <OrganizationContext.Provider
          value={organizationContext("organization-a")}
        >
          <CanAccess action="read" denied={<p>Ditolak</p>} resource="roles">
            <p>Role terbuka</p>
          </CanAccess>
        </OrganizationContext.Provider>
      </Refine>,
    );

    expect(await screen.findByText("Ditolak")).toBeInTheDocument();

    rerender(
      <Refine accessControlProvider={provider} resources={[]}>
        <OrganizationContext.Provider
          value={organizationContext("organization-b")}
        >
          <CanAccess action="read" denied={<p>Ditolak</p>} resource="roles">
            <p>Role terbuka</p>
          </CanAccess>
        </OrganizationContext.Provider>
      </Refine>,
    );

    expect(await screen.findByText("Role terbuka")).toBeInTheDocument();
  });
});
