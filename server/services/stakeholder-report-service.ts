import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import { resolveReportPeriod } from "../domain/report-rules";
import type { StakeholderListQuery } from "../routes/report-schemas";
import type { RequestContext } from "../types";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown>;

const can = (context: RequestContext, ...permissions: string[]) =>
  permissions.every((permission) => context.permissions.has(permission));

async function rows(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<Row[]> {
  return (await client.query<Row>(sql, values)).rows;
}

/**
 * Laporan satu pemangku kepentingan: apa yang diberikan (dana, barang, wakaf),
 * apa yang diajukan, apa yang disalurkan sebagai mitra, dan capaian program
 * yang didukung. Setiap bagian hanya diisi bila pembaca memiliki izin domainnya.
 */
export async function getStakeholderStatement(
  context: RequestContext,
  contactId: string,
) {
  requirePermission(context, "stakeholder_reports.read");
  requirePermission(context, "crm_contacts.read");

  return withTenantTransaction(context, async (_database, client) => {
    const org = context.organizationId;
    const [contact] = await rows(
      client,
      `select contact.id, contact.display_name, contact.contact_type,
              contact.primary_email, contact.primary_phone, contact.city,
              contact.province, contact.status, contact.created_at,
              coalesce((
                select array_agg(role.role_type order by role.role_type)
                from public.crm_contact_roles role
                where role.contact_id = contact.id
                  and role.organization_id = contact.organization_id
                  and role.status = 'active'
              ), '{}') roles
       from public.crm_contacts contact
       where contact.id = $1 and contact.organization_id = $2`,
      [contactId, org],
    );
    if (!contact) {
      throw new DomainError("NOT_FOUND", "Kontak tidak ditemukan.", 404);
    }

    const sections: string[] = [];
    const statement: Record<string, unknown> = { contact, sections };
    const values = [contactId, org];

    if (can(context, "fund_receipts.read")) {
      sections.push("cash_giving");
      statement.cashReceipts = await rows(
        client,
        `select receipt.id, receipt.reference_number, receipt.amount::text amount,
                receipt.currency, receipt.received_at, receipt.payment_method,
                receipt.status, restriction.name restriction_name,
                program.id program_id, program.name program_name
         from public.fund_receipts receipt
         join public.fund_restrictions restriction
           on restriction.id = receipt.restriction_id and restriction.organization_id = receipt.organization_id
         left join public.programs program
           on program.id = restriction.program_id and program.organization_id = restriction.organization_id
         where receipt.donor_contact_id = $1 and receipt.organization_id = $2
         order by receipt.received_at desc
         limit 200`,
        values,
      );
    }

    if (can(context, "in_kind_donations.read")) {
      sections.push("in_kind_giving");
      statement.inKindDonations = await rows(
        client,
        `select donation.id, donation.reference_number, donation.giving_type,
                donation.estimated_total_value::text estimated_total_value,
                donation.currency, donation.received_at,
                program.id program_id, program.name program_name,
                (select string_agg(product.name || ' × ' || trim(to_char(item.quantity, 'FM999999990.####')) || ' ' || item.unit, ', ')
                 from public.in_kind_donation_items item
                 join public.inventory_products product
                   on product.id = item.product_id and product.organization_id = item.organization_id
                 where item.donation_id = donation.id and item.organization_id = donation.organization_id) item_summary
         from public.in_kind_donations donation
         left join public.programs program
           on program.id = donation.program_id and program.organization_id = donation.organization_id
         where donation.donor_contact_id = $1 and donation.organization_id = $2
         order by donation.received_at desc
         limit 200`,
        values,
      );
    }

    if (can(context, "waqf.read")) {
      sections.push("waqf_giving");
      statement.waqfContributions = await rows(
        client,
        `select contribution.id, contribution.reference_number,
                contribution.amount::text amount, contribution.currency,
                contribution.contribution_form, contribution.received_at,
                contribution.on_behalf_of, contribution.certificate_number,
                contribution.status, asset.id asset_id, asset.name asset_name,
                asset.operational_status asset_status,
                coalesce((select sum(benefit.amount) from public.waqf_benefit_distributions benefit
                          where benefit.asset_id = asset.id and benefit.organization_id = asset.organization_id
                            and benefit.status = 'completed'), 0)::text asset_total_benefit
         from public.waqf_contributions contribution
         join public.waqf_assets asset
           on asset.id = contribution.asset_id and asset.organization_id = contribution.organization_id
         where contribution.wakif_contact_id = $1 and contribution.organization_id = $2
         order by contribution.received_at desc
         limit 200`,
        values,
      );
      statement.waqfAssetsDonated = await rows(
        client,
        `select asset.id, asset.reference_number, asset.name, asset.asset_type,
                asset.operational_status, asset.legal_status,
                asset.acquisition_value::text acquisition_value, asset.currency
         from public.waqf_assets asset
         where asset.donor_contact_id = $1 and asset.organization_id = $2
         order by asset.created_at desc`,
        values,
      );
      statement.waqfProposals = await rows(
        client,
        `select proposal.id, proposal.reference_number, proposal.title,
                proposal.proposal_type, proposal.status,
                proposal.requested_amount::text requested_amount,
                proposal.currency, proposal.created_at
         from public.waqf_proposals proposal
         where proposal.proposer_contact_id = $1 and proposal.organization_id = $2
         order by proposal.created_at desc`,
        values,
      );
    }

    if (can(context, "applications.read")) {
      sections.push("applications");
      statement.applications = await rows(
        client,
        `select application.id, application.reference_number, application.status,
                application.urgency, application.submitter_type,
                application.beneficiary_count, application.created_at,
                application.requested_amount::text requested_amount,
                program.name program_name, applicant.display_name applicant_name,
                case when application.submitting_partner_contact_id = $1
                     then 'partner' else 'applicant' end relation
         from public.aid_applications application
         join public.programs program
           on program.id = application.program_id and program.organization_id = application.organization_id
         join public.crm_contacts applicant
           on applicant.id = application.applicant_contact_id and applicant.organization_id = application.organization_id
         where application.organization_id = $2
           and (application.applicant_contact_id = $1 or application.submitting_partner_contact_id = $1)
         order by application.created_at desc
         limit 200`,
        values,
      );
    }

    if (can(context, "programs.read")) {
      sections.push("partner_delivery");
      statement.partnerAssignments = await rows(
        client,
        `select assignment.id, assignment.assignment_role, assignment.readiness_status,
                assignment.status, assignment.pic_name, program.id program_id,
                program.name program_name, area.name area_name,
                (select count(*)::int from public.program_application_allocations allocation
                 where allocation.partner_assignment_id = assignment.id
                   and allocation.organization_id = assignment.organization_id
                   and allocation.status in ('reserved','allocated')) allocated_applications
         from public.program_partner_assignments assignment
         join public.programs program
           on program.id = assignment.program_id and program.organization_id = assignment.organization_id
         left join public.program_delivery_areas area
           on area.id = assignment.delivery_area_id and area.organization_id = assignment.organization_id
         where assignment.partner_contact_id = $1 and assignment.organization_id = $2
         order by assignment.created_at desc`,
        values,
      );
      statement.partnerFulfillments = await rows(
        client,
        `select program.name program_name,
                count(*)::int fulfillment_count,
                coalesce(sum(fulfillment.package_count), 0)::int package_count
         from public.program_beneficiary_fulfillments fulfillment
         join public.programs program
           on program.id = fulfillment.program_id and program.organization_id = fulfillment.organization_id
         where fulfillment.partner_contact_id = $1 and fulfillment.organization_id = $2
           and fulfillment.status = 'active'
         group by program.name
         order by program.name`,
        values,
      );
    }

    if (can(context, "programs.read", "distributions.read")) {
      sections.push("supported_program_impact");
      statement.supportedPrograms = await rows(
        client,
        `with supported as (
           select restriction.program_id
           from public.fund_receipts receipt
           join public.fund_restrictions restriction
             on restriction.id = receipt.restriction_id and restriction.organization_id = receipt.organization_id
           where receipt.donor_contact_id = $1 and receipt.organization_id = $2
             and receipt.status = 'posted' and restriction.program_id is not null
           union
           select donation.program_id from public.in_kind_donations donation
           where donation.donor_contact_id = $1 and donation.organization_id = $2
             and donation.program_id is not null
           union
           select assignment.program_id from public.program_partner_assignments assignment
           where assignment.partner_contact_id = $1 and assignment.organization_id = $2
         )
         select program.id, program.code, program.name, program.status,
                program.target_beneficiary_count,
                count(distinct plan.id) filter (where plan.status = 'completed')::int completed_distributions,
                count(distinct plan.beneficiary_contact_id) filter (where plan.status = 'completed')::int beneficiaries_reached,
                coalesce(sum(plan.amount) filter (where plan.status = 'completed'), 0)::text distributed_amount
         from supported
         join public.programs program on program.id = supported.program_id and program.organization_id = $2
         left join public.distribution_plans plan
           on plan.program_id = program.id and plan.organization_id = program.organization_id
         group by program.id
         order by program.name`,
        values,
      );
    }

    const sum = (list: unknown, field: string, statusField?: string, okStatus?: string) =>
      (Array.isArray(list) ? (list as Row[]) : [])
        .filter((row) => !statusField || row[statusField] === okStatus)
        .reduce((total, row) => total + Number(row[field] ?? 0), 0)
        .toFixed(2);

    statement.totals = {
      cashGiven: sum(statement.cashReceipts, "amount", "status", "posted"),
      inKindValue: sum(statement.inKindDonations, "estimated_total_value"),
      waqfGiven: sum(statement.waqfContributions, "amount", "status", "received"),
    };
    statement.generatedAt = new Date().toISOString();
    return statement;
  });
}

/**
 * Ringkasan per peran untuk laporan umum: donatur & wakif teratas, mitra
 * penyalur, dan pengaju (individu maupun lembaga) dalam periode tertentu.
 */
export async function listStakeholderSummary(
  context: RequestContext,
  query: StakeholderListQuery,
) {
  requirePermission(context, "stakeholder_reports.read");
  const period = resolveReportPeriod(query.range);

  return withTenantTransaction(context, async (_database, client) => {
    const org = context.organizationId;
    const range = [org, period.from, period.to];
    const result: Record<string, unknown> = {
      period: { ...period, range: query.range },
    };

    if (query.role === "donor") {
      requirePermission(context, "fund_receipts.read");
      result.data = await rows(
        client,
        `with giving as (
           select receipt.donor_contact_id contact_id, receipt.amount cash, 0::numeric goods, 0::numeric waqf, 1 cash_count, 0 goods_count, 0 waqf_count
           from public.fund_receipts receipt
           where receipt.organization_id = $1 and receipt.status = 'posted'
             and receipt.donor_contact_id is not null and receipt.received_at between $2 and $3
           union all
           select donation.donor_contact_id, 0, donation.estimated_total_value, 0, 0, 1, 0
           from public.in_kind_donations donation
           where donation.organization_id = $1 and donation.donor_contact_id is not null
             and donation.received_at between $2 and $3
           union all
           select contribution.wakif_contact_id, 0, 0, contribution.amount, 0, 0, 1
           from public.waqf_contributions contribution
           where contribution.organization_id = $1 and contribution.status = 'received'
             and contribution.wakif_contact_id is not null and contribution.received_at between $2 and $3
         )
         select contact.id, contact.display_name, contact.contact_type,
                sum(giving.cash)::text cash_amount, sum(giving.goods)::text goods_value,
                sum(giving.waqf)::text waqf_amount,
                (sum(giving.cash) + sum(giving.goods) + sum(giving.waqf))::text total_value,
                sum(giving.cash_count)::int cash_count, sum(giving.goods_count)::int goods_count,
                sum(giving.waqf_count)::int waqf_count
         from giving
         join public.crm_contacts contact on contact.id = giving.contact_id and contact.organization_id = $1
         group by contact.id
         order by sum(giving.cash) + sum(giving.goods) + sum(giving.waqf) desc
         limit 100`,
        range,
      );
      const anonymous = await rows(
        client,
        `select
           coalesce((select sum(amount) from public.fund_receipts where organization_id = $1 and status = 'posted' and donor_contact_id is null and received_at between $2 and $3), 0)::text cash_amount,
           coalesce((select sum(estimated_total_value) from public.in_kind_donations where organization_id = $1 and donor_contact_id is null and received_at between $2 and $3), 0)::text goods_value,
           coalesce((select sum(amount) from public.waqf_contributions where organization_id = $1 and status = 'received' and wakif_contact_id is null and received_at between $2 and $3), 0)::text waqf_amount`,
        range,
      );
      result.anonymous = anonymous[0];
    } else if (query.role === "distribution_partner") {
      requirePermission(context, "programs.read");
      result.data = await rows(
        client,
        `select contact.id, contact.display_name, contact.city,
                count(distinct assignment.program_id)::int program_count,
                count(distinct assignment.id) filter (where assignment.status = 'active')::int active_assignments,
                count(distinct assignment.id) filter (where assignment.readiness_status in ('ready','accepted'))::int ready_assignments,
                (select count(*)::int from public.program_beneficiary_fulfillments fulfillment
                 where fulfillment.partner_contact_id = contact.id and fulfillment.organization_id = $1
                   and fulfillment.status = 'active' and fulfillment.created_at between $2 and $3) fulfillments,
                (select coalesce(sum(fulfillment.package_count), 0)::int from public.program_beneficiary_fulfillments fulfillment
                 where fulfillment.partner_contact_id = contact.id and fulfillment.organization_id = $1
                   and fulfillment.status = 'active' and fulfillment.created_at between $2 and $3) packages
         from public.crm_contacts contact
         join public.crm_contact_roles role
           on role.contact_id = contact.id and role.organization_id = contact.organization_id
          and role.role_type = 'distribution_partner' and role.status = 'active'
         left join public.program_partner_assignments assignment
           on assignment.partner_contact_id = contact.id and assignment.organization_id = contact.organization_id
         where contact.organization_id = $1
         group by contact.id
         order by fulfillments desc, contact.display_name
         limit 100`,
        range,
      );
    } else {
      requirePermission(context, "applications.read");
      result.data = await rows(
        client,
        `select contact.id, contact.display_name, contact.contact_type,
                count(distinct application.id)::int applications,
                count(distinct application.id) filter (where application.submitting_partner_contact_id = contact.id)::int on_behalf_applications,
                count(distinct application.id) filter (where application.status in ('accepted','converted'))::int accepted,
                count(distinct application.id) filter (where application.status = 'rejected')::int rejected,
                count(distinct application.id) filter (where application.status in ('draft','submitted','in_screening'))::int in_progress,
                coalesce(sum(application.beneficiary_count), 0)::int beneficiaries,
                (select count(*)::int from public.waqf_proposals proposal
                 where proposal.proposer_contact_id = contact.id and proposal.organization_id = $1
                   and proposal.created_at between $2 and $3) waqf_proposals
         from public.crm_contacts contact
         join public.aid_applications application
           on application.organization_id = contact.organization_id
          and (application.applicant_contact_id = contact.id or application.submitting_partner_contact_id = contact.id)
          and application.created_at between $2 and $3
         where contact.organization_id = $1
         group by contact.id
         order by applications desc
         limit 100`,
        range,
      );
    }

    return result;
  });
}
