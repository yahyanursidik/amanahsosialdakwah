import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { OrganizationContextValue } from "./organization-context";
import { OrganizationContext } from "./organization-context";
import { OrganizationGuard } from "./organization-guard";

function contextValue(
  overrides: Partial<OrganizationContextValue> = {},
): OrganizationContextValue {
  return {
    activeOrganization: null,
    error: null,
    organizations: [],
    refresh: vi.fn(async () => undefined),
    status: "ready",
    switchOrganization: vi.fn(async () => undefined),
    user: null,
    ...overrides,
  };
}

function renderGuard(value: OrganizationContextValue) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <OrganizationContext.Provider value={value}>
        <Routes>
          <Route element={<OrganizationGuard />}>
            <Route index element={<p>Ruang kerja aktif</p>} />
          </Route>
          <Route path="/unauthorized" element={<p>Akses ditolak</p>} />
        </Routes>
      </OrganizationContext.Provider>
    </MemoryRouter>,
  );
}

describe("OrganizationGuard", () => {
  it("mengalihkan user tanpa membership aktif ke unauthorized", async () => {
    renderGuard(contextValue());

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
  });

  it("membuka protected route setelah organisasi tervalidasi", () => {
    renderGuard(
      contextValue({
        activeOrganization: {
          membershipId: "membership-a",
          organization: {
            $collectionId: "organizations",
            $createdAt: "2026-01-01T00:00:00.000Z",
            $databaseId: "neon",
            $id: "organization-a",
            $permissions: [],
            $updatedAt: "2026-01-01T00:00:00.000Z",
            code: "organisasi-a",
            name: "Organisasi A",
            status: "active",
            type: "manager",
          },
        },
      }),
    );

    expect(screen.getByText("Ruang kerja aktif")).toBeInTheDocument();
  });

  it("fail closed ketika membership tidak dapat divalidasi", () => {
    renderGuard(
      contextValue({
        error: new Error("network"),
        status: "error",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Konteks organisasi belum dapat diverifikasi.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ruang kerja aktif")).not.toBeInTheDocument();
  });
});
