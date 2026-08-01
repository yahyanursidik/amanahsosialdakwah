import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./login-page";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginResult: {
    error: new Error("Email atau kata sandi tidak cocok."),
    success: false,
  } as { error?: Error; redirectTo?: string; success: boolean },
  refreshOrganization: vi.fn(async () => undefined),
}));

vi.mock("@refinedev/core", () => ({
  useLogin: (options: {
    mutationOptions: {
      onSuccess: (result: {
        error?: Error;
        redirectTo?: string;
        success: boolean;
      }) => void;
    };
  }) => ({
    error: null,
    isPending: false,
    mutate: (credentials: unknown) => {
      mocks.login(credentials);
      void options.mutationOptions.onSuccess(mocks.loginResult);
    },
  }),
}));

vi.mock("@/features/organizations/organization-context", () => ({
  useOptionalOrganization: () => ({ refresh: mocks.refreshOrganization }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mocks.login.mockClear();
    mocks.refreshOrganization.mockClear();
    mocks.loginResult = {
      error: new Error("Email atau kata sandi tidak cocok."),
      success: false,
    };
  });

  it("mempertahankan pesan penolakan dari auth provider", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Alamat email" }),
      "owner@example.org",
    );
    await user.type(screen.getByLabelText("Kata sandi"), "password-ku");
    await user.click(screen.getByRole("button", { name: "Masuk dengan aman" }));

    expect(mocks.login).toHaveBeenCalledWith({
      email: "owner@example.org",
      password: "password-ku",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Email atau kata sandi tidak cocok.",
    );
    expect(mocks.refreshOrganization).not.toHaveBeenCalled();
  });

  it("memuat ulang organisasi sebelum menuju workspace", async () => {
    const user = userEvent.setup();
    mocks.loginResult = { redirectTo: "/", success: true };
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<span>Workspace siap</span>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Alamat email" }),
      "owner@example.org",
    );
    await user.type(screen.getByLabelText("Kata sandi"), "password-ku");
    await user.click(screen.getByRole("button", { name: "Masuk dengan aman" }));

    expect(await screen.findByText("Workspace siap")).toBeInTheDocument();
    expect(mocks.refreshOrganization).toHaveBeenCalledTimes(1);
  });
});
