import type { AuthProvider } from "@refinedev/core";
import { Refine } from "@refinedev/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { LoginPage } from "@/pages/login/login-page";
import { NotFoundPage } from "@/pages/not-found/not-found-page";
import { UnauthorizedPage } from "@/pages/unauthorized/unauthorized-page";

const testAuthProvider: AuthProvider = {
  login: vi.fn(async () => ({ success: true })),
  logout: vi.fn(async () => ({ success: true })),
  check: vi.fn(async () => ({ authenticated: false })),
  onError: vi.fn(async () => ({})),
  getPermissions: vi.fn(async () => null),
  getIdentity: vi.fn(async () => null),
};

describe("halaman sistem", () => {
  it("menampilkan form login dengan label yang dapat diakses", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Refine authProvider={testAuthProvider}>
          <LoginPage />
        </Refine>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Masuk ke ruang kerja" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Alamat email")).toBeInTheDocument();
    expect(screen.getByLabelText("Kata sandi")).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: "Amanah Platform" }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Yahya Nursidik" }),
    ).toHaveAttribute("href", "https://yahyanursidik.my.id/");

    await user.click(
      screen.getByRole("button", { name: "Masuk dengan aman" }),
    );

    expect(
      await screen.findByText("Alamat email wajib diisi."),
    ).toBeInTheDocument();
    expect(screen.getByText("Kata sandi wajib diisi.")).toBeInTheDocument();
  });

  it("menjelaskan pembatasan akses pada halaman unauthorized", () => {
    render(
      <MemoryRouter>
        <Refine authProvider={testAuthProvider}>
          <UnauthorizedPage />
        </Refine>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Akses untuk halaman ini dibatasi.",
      }),
    ).toBeInTheDocument();
  });

  it("memberikan jalan kembali dari halaman yang tidak ditemukan", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Halaman yang dicari tidak ditemukan.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kembali ke ruang kerja" }),
    ).toHaveAttribute("href", "/");
  });
});
