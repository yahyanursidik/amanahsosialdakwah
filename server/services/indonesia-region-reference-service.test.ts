import { describe, expect, it } from "vitest";

import { readReferenceLocations } from "./indonesia-region-reference-service";

describe("Indonesia region reference", () => {
  it("membaca kota/kabupaten dan provinsinya dari referensi nasional", () => {
    expect(
      readReferenceLocations({
        data: [
          {
            name_local: "Kabupaten Ciamis",
            parent_name_local: "Jawa Barat",
          },
        ],
      }),
    ).toEqual([{ city: "Kabupaten Ciamis", province: "Jawa Barat" }]);
  });

  it("mengabaikan record referensi yang tidak memiliki provinsi", () => {
    expect(
      readReferenceLocations({
        data: [{ name_local: "Kabupaten Ciamis" }],
      }),
    ).toEqual([]);
  });
});
