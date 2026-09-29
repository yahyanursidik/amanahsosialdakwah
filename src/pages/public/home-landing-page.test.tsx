import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeLandingPage } from "./home-landing-page";

const overview = {
  data: {
    programs: [
      {
        beneficiaries_reached: 3,
        budget_amount: "150000000.00",
        category_name: "Pangan",
        distributed_amount: "15000000.00",
        ends_at: null,
        fund_types: ["sedekah"],
        id: "20000000-0000-4000-8000-000000000001",
        name: "Paket Pangan Keluarga Rentan",
        organization_name: "Ihsanul Adab",
        starts_at: null,
        summary: "Distribusi paket pangan bulanan.",
        support_modes: ["cash", "in_kind"],
        target_beneficiary_count: 150,
      },
    ],
    stats: {
      active_programs: 2,
      beneficiaries_reached: 5,
      distributed_amount: "11000000.00",
      organizations: 2,
      packages_delivered: 1,
      waqf_assets: 2,
    },
  },
};

function renderPage(signedIn = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomeLandingPage signedIn={signedIn} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomeLandingPage", () => {
  it("menampilkan capaian dan program dari ringkasan publik", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(overview), { status: 200 })));
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Setiap amanah punya perjalanan yang jelas." })).toBeInTheDocument();
    expect(await screen.findByText("Paket Pangan Keluarga Rentan")).toBeInTheDocument();
    const reached = screen
      .getAllByRole("listitem")
      .find((item) => item.textContent?.includes("Penerima terjangkau"));
    expect(reached).toHaveTextContent("5");
    const programLinks = screen
      .getAllByRole("link", { name: /Lihat program/ })
      .map((link) => link.getAttribute("href"));
    expect(programLinks).toContain("/p/20000000-0000-4000-8000-000000000001");
    expect(screen.getAllByRole("link", { name: /Masuk ke ruang kerja/ })[0]).toHaveAttribute("href", "/login");
  });

  it("mengarahkan pengguna yang sudah masuk ke ruang kerja", () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(overview), { status: 200 })));
    renderPage(true);
    expect(screen.getAllByRole("link", { name: /Buka ruang kerja/ })[0]).toHaveAttribute("href", "/");
  });

  it("tetap tampil bila ringkasan gagal dimuat", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    renderPage();
    expect(
      await screen.findByText("Angka capaian sedang tidak dapat dimuat.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Belum ada program aktif yang ditampilkan.")).toBeInTheDocument();
  });
});
