import { describe, expect, it } from "vitest";

import type { CrmContactsDocument } from "@/generated/neon/models";

import {
  canAutoMergeContacts,
  findDuplicateCandidates,
  normalizePhone,
} from "./contact-rules";

function contact(overrides: Partial<CrmContactsDocument>): CrmContactsDocument {
  return {
    $collectionId: "crm_contacts",
    $createdAt: "2026-01-01T00:00:00.000Z",
    $databaseId: "amanah-local",
    $id: "contact-a",
    $permissions: [],
    $updatedAt: "2026-01-01T00:00:00.000Z",
    contact_type: "person",
    display_name: "Ahmad Abdullah",
    normalized_name: "ahmad abdullah",
    organization_id: "organization-a",
    status: "active",
    ...overrides,
  };
}

describe("CRM contact rules", () => {
  it("menormalkan nomor Indonesia untuk pencarian duplikasi", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890");
  });

  it("memberi warning kemungkinan duplikasi tanpa merge otomatis", () => {
    const candidates = findDuplicateCandidates(
      {
        city: "Bandung",
        display_name: "Ahmad Abdullah",
        normalized_email: "",
        normalized_name: "ahmad abdullah",
        normalized_phone: "081234567890",
        primary_email: "",
        primary_phone: "081234567890",
      },
      [
        contact({
          $id: "contact-existing",
          city: "Bandung",
          normalized_phone: "081234567890",
        }),
      ],
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.reasons).toContain("Nomor telepon sama");
    expect(canAutoMergeContacts()).toBe(false);
  });
});
