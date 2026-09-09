import { describe, expect, it } from "vitest";

import type {
  CrmContactsDocument,
  CrmInstitutionProfilesDocument,
} from "@/generated/neon/models";

import { partnerPartyType, partnerRoleLabel } from "./partner-contact";

function contact(
  contactType: CrmContactsDocument["contact_type"],
): CrmContactsDocument {
  return {
    $collectionId: "crm_contacts",
    $createdAt: "2026-09-06T00:00:00.000Z",
    $databaseId: "amanah-local",
    $id: "contact-1",
    $permissions: [],
    $updatedAt: "2026-09-06T00:00:00.000Z",
    contact_type: contactType,
    display_name: "Kontak contoh",
    normalized_name: "kontak contoh",
    organization_id: "organization-1",
    status: "active",
  };
}

function institutionProfile(
  type: CrmInstitutionProfilesDocument["institution_type"],
): CrmInstitutionProfilesDocument {
  return {
    $collectionId: "crm_institution_profiles",
    $createdAt: "2026-09-06T00:00:00.000Z",
    $databaseId: "amanah-local",
    $id: "institution-1",
    $permissions: [],
    $updatedAt: "2026-09-06T00:00:00.000Z",
    contact_id: "contact-1",
    institution_type: type,
    organization_id: "organization-1",
    status: "unverified",
  };
}

describe("partner contact rules", () => {
  it("membedakan individu, komunitas, dan lembaga tanpa kontak duplikat", () => {
    expect(partnerPartyType(contact("person"))).toBe("individual");
    expect(
      partnerPartyType(contact("institution"), institutionProfile("community")),
    ).toBe("community");
    expect(
      partnerPartyType(
        contact("institution"),
        institutionProfile("foundation"),
      ),
    ).toBe("institution");
  });

  it("menampilkan label peran mitra yang konsisten", () => {
    expect(partnerRoleLabel("distribution_partner")).toBe("Mitra penyaluran");
    expect(partnerRoleLabel("applicant")).toBe("Pengaju");
  });
});
