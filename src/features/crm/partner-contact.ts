import type {
  CrmContactRolesDocument,
  CrmContactsDocument,
  CrmInstitutionProfilesDocument,
} from "@/generated/neon/models";

export const partnerRoleTypes = [
  "distribution_partner",
  "applicant",
] as const satisfies readonly CrmContactRolesDocument["role_type"][];

export type PartnerRoleType = (typeof partnerRoleTypes)[number];
export type PartnerPartyType = "individual" | "community" | "institution";

export function isPartnerRole(
  role: CrmContactRolesDocument,
): role is CrmContactRolesDocument & { role_type: PartnerRoleType } {
  return (partnerRoleTypes as readonly string[]).includes(role.role_type);
}

export function partnerPartyType(
  contact: CrmContactsDocument,
  institutionProfile?: CrmInstitutionProfilesDocument,
): PartnerPartyType {
  if (contact.contact_type === "person") {
    return "individual";
  }

  return institutionProfile?.institution_type === "community"
    ? "community"
    : "institution";
}

export function partnerPartyLabel(type: PartnerPartyType) {
  const labels: Record<PartnerPartyType, string> = {
    community: "Komunitas",
    individual: "Individu",
    institution: "Lembaga",
  };

  return labels[type];
}

export function partnerRoleLabel(role: PartnerRoleType) {
  const labels: Record<PartnerRoleType, string> = {
    applicant: "Pengaju",
    distribution_partner: "Mitra penyaluran",
  };

  return labels[role];
}
