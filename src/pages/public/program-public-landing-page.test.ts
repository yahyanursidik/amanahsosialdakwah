import { describe, expect, it } from "vitest";

import { percentageOf } from "./program-public-landing-page";

describe("public program landing progress", () => {
  it("menghitung progres agregat tanpa melewati batas 0–100%", () => {
    expect(percentageOf(3, 8)).toBe(38);
    expect(percentageOf(12, 8)).toBe(100);
    expect(percentageOf(-1, 8)).toBe(0);
  });

  it("menampilkan 0% saat pembanding agregat belum tersedia", () => {
    expect(percentageOf(0, 0)).toBe(0);
    expect(percentageOf(5, 0)).toBe(0);
  });
});
