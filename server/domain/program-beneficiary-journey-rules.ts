export type ProgramBeneficiaryJourneyAccess = {
  canReadApplications: boolean;
  canReadApprovals: boolean;
  canReadAssessments: boolean;
  canReadCases: boolean;
  canReadContacts: boolean;
  canReadDistributions: boolean;
};

export function resolveProgramBeneficiaryJourneyAccess(
  permissions: ReadonlySet<string>,
): ProgramBeneficiaryJourneyAccess {
  return {
    canReadApplications: permissions.has("applications.read"),
    canReadApprovals: permissions.has("approval_requests.read"),
    canReadAssessments: permissions.has("assessments.read"),
    canReadCases: permissions.has("cases.read"),
    canReadContacts: permissions.has("crm_contacts.read"),
    canReadDistributions: permissions.has("distributions.read"),
  };
}

export function canReadProgramBeneficiaryList(
  access: ProgramBeneficiaryJourneyAccess,
): boolean {
  return (
    access.canReadApplications && access.canReadCases && access.canReadContacts
  );
}
