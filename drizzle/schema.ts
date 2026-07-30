import { pgTable, index, foreignKey, unique, pgPolicy, check, uuid, text, timestamp, boolean, integer, numeric, jsonb, date, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const organizationRelationships = pgTable("organization_relationships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceOrganizationId: uuid("source_organization_id").notNull(),
	targetOrganizationId: uuid("target_organization_id").notNull(),
	relationshipType: text("relationship_type").notNull(),
	status: text().default('active').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_org_relationships_source").using("btree", table.sourceOrganizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_org_relationships_target").using("btree", table.targetOrganizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "organization_relationships_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sourceOrganizationId],
			foreignColumns: [organizations.id],
			name: "organization_relationships_source_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.targetOrganizationId],
			foreignColumns: [organizations.id],
			name: "organization_relationships_target_organization_id_fkey"
		}).onDelete("cascade"),
	unique("organization_relationships_unique").on(table.relationshipType, table.sourceOrganizationId, table.targetOrganizationId),
	pgPolicy("organization_relationships_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`private.has_permission(source_organization_id, 'organization_relationships.delete'::text)` }),
	pgPolicy("organization_relationships_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("organization_relationships_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("organization_relationships_select", { as: "permissive", for: "select", to: ["public"] }),
	check("organization_relationships_not_self", sql`source_organization_id <> target_organization_id`),
	check("organization_relationships_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])`),
]);

export const schemaMigrations = pgTable("schema_migrations", {
	version: text().primaryKey().notNull(),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	legalName: text("legal_name"),
	type: text().default('manager').notNull(),
	status: text().default('active').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "organizations_created_by_fkey"
		}).onDelete("set null"),
	unique("organizations_code_key").on(table.code),
	pgPolicy("organizations_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`private.has_permission(id, 'organizations.delete'::text)` }),
	pgPolicy("organizations_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("organizations_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("organizations_select", { as: "permissive", for: "select", to: ["public"] }),
	check("organizations_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])`),
	check("organizations_type_check", sql`type = ANY (ARRAY['grantor'::text, 'manager'::text, 'distribution_partner'::text, 'institution'::text, 'internal'::text])`),
]);

export const profiles = pgTable("profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: text("auth_user_id").notNull(),
	displayName: text("display_name").notNull(),
	email: text().notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("profiles_auth_user_id_key").on(table.authUserId),
	pgPolicy("profiles_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
	pgPolicy("profiles_update_self", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("profiles_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("profiles_select_same_org", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("profiles_select_self", { as: "permissive", for: "select", to: ["public"] }),
	check("profiles_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])`),
]);

export const organizationUnits = pgTable("organization_units", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	parentId: uuid("parent_id"),
	code: text().notNull(),
	name: text().notNull(),
	status: text().default('active').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_organization_units_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_organization_units_parent").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "organization_units_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_units_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "organization_units_parent_id_fkey"
		}).onDelete("set null"),
	unique("organization_units_unique_code_per_org").on(table.code, table.organizationId),
	pgPolicy("organization_units_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`private.has_permission(organization_id, 'organization_units.delete'::text)` }),
	pgPolicy("organization_units_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("organization_units_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("organization_units_select", { as: "permissive", for: "select", to: ["public"] }),
	check("organization_units_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])`),
]);

export const memberships = pgTable("memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	profileId: uuid("profile_id").notNull(),
	organizationUnitId: uuid("organization_unit_id"),
	status: text().default('active').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_memberships_org_profile_status").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.profileId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_memberships_profile_status").using("btree", table.profileId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "memberships_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "memberships_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationUnitId],
			foreignColumns: [organizationUnits.id],
			name: "memberships_organization_unit_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "memberships_profile_id_fkey"
		}).onDelete("cascade"),
	unique("memberships_unique_profile_per_org").on(table.organizationId, table.profileId),
	unique("memberships_id_org_unique").on(table.id, table.organizationId),
	pgPolicy("memberships_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`private.has_permission(organization_id, 'memberships.delete'::text)` }),
	pgPolicy("memberships_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("memberships_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("memberships_select", { as: "permissive", for: "select", to: ["public"] }),
	check("memberships_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'invited'::text, 'suspended'::text])`),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_roles_org_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.key.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "roles_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "roles_organization_id_fkey"
		}).onDelete("cascade"),
	unique("roles_unique_key_per_scope").on(table.key, table.organizationId),
	pgPolicy("roles_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`((organization_id IS NOT NULL) AND private.has_permission(organization_id, 'roles.delete'::text))` }),
	pgPolicy("roles_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("roles_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("roles_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const permissions = pgTable("permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	resource: text().notNull(),
	action: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("permissions_key_key").on(table.key),
	pgPolicy("permissions_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
	pgPolicy("permissions_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("permissions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("permissions_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const rolePermissions = pgTable("role_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_role_permissions_permission").using("btree", table.permissionId.asc().nullsLast().op("uuid_ops")),
	index("idx_role_permissions_role").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "role_permissions_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "role_permissions_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_permissions_permission_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_permissions_role_id_fkey"
		}).onDelete("cascade"),
	unique("role_permissions_unique").on(table.permissionId, table.roleId),
	pgPolicy("role_permissions_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`((organization_id IS NOT NULL) AND private.has_permission(organization_id, 'roles.manage'::text))` }),
	pgPolicy("role_permissions_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("role_permissions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("role_permissions_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const membershipRoles = pgTable("membership_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	membershipId: uuid("membership_id").notNull(),
	roleId: uuid("role_id").notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_membership_roles_membership").using("btree", table.membershipId.asc().nullsLast().op("uuid_ops")),
	index("idx_membership_roles_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "membership_roles_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [memberships.id],
			name: "membership_roles_membership_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "membership_roles_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "membership_roles_role_id_fkey"
		}).onDelete("cascade"),
	unique("membership_roles_unique").on(table.membershipId, table.roleId),
	pgPolicy("membership_roles_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`private.has_permission(organization_id, 'memberships.manage'::text)` }),
	pgPolicy("membership_roles_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("membership_roles_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("membership_roles_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const programCategories = pgTable("program_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	organizationId: uuid("organization_id"),
	status: text().default('active').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_program_categories_org_status").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "program_categories_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "program_categories_organization_id_fkey"
		}).onDelete("cascade"),
	unique("program_categories_unique_code").on(table.code, table.organizationId),
	pgPolicy("program_categories_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'program_categories.delete'::text))` }),
	pgPolicy("program_categories_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("program_categories_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("program_categories_select", { as: "permissive", for: "select", to: ["public"] }),
	check("program_categories_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text])`),
]);

export const programs = pgTable("programs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	code: text().notNull(),
	name: text().notNull(),
	categoryId: uuid("category_id"),
	description: text(),
	objective: text(),
	targetBeneficiaryType: text("target_beneficiary_type").notNull(),
	targetBeneficiaryCount: integer("target_beneficiary_count"),
	budgetAmount: numeric("budget_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	allocatedAmount: numeric("allocated_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	disbursedAmount: numeric("disbursed_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	fundType: text("fund_type").notNull(),
	status: text().default('draft').notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }),
	ownerId: uuid("owner_id"),
	isArchived: boolean("is_archived").default(false).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	archivedBy: uuid("archived_by"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_programs_org_status").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.archivedBy],
			foreignColumns: [profiles.id],
			name: "programs_archived_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [programCategories.id],
			name: "programs_category_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "programs_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "programs_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [profiles.id],
			name: "programs_owner_id_fkey"
		}).onDelete("set null"),
	unique("programs_unique_org_code").on(table.code, table.organizationId),
	unique("programs_id_org_unique").on(table.id, table.organizationId),
	pgPolicy("programs_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'programs.delete'::text))` }),
	pgPolicy("programs_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("programs_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("programs_select", { as: "permissive", for: "select", to: ["public"] }),
	check("programs_fund_type_check", sql`fund_type = ANY (ARRAY['zakat'::text, 'infaq'::text, 'sedekah'::text, 'waqf'::text, 'humanitarian'::text, 'education'::text, 'health'::text, 'general'::text])`),
	check("programs_status_check", sql`status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'archived'::text])`),
	check("programs_target_type_check", sql`target_beneficiary_type = ANY (ARRAY['individual'::text, 'family'::text, 'institution'::text, 'community'::text, 'disaster_area'::text, 'mosque'::text, 'school'::text])`),
]);

export const programRevisions = pgTable("program_revisions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	programId: uuid("program_id").notNull(),
	actionType: text("action_type").notNull(),
	changeSummary: text("change_summary").notNull(),
	reason: text(),
	previousValues: jsonb("previous_values"),
	newValues: jsonb("new_values"),
	performedBy: uuid("performed_by"),
	performedAt: timestamp("performed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_program_revisions_program").using("btree", table.programId.asc().nullsLast().op("timestamptz_ops"), table.performedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "program_revisions_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "program_revisions_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [profiles.id],
			name: "program_revisions_performed_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "program_revisions_program_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("program_revisions_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'program_revisions.delete'::text))` }),
	pgPolicy("program_revisions_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("program_revisions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("program_revisions_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const crmContacts = pgTable("crm_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactType: text("contact_type").notNull(),
	displayName: text("display_name").notNull(),
	legalName: text("legal_name"),
	normalizedName: text("normalized_name").notNull(),
	primaryEmail: text("primary_email"),
	normalizedEmail: text("normalized_email"),
	primaryPhone: text("primary_phone"),
	normalizedPhone: text("normalized_phone"),
	whatsappPhone: text("whatsapp_phone"),
	gender: text(),
	birthDate: date("birth_date"),
	addressLine: text("address_line"),
	village: text(),
	district: text(),
	city: text(),
	province: text(),
	postalCode: text("postal_code"),
	status: text().default('active').notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_contacts_org_normalized_name").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.normalizedName.asc().nullsLast().op("text_ops")),
	index("idx_crm_contacts_org_status").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_contacts_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_contacts_organization_id_fkey"
		}).onDelete("cascade"),
	unique("crm_contacts_id_org_unique").on(table.id, table.organizationId),
	pgPolicy("crm_contacts_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_contacts.delete'::text))` }),
	pgPolicy("crm_contacts_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_contacts_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_contacts_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_contacts_contact_type_check", sql`contact_type = ANY (ARRAY['person'::text, 'institution'::text])`),
	check("crm_contacts_gender_check", sql`(gender IS NULL) OR (gender = ANY (ARRAY['male'::text, 'female'::text, 'unknown'::text]))`),
	check("crm_contacts_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'deceased'::text, 'archived'::text])`),
]);

export const crmContactRoles = pgTable("crm_contact_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	roleType: text("role_type").notNull(),
	status: text().default('active').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_contact_roles_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_contact_roles_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_contact_roles_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_contact_roles_organization_id_fkey"
		}).onDelete("cascade"),
	unique("crm_contact_roles_unique").on(table.contactId, table.organizationId, table.roleType),
	pgPolicy("crm_contact_roles_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_contact_roles.delete'::text))` }),
	pgPolicy("crm_contact_roles_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_contact_roles_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_contact_roles_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_contact_roles_role_type_check", sql`role_type = ANY (ARRAY['donor'::text, 'kafil'::text, 'volunteer'::text, 'beneficiary'::text])`),
	check("crm_contact_roles_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'paused'::text, 'ended'::text])`),
]);

export const crmSensitiveIdentities = pgTable("crm_sensitive_identities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	identityType: text("identity_type").notNull(),
	identityCiphertextRef: text("identity_ciphertext_ref").notNull(),
	identityLast4: text("identity_last4"),
	identityHash: text("identity_hash"),
	verificationStatus: text("verification_status").default('unverified').notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	verifiedBy: uuid("verified_by"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_sensitive_identities_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_sensitive_identities_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_sensitive_identities_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_sensitive_identities_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [profiles.id],
			name: "crm_sensitive_identities_verified_by_fkey"
		}).onDelete("set null"),
	pgPolicy("crm_sensitive_identities_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_sensitive_identities.delete'::text))` }),
	pgPolicy("crm_sensitive_identities_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_sensitive_identities_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_sensitive_identities_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_sensitive_identities_identity_type_check", sql`identity_type = ANY (ARRAY['nik'::text, 'passport'::text, 'kitab'::text, 'tax_id'::text, 'other'::text])`),
	check("crm_sensitive_identities_status_check", sql`verification_status = ANY (ARRAY['unverified'::text, 'verified'::text, 'rejected'::text, 'expired'::text])`),
]);

export const crmBeneficiaryProfiles = pgTable("crm_beneficiary_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	beneficiaryType: text("beneficiary_type").notNull(),
	vulnerabilityLevel: text("vulnerability_level").notNull(),
	householdSize: integer("household_size"),
	incomeRange: text("income_range"),
	assessmentStatus: text("assessment_status").default('not_assessed').notNull(),
	status: text().default('active').notNull(),
	eligibilityNotes: text("eligibility_notes"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_beneficiary_profiles_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_beneficiary_profiles_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_beneficiary_profiles_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_beneficiary_profiles_organization_id_fkey"
		}).onDelete("cascade"),
	unique("crm_beneficiary_profiles_unique").on(table.contactId, table.organizationId),
	pgPolicy("crm_beneficiary_profiles_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_beneficiary_profiles.delete'::text))` }),
	pgPolicy("crm_beneficiary_profiles_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_beneficiary_profiles_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_beneficiary_profiles_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_beneficiary_profiles_assessment_check", sql`assessment_status = ANY (ARRAY['not_assessed'::text, 'in_review'::text, 'eligible'::text, 'not_eligible'::text, 'expired'::text])`),
	check("crm_beneficiary_profiles_income_check", sql`(income_range IS NULL) OR (income_range = ANY (ARRAY['unknown'::text, 'none'::text, 'low'::text, 'middle'::text]))`),
	check("crm_beneficiary_profiles_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'graduated'::text, 'blocked'::text])`),
	check("crm_beneficiary_profiles_type_check", sql`beneficiary_type = ANY (ARRAY['individual'::text, 'family'::text, 'institution'::text, 'community'::text])`),
	check("crm_beneficiary_profiles_vulnerability_check", sql`vulnerability_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])`),
]);

export const crmInstitutionProfiles = pgTable("crm_institution_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	institutionType: text("institution_type").notNull(),
	institutionCode: text("institution_code"),
	registrationReference: text("registration_reference"),
	contactPersonName: text("contact_person_name"),
	contactPersonPhone: text("contact_person_phone"),
	status: text().default('active').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_institution_profiles_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_institution_profiles_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_institution_profiles_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_institution_profiles_organization_id_fkey"
		}).onDelete("cascade"),
	unique("crm_institution_profiles_unique").on(table.contactId, table.organizationId),
	pgPolicy("crm_institution_profiles_update", { as: "permissive", for: "update", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_institution_profiles.manage'::text))`, withCheck: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_institution_profiles.manage'::text))`  }),
	pgPolicy("crm_institution_profiles_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_institution_profiles_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("crm_institution_profiles_delete", { as: "permissive", for: "delete", to: ["public"] }),
	check("crm_institution_profiles_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'unverified'::text, 'archived'::text])`),
	check("crm_institution_profiles_type_check", sql`institution_type = ANY (ARRAY['mosque'::text, 'school'::text, 'foundation'::text, 'company'::text, 'community'::text, 'government'::text, 'other'::text])`),
]);

export const crmTags = pgTable("crm_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	key: text().notNull(),
	label: text().notNull(),
	description: text(),
	color: text(),
	status: text().default('active').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_tags_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_tags_organization_id_fkey"
		}).onDelete("cascade"),
	unique("crm_tags_unique_key").on(table.key, table.organizationId),
	pgPolicy("crm_tags_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_tags.delete'::text))` }),
	pgPolicy("crm_tags_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_tags_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_tags_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_tags_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text])`),
]);

export const crmContactTags = pgTable("crm_contact_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_contact_tags_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_contact_tags_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_contact_tags_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [crmTags.id],
			name: "crm_contact_tags_tag_id_fkey"
		}).onDelete("cascade"),
	unique("crm_contact_tags_unique").on(table.contactId, table.organizationId, table.tagId),
	pgPolicy("crm_contact_tags_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_contact_tags.delete'::text))` }),
	pgPolicy("crm_contact_tags_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_contact_tags_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_contact_tags_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const crmInteractions = pgTable("crm_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	interactionType: text("interaction_type").notNull(),
	direction: text().notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }),
	summary: text().notNull(),
	followUpNote: text("follow_up_note"),
	followUpAt: timestamp("follow_up_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_interactions_contact").using("btree", table.contactId.asc().nullsLast().op("timestamptz_ops"), table.occurredAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_interactions_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_interactions_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_interactions_organization_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("crm_interactions_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_interactions.delete'::text))` }),
	pgPolicy("crm_interactions_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_interactions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_interactions_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_interactions_direction_check", sql`direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'internal'::text])`),
	check("crm_interactions_type_check", sql`interaction_type = ANY (ARRAY['call'::text, 'whatsapp'::text, 'email'::text, 'visit'::text, 'meeting'::text, 'note'::text])`),
]);

export const crmConsents = pgTable("crm_consents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	consentType: text("consent_type").notNull(),
	channel: text().notNull(),
	status: text().notNull(),
	consentedAt: timestamp("consented_at", { withTimezone: true, mode: 'string' }),
	withdrawnAt: timestamp("withdrawn_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	evidenceFileId: text("evidence_file_id"),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_consents_contact").using("btree", table.contactId.asc().nullsLast().op("timestamptz_ops"), table.consentedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [crmContacts.id],
			name: "crm_consents_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_consents_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_consents_organization_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("crm_consents_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_consents.delete'::text))` }),
	pgPolicy("crm_consents_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_consents_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_consents_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_consents_channel_check", sql`channel = ANY (ARRAY['paper'::text, 'web'::text, 'whatsapp'::text, 'email'::text, 'verbal_recorded'::text])`),
	check("crm_consents_status_check", sql`status = ANY (ARRAY['granted'::text, 'withdrawn'::text, 'expired'::text])`),
	check("crm_consents_type_check", sql`consent_type = ANY (ARRAY['data_processing'::text, 'communication'::text, 'documentation'::text, 'media_publication'::text])`),
]);

export const crmDuplicateCandidates = pgTable("crm_duplicate_candidates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	primaryContactId: uuid("primary_contact_id").notNull(),
	duplicateContactId: uuid("duplicate_contact_id").notNull(),
	matchScore: doublePrecision("match_score"),
	matchReasons: text("match_reasons").notNull(),
	status: text().default('open').notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_duplicate_candidates_primary").using("btree", table.primaryContactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_duplicate_candidates_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.duplicateContactId],
			foreignColumns: [crmContacts.id],
			name: "crm_duplicate_candidates_duplicate_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_duplicate_candidates_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.primaryContactId],
			foreignColumns: [crmContacts.id],
			name: "crm_duplicate_candidates_primary_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [profiles.id],
			name: "crm_duplicate_candidates_reviewed_by_fkey"
		}).onDelete("set null"),
	unique("crm_duplicate_candidates_unique").on(table.duplicateContactId, table.organizationId, table.primaryContactId),
	pgPolicy("crm_duplicate_candidates_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_duplicate_candidates.delete'::text))` }),
	pgPolicy("crm_duplicate_candidates_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_duplicate_candidates_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_duplicate_candidates_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_duplicate_candidates_not_self", sql`primary_contact_id <> duplicate_contact_id`),
	check("crm_duplicate_candidates_status_check", sql`status = ANY (ARRAY['open'::text, 'dismissed'::text, 'merge_requested'::text, 'merged'::text])`),
]);

export const crmMergeRequests = pgTable("crm_merge_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	sourceContactId: uuid("source_contact_id").notNull(),
	targetContactId: uuid("target_contact_id").notNull(),
	status: text().default('draft').notNull(),
	reason: text().notNull(),
	requestedBy: uuid("requested_by"),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }),
	approvedBy: uuid("approved_by"),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }),
	auditSummary: text("audit_summary"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_crm_merge_requests_source").using("btree", table.sourceContactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [profiles.id],
			name: "crm_merge_requests_approved_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "crm_merge_requests_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "crm_merge_requests_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [profiles.id],
			name: "crm_merge_requests_requested_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sourceContactId],
			foreignColumns: [crmContacts.id],
			name: "crm_merge_requests_source_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.targetContactId],
			foreignColumns: [crmContacts.id],
			name: "crm_merge_requests_target_contact_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("crm_merge_requests_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_merge_requests.delete'::text))` }),
	pgPolicy("crm_merge_requests_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("crm_merge_requests_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("crm_merge_requests_select", { as: "permissive", for: "select", to: ["public"] }),
	check("crm_merge_requests_not_self", sql`source_contact_id <> target_contact_id`),
	check("crm_merge_requests_status_check", sql`status = ANY (ARRAY['draft'::text, 'requested'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'cancelled'::text])`),
]);
