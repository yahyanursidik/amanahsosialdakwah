import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  crmContacts,
  organizations,
  profiles,
  programs,
} from "../../drizzle/schema";

const permission = (key: string) =>
  sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, ${sql.raw(`'${key.replaceAll("'", "''")}'`)})`;
const canWriteLedger = sql`private.has_active_membership(organization_id) and (
  (entry_type = 'receipt_posted' and private.has_permission(organization_id, 'fund_receipts.post'))
  or (entry_type = 'receipt_reversed' and private.has_permission(organization_id, 'fund_receipts.reverse'))
  or (entry_type = 'allocation_approved' and private.has_permission(organization_id, 'fund_allocations.activate'))
  or (entry_type = 'allocation_reversed' and private.has_permission(organization_id, 'fund_allocations.reverse'))
  or (entry_type = 'disbursement_posted' and private.has_permission(organization_id, 'fund_disbursements.post'))
  or (entry_type = 'disbursement_reversed' and private.has_permission(organization_id, 'fund_disbursements.reverse'))
)`;
const canInsertReversal = sql`private.has_active_membership(organization_id) and (
  (source_type = 'receipt' and private.has_permission(organization_id, 'fund_receipts.reverse'))
  or (source_type = 'allocation' and private.has_permission(organization_id, 'fund_allocations.reverse'))
  or (source_type = 'disbursement' and private.has_permission(organization_id, 'fund_disbursements.reverse'))
)`;
const canUseIdempotency = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
)`;

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
};

export const fundRestrictions = pgTable(
  "fund_restrictions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    code: text().notNull(),
    name: text().notNull(),
    restrictionType: text("restriction_type").notNull(),
    programId: uuid("program_id"),
    currency: text().default("IDR").notNull(),
    status: text().default("active").notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (table) => [
    index("idx_fund_restrictions_org_status").on(
      table.organizationId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_restrictions_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.programId, table.organizationId],
      foreignColumns: [programs.id, programs.organizationId],
      name: "fund_restrictions_program_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "fund_restrictions_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "fund_restrictions_updated_by_fkey",
    }).onDelete("set null"),
    unique("fund_restrictions_org_code_unique").on(
      table.organizationId,
      table.code,
    ),
    unique("fund_restrictions_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("fund_restrictions_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_restrictions.read"),
    }),
    pgPolicy("fund_restrictions_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: permission("fund_restrictions.manage"),
    }),
    pgPolicy("fund_restrictions_update", {
      for: "update",
      to: ["app_runtime"],
      using: permission("fund_restrictions.manage"),
      withCheck: permission("fund_restrictions.manage"),
    }),
    pgPolicy("fund_restrictions_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "fund_restrictions_type_check",
      sql`restriction_type in ('unrestricted', 'program')`,
    ),
    check(
      "fund_restrictions_program_check",
      sql`(restriction_type = 'unrestricted' and program_id is null)
        or (restriction_type = 'program' and program_id is not null)`,
    ),
    check("fund_restrictions_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_restrictions_status_check",
      sql`status in ('active', 'inactive')`,
    ),
  ],
).enableRLS();

export const fundCommitments = pgTable(
  "fund_commitments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    donorContactId: uuid("donor_contact_id"),
    restrictionId: uuid("restriction_id").notNull(),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    expectedAt: timestamp("expected_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: text().default("active").notNull(),
    notes: text(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (table) => [
    index("idx_fund_commitments_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_fund_commitments_restriction").on(
      table.organizationId,
      table.restrictionId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_commitments_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.donorContactId, table.organizationId],
      foreignColumns: [crmContacts.id, crmContacts.organizationId],
      name: "fund_commitments_donor_contact_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.restrictionId, table.organizationId],
      foreignColumns: [
        fundRestrictions.id,
        fundRestrictions.organizationId,
      ],
      name: "fund_commitments_restriction_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "fund_commitments_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "fund_commitments_updated_by_fkey",
    }).onDelete("set null"),
    unique("fund_commitments_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("fund_commitments_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("fund_commitments_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_commitments.read"),
    }),
    pgPolicy("fund_commitments_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: permission("fund_commitments.manage"),
    }),
    pgPolicy("fund_commitments_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'fund_commitments.manage')
        or private.has_permission(organization_id, 'fund_receipts.post')
        or private.has_permission(organization_id, 'fund_receipts.reverse')
      )`,
      withCheck: sql`private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'fund_commitments.manage')
        or private.has_permission(organization_id, 'fund_receipts.post')
        or private.has_permission(organization_id, 'fund_receipts.reverse')
      )`,
    }),
    pgPolicy("fund_commitments_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("fund_commitments_amount_check", sql`amount > 0`),
    check("fund_commitments_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_commitments_status_check",
      sql`status in ('active', 'partially_received', 'fulfilled', 'cancelled')`,
    ),
  ],
).enableRLS();

export const fundReceipts = pgTable(
  "fund_receipts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    commitmentId: uuid("commitment_id"),
    restrictionId: uuid("restriction_id").notNull(),
    donorContactId: uuid("donor_contact_id"),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    receivedAt: timestamp("received_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    paymentMethod: text("payment_method").notNull(),
    externalReference: text("external_reference"),
    status: text().default("posted").notNull(),
    reversedAt: timestamp("reversed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (table) => [
    index("idx_fund_receipts_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_fund_receipts_restriction").on(
      table.organizationId,
      table.restrictionId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_receipts_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.commitmentId, table.organizationId],
      foreignColumns: [
        fundCommitments.id,
        fundCommitments.organizationId,
      ],
      name: "fund_receipts_commitment_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.restrictionId, table.organizationId],
      foreignColumns: [
        fundRestrictions.id,
        fundRestrictions.organizationId,
      ],
      name: "fund_receipts_restriction_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.donorContactId, table.organizationId],
      foreignColumns: [crmContacts.id, crmContacts.organizationId],
      name: "fund_receipts_donor_contact_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "fund_receipts_created_by_fkey",
    }).onDelete("set null"),
    unique("fund_receipts_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("fund_receipts_id_org_unique").on(table.id, table.organizationId),
    pgPolicy("fund_receipts_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_receipts.read"),
    }),
    pgPolicy("fund_receipts_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: permission("fund_receipts.post"),
    }),
    pgPolicy("fund_receipts_update", {
      for: "update",
      to: ["app_runtime"],
      using: permission("fund_receipts.reverse"),
      withCheck: permission("fund_receipts.reverse"),
    }),
    pgPolicy("fund_receipts_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("fund_receipts_amount_check", sql`amount > 0`),
    check("fund_receipts_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_receipts_status_check",
      sql`status in ('posted', 'reversed')`,
    ),
  ],
).enableRLS();

export const fundAllocations = pgTable(
  "fund_allocations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    restrictionId: uuid("restriction_id").notNull(),
    programId: uuid("program_id").notNull(),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    purpose: text().notNull(),
    status: text().default("draft").notNull(),
    activatedAt: timestamp("activated_at", {
      withTimezone: true,
      mode: "string",
    }),
    activatedBy: uuid("activated_by"),
    reversedAt: timestamp("reversed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (table) => [
    index("idx_fund_allocations_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_fund_allocations_restriction").on(
      table.organizationId,
      table.restrictionId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_allocations_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.restrictionId, table.organizationId],
      foreignColumns: [
        fundRestrictions.id,
        fundRestrictions.organizationId,
      ],
      name: "fund_allocations_restriction_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.programId, table.organizationId],
      foreignColumns: [programs.id, programs.organizationId],
      name: "fund_allocations_program_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.activatedBy],
      foreignColumns: [profiles.id],
      name: "fund_allocations_activated_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "fund_allocations_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "fund_allocations_updated_by_fkey",
    }).onDelete("set null"),
    unique("fund_allocations_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("fund_allocations_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("fund_allocations_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_allocations.read"),
    }),
    pgPolicy("fund_allocations_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: permission("fund_allocations.manage"),
    }),
    pgPolicy("fund_allocations_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'fund_allocations.manage')
        or private.has_permission(organization_id, 'fund_allocations.activate')
        or private.has_permission(organization_id, 'fund_allocations.reverse')
      )`,
      withCheck: sql`private.has_active_membership(organization_id) and (
        (status = 'draft' and private.has_permission(organization_id, 'fund_allocations.manage'))
        or (status = 'approved' and private.has_permission(organization_id, 'fund_allocations.activate'))
        or (status = 'reversed' and private.has_permission(organization_id, 'fund_allocations.reverse'))
      )`,
    }),
    pgPolicy("fund_allocations_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("fund_allocations_amount_check", sql`amount > 0`),
    check("fund_allocations_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_allocations_status_check",
      sql`status in ('draft', 'approved', 'reversed')`,
    ),
  ],
).enableRLS();

export const fundDisbursements = pgTable(
  "fund_disbursements",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    allocationId: uuid("allocation_id").notNull(),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    recipientType: text("recipient_type").notNull(),
    recipientReference: text("recipient_reference").notNull(),
    paymentMethod: text("payment_method").notNull(),
    externalReference: text("external_reference"),
    disbursedAt: timestamp("disbursed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    status: text().default("posted").notNull(),
    reversedAt: timestamp("reversed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (table) => [
    index("idx_fund_disbursements_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_fund_disbursements_allocation").on(
      table.organizationId,
      table.allocationId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_disbursements_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.allocationId, table.organizationId],
      foreignColumns: [
        fundAllocations.id,
        fundAllocations.organizationId,
      ],
      name: "fund_disbursements_allocation_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "fund_disbursements_created_by_fkey",
    }).onDelete("set null"),
    unique("fund_disbursements_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("fund_disbursements_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("fund_disbursements_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_disbursements.read"),
    }),
    pgPolicy("fund_disbursements_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: permission("fund_disbursements.post"),
    }),
    pgPolicy("fund_disbursements_update", {
      for: "update",
      to: ["app_runtime"],
      using: permission("fund_disbursements.reverse"),
      withCheck: permission("fund_disbursements.reverse"),
    }),
    pgPolicy("fund_disbursements_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("fund_disbursements_amount_check", sql`amount > 0`),
    check("fund_disbursements_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_disbursements_status_check",
      sql`status in ('posted', 'reversed')`,
    ),
  ],
).enableRLS();

export const fundReversals = pgTable(
  "fund_reversals",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    reason: text().notNull(),
    reversedBy: uuid("reversed_by").notNull(),
    reversedAt: timestamp("reversed_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_fund_reversals_source").on(
      table.organizationId,
      table.sourceType,
      table.sourceId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_reversals_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.reversedBy],
      foreignColumns: [profiles.id],
      name: "fund_reversals_reversed_by_fkey",
    }).onDelete("restrict"),
    unique("fund_reversals_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("fund_reversals_source_unique").on(
      table.organizationId,
      table.sourceType,
      table.sourceId,
    ),
    pgPolicy("fund_reversals_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_ledger.read"),
    }),
    pgPolicy("fund_reversals_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canInsertReversal,
    }),
    pgPolicy("fund_reversals_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("fund_reversals_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "fund_reversals_source_type_check",
      sql`source_type in ('receipt', 'allocation', 'disbursement')`,
    ),
    check("fund_reversals_amount_check", sql`amount > 0`),
    check("fund_reversals_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
  ],
).enableRLS();

export const fundLedgerEntries = pgTable(
  "fund_ledger_entries",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    entryNumber: text("entry_number").notNull(),
    entryType: text("entry_type").notNull(),
    restrictionId: uuid("restriction_id").notNull(),
    programId: uuid("program_id"),
    allocationId: uuid("allocation_id"),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    currency: text().notNull(),
    availableDelta: numeric("available_delta", {
      precision: 20,
      scale: 2,
    })
      .default("0")
      .notNull(),
    allocatedDelta: numeric("allocated_delta", {
      precision: 20,
      scale: 2,
    })
      .default("0")
      .notNull(),
    disbursedDelta: numeric("disbursed_delta", {
      precision: 20,
      scale: 2,
    })
      .default("0")
      .notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    actorProfileId: uuid("actor_profile_id").notNull(),
    requestId: uuid("request_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_fund_ledger_restriction").on(
      table.organizationId,
      table.restrictionId,
      table.occurredAt,
    ),
    index("idx_fund_ledger_allocation").on(
      table.organizationId,
      table.allocationId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_ledger_entries_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.restrictionId, table.organizationId],
      foreignColumns: [
        fundRestrictions.id,
        fundRestrictions.organizationId,
      ],
      name: "fund_ledger_entries_restriction_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.programId, table.organizationId],
      foreignColumns: [programs.id, programs.organizationId],
      name: "fund_ledger_entries_program_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.allocationId, table.organizationId],
      foreignColumns: [
        fundAllocations.id,
        fundAllocations.organizationId,
      ],
      name: "fund_ledger_entries_allocation_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.actorProfileId],
      foreignColumns: [profiles.id],
      name: "fund_ledger_entries_actor_profile_id_fkey",
    }).onDelete("restrict"),
    unique("fund_ledger_entries_org_entry_unique").on(
      table.organizationId,
      table.entryNumber,
    ),
    unique("fund_ledger_entries_request_unique").on(
      table.organizationId,
      table.requestId,
    ),
    pgPolicy("fund_ledger_entries_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_ledger.read"),
    }),
    pgPolicy("fund_ledger_entries_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteLedger,
    }),
    pgPolicy("fund_ledger_entries_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("fund_ledger_entries_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("fund_ledger_entries_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_ledger_entries_entry_type_check",
      sql`entry_type in (
        'receipt_posted', 'receipt_reversed',
        'allocation_approved', 'allocation_reversed',
        'disbursement_posted', 'disbursement_reversed'
      )`,
    ),
    check(
      "fund_ledger_entries_source_type_check",
      sql`source_type in ('receipt', 'allocation', 'disbursement', 'reversal')`,
    ),
    check(
      "fund_ledger_entries_delta_check",
      sql`available_delta <> 0 or allocated_delta <> 0 or disbursed_delta <> 0`,
    ),
  ],
).enableRLS();

export const fundReconciliations = pgTable(
  "fund_reconciliations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    restrictionId: uuid("restriction_id").notNull(),
    currency: text().notNull(),
    periodEndedAt: timestamp("period_ended_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    systemBalance: numeric("system_balance", {
      precision: 20,
      scale: 2,
    }).notNull(),
    statementBalance: numeric("statement_balance", {
      precision: 20,
      scale: 2,
    }).notNull(),
    differenceAmount: numeric("difference_amount", {
      precision: 20,
      scale: 2,
    }).notNull(),
    status: text().notNull(),
    notes: text(),
    reconciledBy: uuid("reconciled_by").notNull(),
    reconciledAt: timestamp("reconciled_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_fund_reconciliations_restriction").on(
      table.organizationId,
      table.restrictionId,
      table.periodEndedAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_reconciliations_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.restrictionId, table.organizationId],
      foreignColumns: [
        fundRestrictions.id,
        fundRestrictions.organizationId,
      ],
      name: "fund_reconciliations_restriction_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.reconciledBy],
      foreignColumns: [profiles.id],
      name: "fund_reconciliations_reconciled_by_fkey",
    }).onDelete("restrict"),
    unique("fund_reconciliations_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    pgPolicy("fund_reconciliations_select", {
      for: "select",
      to: ["app_runtime"],
      using: permission("fund_reconciliations.read"),
    }),
    pgPolicy("fund_reconciliations_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: permission("fund_reconciliations.manage"),
    }),
    pgPolicy("fund_reconciliations_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("fund_reconciliations_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("fund_reconciliations_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "fund_reconciliations_status_check",
      sql`status in ('matched', 'variance')`,
    ),
  ],
).enableRLS();

export const fundIdempotencyRecords = pgTable(
  "fund_idempotency_records",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    commandType: text("command_type").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text().default("processing").notNull(),
    responseSnapshot: jsonb("response_snapshot"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("idx_fund_idempotency_created").on(
      table.organizationId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "fund_idempotency_records_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "fund_idempotency_records_created_by_fkey",
    }).onDelete("restrict"),
    unique("fund_idempotency_records_org_key_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    pgPolicy("fund_idempotency_records_select", {
      for: "select",
      to: ["app_runtime"],
      using: canUseIdempotency,
    }),
    pgPolicy("fund_idempotency_records_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canUseIdempotency,
    }),
    pgPolicy("fund_idempotency_records_update", {
      for: "update",
      to: ["app_runtime"],
      using: canUseIdempotency,
      withCheck: canUseIdempotency,
    }),
    pgPolicy("fund_idempotency_records_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "fund_idempotency_records_status_check",
      sql`status in ('processing', 'completed')`,
    ),
    check(
      "fund_idempotency_records_key_check",
      sql`length(idempotency_key) between 16 and 200`,
    ),
  ],
).enableRLS();
