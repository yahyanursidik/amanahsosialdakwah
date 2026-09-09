import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type { CreateInitialProgramPlanInput } from "../routes/program-initial-plan-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { getIndonesiaRegencyLocations } from "./indonesia-region-reference-service";
import { requirePermission } from "./request-authorization";

type PlanningRow = {
  id?: string;
  [key: string]: unknown;
};

type QueryClient = {
  query: (
    query: string,
    values?: unknown[],
  ) => Promise<{ rows: PlanningRow[] }>;
};

function requirePlanningAccess(context: RequestContext) {
  requirePermission(context, "programs.manage");
  requirePermission(context, "crm_contacts.read");
  requirePermission(context, "inventory_products.read");
}

function requireCreateAccess(
  context: RequestContext,
  hasPartnerAssignments: boolean,
) {
  requirePermission(context, "programs.manage");
  requirePermission(context, "inventory_products.read");
  requirePermission(context, "program_goods_plan.manage");
  if (hasPartnerAssignments) {
    requirePermission(context, "crm_contacts.read");
  }
}

async function assertGoodsPlanProducts(
  client: QueryClient,
  context: RequestContext,
  items: CreateInitialProgramPlanInput["goods_plan_items"],
) {
  const products = new Map<string, PlanningRow>();

  for (const item of items) {
    const result = await client.query(
      `select id, base_unit
       from public.inventory_products
       where id = $1 and organization_id = $2 and status = 'active'
       for share`,
      [item.product_id, context.organizationId],
    );
    const product = result.rows[0];
    if (!product) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Salah satu produk tidak aktif atau bukan milik organisasi aktif.",
        400,
      );
    }
    products.set(item.product_id, product);
  }

  return products;
}

function areaCode(city: string, position: number): string {
  const prefix = city
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 20);
  return `${prefix || "AREA"}-${String(position + 1).padStart(2, "0")}`;
}

function notFound(message: string): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

async function assertCategory(
  client: QueryClient,
  context: RequestContext,
  categoryId: string,
) {
  const category = await client.query(
    `select id from public.program_categories
     where id = $1 and status = 'active'
       and (organization_id = $2 or organization_id is null)`,
    [categoryId, context.organizationId],
  );
  if (!category.rows[0]) {
    notFound("Kategori Program aktif tidak ditemukan pada organisasi ini.");
  }
}

async function assertPartner(
  client: QueryClient,
  context: RequestContext,
  partnerContactId: string,
) {
  const partner = await client.query(
    `select contact.id from public.crm_contacts contact
     join public.crm_contact_roles role
       on role.contact_id = contact.id and role.organization_id = contact.organization_id
     where contact.id = $1 and contact.organization_id = $2
       and contact.status = 'active'
       and role.role_type = 'distribution_partner' and role.status = 'active'`,
    [partnerContactId, context.organizationId],
  );
  if (!partner.rows[0]) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Pilih mitra aktif yang telah memiliki peran mitra penyaluran.",
      400,
    );
  }
}

function normalizedName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function resolvePartnerContact(
  database: Parameters<typeof insertAuditEvent>[0],
  client: QueryClient,
  context: RequestContext,
  assignment: CreateInitialProgramPlanInput["partner_assignments"][number],
): Promise<string> {
  if (assignment.partner_contact_id) {
    await assertPartner(client, context, assignment.partner_contact_id);
    return assignment.partner_contact_id;
  }

  const partnerOrganizationId = assignment.partner_organization_id;
  if (!partnerOrganizationId) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Pilih mitra aktif yang telah terdaftar.",
      400,
    );
  }

  // Lock the relationship for this transaction. It prevents two simultaneous
  // program submissions from materializing separate contact masters for one
  // partner organization.
  const relationship = await client.query(
    `select target.id, target.name, target.legal_name
     from public.organization_relationships relationship
     join public.organizations target on target.id = relationship.target_organization_id
     where relationship.source_organization_id = $1
       and relationship.target_organization_id = $2
       and relationship.relationship_type = 'distribution_partner'
       and relationship.status = 'active'
       and target.status = 'active'
     for update of relationship`,
    [context.organizationId, partnerOrganizationId],
  );
  const organization = relationship.rows[0];
  if (!organization) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Mitra lembaga tidak aktif atau tidak terhubung dengan organisasi ini.",
      400,
    );
  }

  const registrationReference = `organization:${partnerOrganizationId}`;
  const existing = await client.query(
    `select contact.id, contact.status
     from public.crm_institution_profiles institution
     join public.crm_contacts contact
       on contact.id = institution.contact_id
      and contact.organization_id = institution.organization_id
     where institution.organization_id = $1
       and institution.registration_reference = $2
     limit 1
     for update of contact`,
    [context.organizationId, registrationReference],
  );
  const existingContact = existing.rows[0];
  if (existingContact?.id) {
    if (existingContact.status !== "active") {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Contact master untuk lembaga mitra ini tidak aktif. Aktifkan kembali contact tersebut sebelum membuat penugasan.",
        400,
      );
    }
    await client.query(
      `insert into public.crm_contact_roles (
         organization_id, contact_id, role_type, status, started_at, created_by
       ) values ($1,$2,'distribution_partner','active',now(),$3)
       on conflict (contact_id, organization_id, role_type) do update
         set status = 'active', ended_at = null, updated_at = now()`,
      [context.organizationId, existingContact.id, context.profileId],
    );
    return existingContact.id;
  }

  const name = String(organization.name ?? "").trim();
  if (!name) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Nama lembaga mitra belum lengkap.",
      400,
    );
  }

  const contactResult = await client.query(
    `insert into public.crm_contacts (
       organization_id, contact_type, display_name, legal_name, normalized_name,
       status, notes, created_by
     ) values ($1,'institution',$2,$3,$4,'active',$5,$6)
     returning *`,
    [
      context.organizationId,
      name,
      String(organization.legal_name ?? name).trim() || null,
      normalizedName(name),
      "Contact master dibuat dari relasi lembaga mitra penyaluran.",
      context.profileId,
    ],
  );
  const contact = contactResult.rows[0];
  if (!contact?.id) {
    throw new DomainError(
      "INTERNAL_ERROR",
      "Contact master mitra gagal dibuat.",
      500,
    );
  }

  await client.query(
    `insert into public.crm_institution_profiles (
       organization_id, contact_id, institution_type, registration_reference,
       status, created_by
     ) values ($1,$2,'other',$3,'active',$4)`,
    [
      context.organizationId,
      contact.id,
      registrationReference,
      context.profileId,
    ],
  );
  await client.query(
    `insert into public.crm_contact_roles (
       organization_id, contact_id, role_type, status, started_at, created_by
     ) values ($1,$2,'distribution_partner','active',now(),$3)`,
    [context.organizationId, contact.id, context.profileId],
  );
  await insertAuditEvent(database, context, {
    action: "crm.partner_contact_materialized",
    after: {
      contact_id: contact.id,
      partner_organization_id: partnerOrganizationId,
      registration_reference: registrationReference,
    },
    entityId: contact.id,
    entityType: "crm_contact",
  });

  return contact.id;
}

export async function getProgramPlanningOptions(context: RequestContext) {
  requirePlanningAccess(context);

  const nationalLocations = getIndonesiaRegencyLocations();
  return withTenantTransaction(context, async (_database, client) => {
    const [
      contactPartners,
      organizationPartners,
      organizationLocations,
      indonesiaLocations,
      inventoryProducts,
    ] = await Promise.all([
      client.query(
        `select distinct contact.id, contact.display_name, contact.primary_phone,
                contact.city, contact.province
         from public.crm_contacts contact
         join public.crm_contact_roles role
           on role.contact_id = contact.id and role.organization_id = contact.organization_id
         where contact.organization_id = $1 and contact.status = 'active'
           and role.role_type = 'distribution_partner' and role.status = 'active'
         order by contact.display_name asc`,
        [context.organizationId],
      ),
      client.query(
        `select target.id, target.name as display_name, null::text as primary_phone,
                null::text as city, null::text as province
           from public.organization_relationships relationship
           join public.organizations target
             on target.id = relationship.target_organization_id
           where relationship.source_organization_id = $1
             and relationship.relationship_type = 'distribution_partner'
             and relationship.status = 'active'
             and target.status = 'active'
           order by target.name asc`,
        [context.organizationId],
      ),
      client.query(
        `select distinct city, province from (
           select city, province from public.crm_contacts
           where organization_id = $1 and city is not null and province is not null
           union
           select city, province from public.program_delivery_areas
           where organization_id = $1 and city is not null and province is not null
         ) as known_locations
         order by province asc, city asc`,
        [context.organizationId],
      ),
      nationalLocations,
      client.query(
        `select product.id, product.sku, product.name, product.base_unit,
                coalesce(category.name, nullif(product.category, ''), 'Tanpa kategori') as category_name
         from public.inventory_products product
         left join public.inventory_product_categories category
           on category.id = product.category_id
          and category.organization_id = product.organization_id
         where product.organization_id = $1 and product.status = 'active'
         order by category_name asc, product.name asc`,
        [context.organizationId],
      ),
    ]);

    const locations = new Map<string, PlanningRow>();
    for (const location of [
      ...indonesiaLocations,
      ...organizationLocations.rows,
    ]) {
      const city = String(location.city ?? "").trim();
      const province = String(location.province ?? "").trim();
      if (!city || !province) continue;
      locations.set(
        `${city.toLocaleLowerCase("id")}|${province.toLocaleLowerCase("id")}`,
        { city, province },
      );
    }

    return {
      locations: [...locations.values()].sort((left, right) =>
        String(left.city).localeCompare(String(right.city), "id"),
      ),
      partners: [
        ...contactPartners.rows.map((partner) => ({
          ...partner,
          kind: "contact" as const,
        })),
        ...organizationPartners.rows.map((partner) => ({
          ...partner,
          kind: "organization" as const,
        })),
      ].sort((left, right) =>
        String(left.display_name).localeCompare(
          String(right.display_name),
          "id",
        ),
      ),
      products: inventoryProducts.rows,
    };
  });
}

export async function createInitialProgramPlan(
  context: RequestContext,
  input: CreateInitialProgramPlanInput,
) {
  requireCreateAccess(context, input.partner_assignments.length > 0);
  const goodsPlanTotal = input.goods_plan_items.reduce(
    (total, item) => total + item.quantity * item.unit_value,
    0,
  );
  const totalBudget =
    input.cash_budget_amount + goodsPlanTotal + input.logistics_budget_amount;

  try {
    return await withTenantTransaction(context, async (database, client) => {
      await assertCategory(client, context, input.category_id);
      const products = await assertGoodsPlanProducts(
        client,
        context,
        input.goods_plan_items,
      );

      const programResult = await client.query(
        `insert into public.programs (
           organization_id, code, name, category_id, description, objective,
           target_beneficiary_type, target_beneficiary_count, budget_amount,
           support_modes, cash_budget_amount, goods_budget_amount,
           logistics_budget_amount, allocated_amount, disbursed_amount,
           fund_type, status, starts_at, ends_at, created_by
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,0,$14,'draft',$15,$16,$17
         ) returning *`,
        [
          context.organizationId,
          input.code,
          input.name,
          input.category_id,
          input.description ?? null,
          input.objective ?? null,
          input.target_beneficiary_type,
          input.target_beneficiary_count,
          totalBudget,
          input.support_modes,
          input.cash_budget_amount,
          goodsPlanTotal,
          input.logistics_budget_amount,
          input.fund_type,
          input.starts_at ?? null,
          input.ends_at ?? null,
          context.profileId,
        ],
      );
      const program = programResult.rows[0];
      if (!program?.id) {
        throw new DomainError("INTERNAL_ERROR", "Program gagal dibuat.", 500);
      }

      const goodsPlanItems: PlanningRow[] = [];
      for (const [index, item] of input.goods_plan_items.entries()) {
        const product = products.get(item.product_id);
        const result = await client.query(
          `insert into public.program_goods_plan_items (
             organization_id, program_id, product_id, quantity, unit, unit_value,
             notes, sort_order, created_by, updated_by
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
           returning *`,
          [
            context.organizationId,
            program.id,
            item.product_id,
            item.quantity,
            String(product?.base_unit ?? ""),
            item.unit_value,
            item.notes ?? null,
            index,
            context.profileId,
          ],
        );
        const record = result.rows[0];
        if (!record?.id) {
          throw new DomainError(
            "INTERNAL_ERROR",
            "Rencana barang Program gagal dibuat.",
            500,
          );
        }
        goodsPlanItems.push(record);
        await insertAuditEvent(database, context, {
          action: "program.goods_plan_item_created",
          after: record,
          entityId: record.id,
          entityType: "program_goods_plan_item",
        });
      }

      const deliveryAreas: PlanningRow[] = [];
      const areaIdByClientId = new Map<string, string>();
      for (const [index, area] of input.delivery_areas.entries()) {
        const result = await client.query(
          `insert into public.program_delivery_areas (
             organization_id, program_id, code, name, address_line, village,
             district, city, province, postal_code, quota_capacity, notes,
             created_by, updated_by
           ) values (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13
           ) returning *`,
          [
            context.organizationId,
            program.id,
            areaCode(area.city, index),
            area.name,
            area.address_line,
            area.village ?? null,
            area.district ?? null,
            area.city,
            area.province,
            area.postal_code ?? null,
            area.quota_capacity,
            area.notes ?? null,
            context.profileId,
          ],
        );
        const record = result.rows[0];
        if (!record?.id) {
          throw new DomainError(
            "INTERNAL_ERROR",
            "Area penyaluran gagal dibuat.",
            500,
          );
        }
        areaIdByClientId.set(area.client_id, record.id);
        deliveryAreas.push(record);
        await insertAuditEvent(database, context, {
          action: "program.delivery_area_created",
          after: record,
          entityId: record.id,
          entityType: "program_delivery_area",
        });
      }

      const partnerAssignments: PlanningRow[] = [];
      for (const assignment of input.partner_assignments) {
        const partnerContactId = await resolvePartnerContact(
          database,
          client,
          context,
          assignment,
        );
        const deliveryAreaId = assignment.delivery_area_client_id
          ? areaIdByClientId.get(assignment.delivery_area_client_id)
          : undefined;
        if (assignment.delivery_area_client_id && !deliveryAreaId) {
          notFound("Area yang dipilih untuk mitra tidak ditemukan.");
        }

        const result = await client.query(
          `insert into public.program_partner_assignments (
             organization_id, program_id, delivery_area_id, partner_contact_id,
             assignment_role, pic_name, pic_phone, readiness_status, notes,
             created_by, updated_by
           ) values (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10
           ) returning *`,
          [
            context.organizationId,
            program.id,
            deliveryAreaId ?? null,
            partnerContactId,
            assignment.assignment_role,
            assignment.pic_name ?? null,
            assignment.pic_phone ?? null,
            assignment.readiness_status,
            assignment.notes ?? null,
            context.profileId,
          ],
        );
        const record = result.rows[0];
        if (!record?.id) {
          throw new DomainError(
            "INTERNAL_ERROR",
            "Penugasan mitra gagal dibuat.",
            500,
          );
        }
        partnerAssignments.push(record);
        await insertAuditEvent(database, context, {
          action: "program.partner_assigned",
          after: record,
          entityId: record.id,
          entityType: "program_partner_assignment",
        });
      }

      const revision = await client.query(
        `insert into public.program_revisions (
           organization_id, program_id, action_type, change_summary, new_values,
           performed_by, created_by
         ) values ($1,$2,'created',$3,$4::jsonb,$5,$5) returning id`,
        [
          context.organizationId,
          program.id,
          `Program draft dibuat dengan ${deliveryAreas.length} area penyaluran dan ${partnerAssignments.length} mitra penyaluran.`,
          JSON.stringify({
            delivery_area_count: deliveryAreas.length,
            goods_plan_item_count: goodsPlanItems.length,
            partner_assignment_count: partnerAssignments.length,
            total_budget: totalBudget,
          }),
          context.profileId,
        ],
      );

      await insertAuditEvent(database, context, {
        action: "program.created",
        after: {
          ...program,
          delivery_area_count: deliveryAreas.length,
          goods_plan_item_count: goodsPlanItems.length,
          partner_assignment_count: partnerAssignments.length,
          revision_id: revision.rows[0]?.id ?? null,
        },
        entityId: program.id,
        entityType: "program",
      });

      return { deliveryAreas, goodsPlanItems, partnerAssignments, program };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError(
        "CONFLICT",
        "Kode Program sudah digunakan pada organisasi aktif.",
        409,
      );
    }
    throw error;
  }
}
