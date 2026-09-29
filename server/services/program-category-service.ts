import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type { ProgramCategoryInput } from "../routes/program-category-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

/** Kode kategori dari nama: huruf besar, tanpa spasi, maks. 30 karakter. */
export function categoryCodeFromName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "KATEGORI"
  );
}

export async function listProgramCategories(context: RequestContext) {
  requirePermission(context, "program_categories.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select category.id, category.code, category.name, category.description, category.status,
              category.organization_id is null as is_global, category.updated_at,
              (select count(*)::int from public.programs program
               where program.category_id = category.id and program.organization_id = $1) as program_count
       from public.program_categories category
       where category.organization_id = $1 or category.organization_id is null
       order by category.status, category.name`,
      [context.organizationId],
    );
    return result.rows;
  });
}

function duplicate(error: unknown): never {
  if ((error as { code?: string }).code === "23505") {
    throw new DomainError("CONFLICT", "Kode kategori sudah dipakai. Gunakan kode lain.", 409);
  }
  throw error;
}

export async function createProgramCategory(context: RequestContext, input: ProgramCategoryInput) {
  requirePermission(context, "program_categories.manage");
  return withTenantTransaction(context, async (database, client) => {
    const created = await client
      .query<Row>(
        `insert into public.program_categories (organization_id, code, name, description, status, created_by)
         values ($1, $2, $3, $4, $5, $6)
         returning id, code, name, description, status`,
        [
          context.organizationId,
          (input.code || categoryCodeFromName(input.name)).toUpperCase(),
          input.name,
          input.description ?? null,
          input.status,
          context.profileId,
        ],
      )
      .catch(duplicate);
    const category = created.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "program_category.created",
      after: category,
      entityId: category.id,
      entityType: "program_category",
    });
    return category;
  });
}

export async function updateProgramCategory(
  context: RequestContext,
  id: string,
  input: ProgramCategoryInput,
) {
  requirePermission(context, "program_categories.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = (
      await client.query<Row>(
        `select * from public.program_categories where id = $1 and organization_id = $2`,
        [id, context.organizationId],
      )
    ).rows[0];
    if (!before) {
      throw new DomainError("NOT_FOUND", "Kategori tidak ditemukan atau milik sistem.", 404);
    }
    const updated = await client
      .query<Row>(
        `update public.program_categories
         set code = $1, name = $2, description = $3, status = $4, updated_at = now()
         where id = $5 and organization_id = $6
         returning id, code, name, description, status`,
        [
          (input.code || String(before.code)).toUpperCase(),
          input.name,
          input.description ?? null,
          input.status,
          id,
          context.organizationId,
        ],
      )
      .catch(duplicate);
    await insertAuditEvent(database, context, {
      action: "program_category.updated",
      after: updated.rows[0],
      before,
      entityId: id,
      entityType: "program_category",
    });
    return updated.rows[0];
  });
}
