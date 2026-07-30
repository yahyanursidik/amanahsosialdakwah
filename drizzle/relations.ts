import { relations } from "drizzle-orm/relations";
import { profiles, organizationRelationships, organizations, organizationUnits, memberships, roles, rolePermissions, permissions, membershipRoles, programCategories, programs, programRevisions, crmContacts, crmContactRoles, crmSensitiveIdentities, crmBeneficiaryProfiles, crmInstitutionProfiles, crmTags, crmContactTags, crmInteractions, crmConsents, crmDuplicateCandidates, crmMergeRequests } from "./schema";

export const organizationRelationshipsRelations = relations(organizationRelationships, ({one}) => ({
	profile: one(profiles, {
		fields: [organizationRelationships.createdBy],
		references: [profiles.id]
	}),
	organization_sourceOrganizationId: one(organizations, {
		fields: [organizationRelationships.sourceOrganizationId],
		references: [organizations.id],
		relationName: "organizationRelationships_sourceOrganizationId_organizations_id"
	}),
	organization_targetOrganizationId: one(organizations, {
		fields: [organizationRelationships.targetOrganizationId],
		references: [organizations.id],
		relationName: "organizationRelationships_targetOrganizationId_organizations_id"
	}),
}));

export const profilesRelations = relations(profiles, ({many}) => ({
	organizationRelationships: many(organizationRelationships),
	organizations: many(organizations),
	organizationUnits: many(organizationUnits),
	memberships_createdBy: many(memberships, {
		relationName: "memberships_createdBy_profiles_id"
	}),
	memberships_profileId: many(memberships, {
		relationName: "memberships_profileId_profiles_id"
	}),
	roles: many(roles),
	rolePermissions: many(rolePermissions),
	membershipRoles: many(membershipRoles),
	programCategories: many(programCategories),
	programs_archivedBy: many(programs, {
		relationName: "programs_archivedBy_profiles_id"
	}),
	programs_createdBy: many(programs, {
		relationName: "programs_createdBy_profiles_id"
	}),
	programs_ownerId: many(programs, {
		relationName: "programs_ownerId_profiles_id"
	}),
	programRevisions_createdBy: many(programRevisions, {
		relationName: "programRevisions_createdBy_profiles_id"
	}),
	programRevisions_performedBy: many(programRevisions, {
		relationName: "programRevisions_performedBy_profiles_id"
	}),
	crmContacts: many(crmContacts),
	crmContactRoles: many(crmContactRoles),
	crmSensitiveIdentities_createdBy: many(crmSensitiveIdentities, {
		relationName: "crmSensitiveIdentities_createdBy_profiles_id"
	}),
	crmSensitiveIdentities_verifiedBy: many(crmSensitiveIdentities, {
		relationName: "crmSensitiveIdentities_verifiedBy_profiles_id"
	}),
	crmBeneficiaryProfiles: many(crmBeneficiaryProfiles),
	crmInstitutionProfiles: many(crmInstitutionProfiles),
	crmTags: many(crmTags),
	crmContactTags: many(crmContactTags),
	crmInteractions: many(crmInteractions),
	crmConsents: many(crmConsents),
	crmDuplicateCandidates_createdBy: many(crmDuplicateCandidates, {
		relationName: "crmDuplicateCandidates_createdBy_profiles_id"
	}),
	crmDuplicateCandidates_reviewedBy: many(crmDuplicateCandidates, {
		relationName: "crmDuplicateCandidates_reviewedBy_profiles_id"
	}),
	crmMergeRequests_approvedBy: many(crmMergeRequests, {
		relationName: "crmMergeRequests_approvedBy_profiles_id"
	}),
	crmMergeRequests_createdBy: many(crmMergeRequests, {
		relationName: "crmMergeRequests_createdBy_profiles_id"
	}),
	crmMergeRequests_requestedBy: many(crmMergeRequests, {
		relationName: "crmMergeRequests_requestedBy_profiles_id"
	}),
}));

export const organizationsRelations = relations(organizations, ({one, many}) => ({
	organizationRelationships_sourceOrganizationId: many(organizationRelationships, {
		relationName: "organizationRelationships_sourceOrganizationId_organizations_id"
	}),
	organizationRelationships_targetOrganizationId: many(organizationRelationships, {
		relationName: "organizationRelationships_targetOrganizationId_organizations_id"
	}),
	profile: one(profiles, {
		fields: [organizations.createdBy],
		references: [profiles.id]
	}),
	organizationUnits: many(organizationUnits),
	memberships: many(memberships),
	roles: many(roles),
	rolePermissions: many(rolePermissions),
	membershipRoles: many(membershipRoles),
	programCategories: many(programCategories),
	programs: many(programs),
	programRevisions: many(programRevisions),
	crmContacts: many(crmContacts),
	crmContactRoles: many(crmContactRoles),
	crmSensitiveIdentities: many(crmSensitiveIdentities),
	crmBeneficiaryProfiles: many(crmBeneficiaryProfiles),
	crmInstitutionProfiles: many(crmInstitutionProfiles),
	crmTags: many(crmTags),
	crmContactTags: many(crmContactTags),
	crmInteractions: many(crmInteractions),
	crmConsents: many(crmConsents),
	crmDuplicateCandidates: many(crmDuplicateCandidates),
	crmMergeRequests: many(crmMergeRequests),
}));

export const organizationUnitsRelations = relations(organizationUnits, ({one, many}) => ({
	profile: one(profiles, {
		fields: [organizationUnits.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [organizationUnits.organizationId],
		references: [organizations.id]
	}),
	organizationUnit: one(organizationUnits, {
		fields: [organizationUnits.parentId],
		references: [organizationUnits.id],
		relationName: "organizationUnits_parentId_organizationUnits_id"
	}),
	organizationUnits: many(organizationUnits, {
		relationName: "organizationUnits_parentId_organizationUnits_id"
	}),
	memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({one, many}) => ({
	profile_createdBy: one(profiles, {
		fields: [memberships.createdBy],
		references: [profiles.id],
		relationName: "memberships_createdBy_profiles_id"
	}),
	organization: one(organizations, {
		fields: [memberships.organizationId],
		references: [organizations.id]
	}),
	organizationUnit: one(organizationUnits, {
		fields: [memberships.organizationUnitId],
		references: [organizationUnits.id]
	}),
	profile_profileId: one(profiles, {
		fields: [memberships.profileId],
		references: [profiles.id],
		relationName: "memberships_profileId_profiles_id"
	}),
	membershipRoles: many(membershipRoles),
}));

export const rolesRelations = relations(roles, ({one, many}) => ({
	profile: one(profiles, {
		fields: [roles.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [roles.organizationId],
		references: [organizations.id]
	}),
	rolePermissions: many(rolePermissions),
	membershipRoles: many(membershipRoles),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	profile: one(profiles, {
		fields: [rolePermissions.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [rolePermissions.organizationId],
		references: [organizations.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const membershipRolesRelations = relations(membershipRoles, ({one}) => ({
	profile: one(profiles, {
		fields: [membershipRoles.createdBy],
		references: [profiles.id]
	}),
	membership: one(memberships, {
		fields: [membershipRoles.membershipId],
		references: [memberships.id]
	}),
	organization: one(organizations, {
		fields: [membershipRoles.organizationId],
		references: [organizations.id]
	}),
	role: one(roles, {
		fields: [membershipRoles.roleId],
		references: [roles.id]
	}),
}));

export const programCategoriesRelations = relations(programCategories, ({one, many}) => ({
	profile: one(profiles, {
		fields: [programCategories.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [programCategories.organizationId],
		references: [organizations.id]
	}),
	programs: many(programs),
}));

export const programsRelations = relations(programs, ({one, many}) => ({
	profile_archivedBy: one(profiles, {
		fields: [programs.archivedBy],
		references: [profiles.id],
		relationName: "programs_archivedBy_profiles_id"
	}),
	programCategory: one(programCategories, {
		fields: [programs.categoryId],
		references: [programCategories.id]
	}),
	profile_createdBy: one(profiles, {
		fields: [programs.createdBy],
		references: [profiles.id],
		relationName: "programs_createdBy_profiles_id"
	}),
	organization: one(organizations, {
		fields: [programs.organizationId],
		references: [organizations.id]
	}),
	profile_ownerId: one(profiles, {
		fields: [programs.ownerId],
		references: [profiles.id],
		relationName: "programs_ownerId_profiles_id"
	}),
	programRevisions: many(programRevisions),
}));

export const programRevisionsRelations = relations(programRevisions, ({one}) => ({
	profile_createdBy: one(profiles, {
		fields: [programRevisions.createdBy],
		references: [profiles.id],
		relationName: "programRevisions_createdBy_profiles_id"
	}),
	organization: one(organizations, {
		fields: [programRevisions.organizationId],
		references: [organizations.id]
	}),
	profile_performedBy: one(profiles, {
		fields: [programRevisions.performedBy],
		references: [profiles.id],
		relationName: "programRevisions_performedBy_profiles_id"
	}),
	program: one(programs, {
		fields: [programRevisions.programId],
		references: [programs.id]
	}),
}));

export const crmContactsRelations = relations(crmContacts, ({one, many}) => ({
	profile: one(profiles, {
		fields: [crmContacts.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmContacts.organizationId],
		references: [organizations.id]
	}),
	crmContactRoles: many(crmContactRoles),
	crmSensitiveIdentities: many(crmSensitiveIdentities),
	crmBeneficiaryProfiles: many(crmBeneficiaryProfiles),
	crmInstitutionProfiles: many(crmInstitutionProfiles),
	crmContactTags: many(crmContactTags),
	crmInteractions: many(crmInteractions),
	crmConsents: many(crmConsents),
	crmDuplicateCandidates_duplicateContactId: many(crmDuplicateCandidates, {
		relationName: "crmDuplicateCandidates_duplicateContactId_crmContacts_id"
	}),
	crmDuplicateCandidates_primaryContactId: many(crmDuplicateCandidates, {
		relationName: "crmDuplicateCandidates_primaryContactId_crmContacts_id"
	}),
	crmMergeRequests_sourceContactId: many(crmMergeRequests, {
		relationName: "crmMergeRequests_sourceContactId_crmContacts_id"
	}),
	crmMergeRequests_targetContactId: many(crmMergeRequests, {
		relationName: "crmMergeRequests_targetContactId_crmContacts_id"
	}),
}));

export const crmContactRolesRelations = relations(crmContactRoles, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmContactRoles.contactId],
		references: [crmContacts.id]
	}),
	profile: one(profiles, {
		fields: [crmContactRoles.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmContactRoles.organizationId],
		references: [organizations.id]
	}),
}));

export const crmSensitiveIdentitiesRelations = relations(crmSensitiveIdentities, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmSensitiveIdentities.contactId],
		references: [crmContacts.id]
	}),
	profile_createdBy: one(profiles, {
		fields: [crmSensitiveIdentities.createdBy],
		references: [profiles.id],
		relationName: "crmSensitiveIdentities_createdBy_profiles_id"
	}),
	organization: one(organizations, {
		fields: [crmSensitiveIdentities.organizationId],
		references: [organizations.id]
	}),
	profile_verifiedBy: one(profiles, {
		fields: [crmSensitiveIdentities.verifiedBy],
		references: [profiles.id],
		relationName: "crmSensitiveIdentities_verifiedBy_profiles_id"
	}),
}));

export const crmBeneficiaryProfilesRelations = relations(crmBeneficiaryProfiles, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmBeneficiaryProfiles.contactId],
		references: [crmContacts.id]
	}),
	profile: one(profiles, {
		fields: [crmBeneficiaryProfiles.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmBeneficiaryProfiles.organizationId],
		references: [organizations.id]
	}),
}));

export const crmInstitutionProfilesRelations = relations(crmInstitutionProfiles, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmInstitutionProfiles.contactId],
		references: [crmContacts.id]
	}),
	profile: one(profiles, {
		fields: [crmInstitutionProfiles.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmInstitutionProfiles.organizationId],
		references: [organizations.id]
	}),
}));

export const crmTagsRelations = relations(crmTags, ({one, many}) => ({
	profile: one(profiles, {
		fields: [crmTags.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmTags.organizationId],
		references: [organizations.id]
	}),
	crmContactTags: many(crmContactTags),
}));

export const crmContactTagsRelations = relations(crmContactTags, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmContactTags.contactId],
		references: [crmContacts.id]
	}),
	profile: one(profiles, {
		fields: [crmContactTags.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmContactTags.organizationId],
		references: [organizations.id]
	}),
	crmTag: one(crmTags, {
		fields: [crmContactTags.tagId],
		references: [crmTags.id]
	}),
}));

export const crmInteractionsRelations = relations(crmInteractions, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmInteractions.contactId],
		references: [crmContacts.id]
	}),
	profile: one(profiles, {
		fields: [crmInteractions.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmInteractions.organizationId],
		references: [organizations.id]
	}),
}));

export const crmConsentsRelations = relations(crmConsents, ({one}) => ({
	crmContact: one(crmContacts, {
		fields: [crmConsents.contactId],
		references: [crmContacts.id]
	}),
	profile: one(profiles, {
		fields: [crmConsents.createdBy],
		references: [profiles.id]
	}),
	organization: one(organizations, {
		fields: [crmConsents.organizationId],
		references: [organizations.id]
	}),
}));

export const crmDuplicateCandidatesRelations = relations(crmDuplicateCandidates, ({one}) => ({
	profile_createdBy: one(profiles, {
		fields: [crmDuplicateCandidates.createdBy],
		references: [profiles.id],
		relationName: "crmDuplicateCandidates_createdBy_profiles_id"
	}),
	crmContact_duplicateContactId: one(crmContacts, {
		fields: [crmDuplicateCandidates.duplicateContactId],
		references: [crmContacts.id],
		relationName: "crmDuplicateCandidates_duplicateContactId_crmContacts_id"
	}),
	organization: one(organizations, {
		fields: [crmDuplicateCandidates.organizationId],
		references: [organizations.id]
	}),
	crmContact_primaryContactId: one(crmContacts, {
		fields: [crmDuplicateCandidates.primaryContactId],
		references: [crmContacts.id],
		relationName: "crmDuplicateCandidates_primaryContactId_crmContacts_id"
	}),
	profile_reviewedBy: one(profiles, {
		fields: [crmDuplicateCandidates.reviewedBy],
		references: [profiles.id],
		relationName: "crmDuplicateCandidates_reviewedBy_profiles_id"
	}),
}));

export const crmMergeRequestsRelations = relations(crmMergeRequests, ({one}) => ({
	profile_approvedBy: one(profiles, {
		fields: [crmMergeRequests.approvedBy],
		references: [profiles.id],
		relationName: "crmMergeRequests_approvedBy_profiles_id"
	}),
	profile_createdBy: one(profiles, {
		fields: [crmMergeRequests.createdBy],
		references: [profiles.id],
		relationName: "crmMergeRequests_createdBy_profiles_id"
	}),
	organization: one(organizations, {
		fields: [crmMergeRequests.organizationId],
		references: [organizations.id]
	}),
	profile_requestedBy: one(profiles, {
		fields: [crmMergeRequests.requestedBy],
		references: [profiles.id],
		relationName: "crmMergeRequests_requestedBy_profiles_id"
	}),
	crmContact_sourceContactId: one(crmContacts, {
		fields: [crmMergeRequests.sourceContactId],
		references: [crmContacts.id],
		relationName: "crmMergeRequests_sourceContactId_crmContacts_id"
	}),
	crmContact_targetContactId: one(crmContacts, {
		fields: [crmMergeRequests.targetContactId],
		references: [crmContacts.id],
		relationName: "crmMergeRequests_targetContactId_crmContacts_id"
	}),
}));