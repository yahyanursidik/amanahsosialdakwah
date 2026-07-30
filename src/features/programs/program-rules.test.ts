import { describe, expect, it } from "vitest";
import {
  canArchiveProgram,
  canFreeEditProgram,
  canHardDeleteProgram,
  canPerformControlledEdit,
  validateStatusTransition,
} from "./program-service";

describe("Aturan Bisnis Modul Program", () => {
  it("hanya mengizinkan free edit pada program berstatus draft yang belum diarsipkan", () => {
    expect(canFreeEditProgram({ status: "draft", is_archived: false })).toBe(
      true,
    );
    expect(canFreeEditProgram({ status: "active", is_archived: false })).toBe(
      false,
    );
    expect(canFreeEditProgram({ status: "paused", is_archived: false })).toBe(
      false,
    );
    expect(
      canFreeEditProgram({ status: "completed", is_archived: false }),
    ).toBe(false);
    expect(canFreeEditProgram({ status: "draft", is_archived: true })).toBe(
      false,
    );
  });

  it("hanya mengizinkan controlled edit pada program berstatus active", () => {
    expect(
      canPerformControlledEdit({ status: "active", is_archived: false }),
    ).toBe(true);
    expect(
      canPerformControlledEdit({ status: "draft", is_archived: false }),
    ).toBe(false);
    expect(
      canPerformControlledEdit({ status: "active", is_archived: true }),
    ).toBe(false);
  });

  it("selalu melarang hard delete program", () => {
    expect(canHardDeleteProgram({ status: "draft", is_archived: false })).toBe(
      false,
    );
    expect(canHardDeleteProgram({ status: "active", is_archived: false })).toBe(
      false,
    );
    expect(
      canHardDeleteProgram({ status: "archived", is_archived: true }),
    ).toBe(false);
  });

  it("mengizinkan pengarsipan jika program belum diarsipkan", () => {
    expect(canArchiveProgram({ is_archived: false })).toBe(true);
    expect(canArchiveProgram({ is_archived: true })).toBe(false);
  });

  it("memvalidasi transisi status secara ketat", () => {
    expect(validateStatusTransition("draft", "active", false).allowed).toBe(
      true,
    );
    expect(validateStatusTransition("draft", "completed", false).allowed).toBe(
      false,
    );
    expect(validateStatusTransition("active", "paused", false).allowed).toBe(
      true,
    );
    expect(validateStatusTransition("active", "draft", false).allowed).toBe(
      false,
    );
    expect(validateStatusTransition("active", "archived", false).allowed).toBe(
      true,
    );
    expect(validateStatusTransition("active", "active", true).allowed).toBe(
      false,
    );
  });
});
