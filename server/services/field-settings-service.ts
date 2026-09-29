import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import {
  defaultFieldSettings,
  defaultTemplateItems,
  expandTemplate,
  type FieldSettings,
  type FieldTaskType,
  type TemplateItem,
} from "../domain/field-task-rules";
import type {
  ChecklistPreviewInput,
  FieldSettingsInput,
  FieldTemplateInput,
} from "../routes/field-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

const settingKeys = Object.keys(defaultFieldSettings) as Array<keyof FieldSettings>;

/** Aturan organisasi; nilai bawaan dipakai bila admin belum mengatur. */
export async function loadFieldSettings(
  client: PoolClient,
  organizationId: string,
): Promise<FieldSettings> {
  const row = (
    await client.query<FieldSettings>(
      `select ${settingKeys.join(", ")} from public.field_settings where organization_id = $1`,
      [organizationId],
    )
  ).rows[0];
  return { ...defaultFieldSettings, ...(row ?? {}) };
}

function requireAnyFieldAccess(context: RequestContext) {
  if (
    !["field_settings.read", "field_reports.submit", "field_tasks.read"].some((key) =>
      context.permissions.has(key),
    )
  ) {
    requirePermission(context, "field_settings.read");
  }
}

export async function getFieldSettings(context: RequestContext) {
  requireAnyFieldAccess(context);
  return withTenantTransaction(context, async (_database, client) => {
    const settings = await loadFieldSettings(client, context.organizationId);
    const meta = (
      await client.query<{ updated_at: string; updated_by_name: string | null }>(
        `select settings.updated_at, profile.display_name as updated_by_name
         from public.field_settings settings
         left join public.profiles profile on profile.id = settings.updated_by
         where settings.organization_id = $1`,
        [context.organizationId],
      )
    ).rows[0];
    return { ...settings, updated_at: meta?.updated_at ?? null, updated_by_name: meta?.updated_by_name ?? null };
  });
}

export async function updateFieldSettings(context: RequestContext, input: FieldSettingsInput) {
  requirePermission(context, "field_settings.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = await loadFieldSettings(client, context.organizationId);
    const values = settingKeys.map((key) => input[key]);
    await client.query(
      `insert into public.field_settings (organization_id, ${settingKeys.join(", ")}, updated_by)
       values ($1, ${settingKeys.map((_, index) => `$${index + 2}`).join(", ")}, $${settingKeys.length + 2})
       on conflict (organization_id) do update set
         ${settingKeys.map((key) => `${key} = excluded.${key}`).join(", ")},
         updated_by = excluded.updated_by`,
      [context.organizationId, ...values, context.profileId],
    );
    await insertAuditEvent(database, context, {
      action: "field_settings.updated",
      after: input,
      before,
      entityId: context.organizationId,
      entityType: "field_settings",
    });
    return loadFieldSettings(client, context.organizationId);
  });
}

function requireTemplateRead(context: RequestContext) {
  if (!context.permissions.has("field_tasks.manage")) {
    requirePermission(context, "field_settings.read");
  }
}

export async function listFieldTemplates(context: RequestContext, taskType?: string) {
  requireTemplateRead(context);
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const typeFilter = taskType ? `and template.task_type = $${values.push(taskType)}` : "";
    const rows = await client.query<Row>(
      `select template.id, template.name, template.description, template.task_type,
              template.program_id, template.is_default, template.status, template.updated_at,
              program.name as program_name,
              (select count(*)::int from public.field_checklist_template_items item
               where item.template_id = template.id and item.organization_id = template.organization_id) as item_count,
              (select count(*)::int from public.field_tasks task
               where task.template_id = template.id and task.organization_id = template.organization_id) as usage_count
       from public.field_checklist_templates template
       left join public.programs program
         on program.id = template.program_id and program.organization_id = template.organization_id
       where template.organization_id = $1 ${typeFilter}
       order by template.status, template.task_type, template.is_default desc, template.name`,
      values,
    );
    return rows.rows;
  });
}

async function loadTemplateItems(client: PoolClient, organizationId: string, templateId: string) {
  return (
    await client.query<TemplateItem & { id: string; sequence_number: number }>(
      `select id, sequence_number, item_kind, label, hint, is_required, applies_to
       from public.field_checklist_template_items
       where template_id = $1 and organization_id = $2
       order by sequence_number`,
      [templateId, organizationId],
    )
  ).rows;
}

export async function getFieldTemplate(context: RequestContext, id: string) {
  requireTemplateRead(context);
  return withTenantTransaction(context, async (_database, client) => {
    const template = (
      await client.query<Row>(
        `select template.*, program.name as program_name
         from public.field_checklist_templates template
         left join public.programs program
           on program.id = template.program_id and program.organization_id = template.organization_id
         where template.id = $1 and template.organization_id = $2`,
        [id, context.organizationId],
      )
    ).rows[0] ?? missing("Template ceklis tidak ditemukan.");
    return { ...template, items: await loadTemplateItems(client, context.organizationId, id) };
  });
}

/** Template bawaan sistem untuk jenis tugas (titik awal template baru). */
export function builtInTemplate(taskType: FieldTaskType) {
  return { items: defaultTemplateItems(taskType), task_type: taskType };
}

async function clearOtherDefaults(
  client: PoolClient,
  context: RequestContext,
  input: FieldTemplateInput,
  exceptId: string | null,
) {
  if (!input.is_default) return;
  await client.query(
    `update public.field_checklist_templates
     set is_default = false, updated_by = $1
     where organization_id = $2 and task_type = $3
       and program_id is not distinct from $4::uuid
       and is_default and status = 'active'
       and ($5::uuid is null or id <> $5::uuid)`,
    [context.profileId, context.organizationId, input.task_type, input.program_id ?? null, exceptId],
  );
}

async function replaceItems(
  client: PoolClient,
  context: RequestContext,
  templateId: string,
  items: FieldTemplateInput["items"],
) {
  await client.query(
    `delete from public.field_checklist_template_items where template_id = $1 and organization_id = $2`,
    [templateId, context.organizationId],
  );
  for (const [index, item] of items.entries()) {
    await client.query(
      `insert into public.field_checklist_template_items (
         organization_id, template_id, sequence_number, item_kind, label, hint, is_required, applies_to
       ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        context.organizationId,
        templateId,
        index + 1,
        item.item_kind,
        item.label,
        item.hint ?? null,
        item.is_required,
        item.applies_to,
      ],
    );
  }
}

function fkError(error: unknown): never {
  if ((error as { code?: string }).code === "23503") {
    throw new DomainError("VALIDATION_ERROR", "Program tidak ditemukan di organisasi ini.", 400);
  }
  throw error;
}

export async function createFieldTemplate(context: RequestContext, input: FieldTemplateInput) {
  requirePermission(context, "field_settings.manage");
  return withTenantTransaction(context, async (database, client) => {
    await clearOtherDefaults(client, context, input, null);
    const created = await client
      .query<Row>(
        `insert into public.field_checklist_templates (
           organization_id, name, description, task_type, program_id, is_default, created_by, updated_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$7) returning id`,
        [
          context.organizationId,
          input.name,
          input.description ?? null,
          input.task_type,
          input.program_id ?? null,
          input.is_default,
          context.profileId,
        ],
      )
      .catch(fkError);
    const id = created.rows[0]?.id ?? missing("Template gagal dibuat.");
    await replaceItems(client, context, id, input.items);
    await insertAuditEvent(database, context, {
      action: "field_template.created",
      after: input,
      entityId: id,
      entityType: "field_checklist_template",
    });
    return { id };
  });
}

export async function updateFieldTemplate(
  context: RequestContext,
  id: string,
  input: FieldTemplateInput,
) {
  requirePermission(context, "field_settings.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = (
      await client.query<Row>(
        `select * from public.field_checklist_templates where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      )
    ).rows[0] ?? missing("Template ceklis tidak ditemukan.");
    await clearOtherDefaults(client, context, input, id);
    await client
      .query(
        `update public.field_checklist_templates
         set name = $1, description = $2, task_type = $3, program_id = $4, is_default = $5,
             status = 'active', updated_by = $6
         where id = $7 and organization_id = $8`,
        [
          input.name,
          input.description ?? null,
          input.task_type,
          input.program_id ?? null,
          input.is_default,
          context.profileId,
          id,
          context.organizationId,
        ],
      )
      .catch(fkError);
    await replaceItems(client, context, id, input.items);
    await insertAuditEvent(database, context, {
      action: "field_template.updated",
      after: input,
      before,
      entityId: id,
      entityType: "field_checklist_template",
    });
    return { id };
  });
}

export async function archiveFieldTemplate(context: RequestContext, id: string) {
  requirePermission(context, "field_settings.manage");
  return withTenantTransaction(context, async (database, client) => {
    const updated = await client.query<Row>(
      `update public.field_checklist_templates
       set status = 'archived', is_default = false, updated_by = $1
       where id = $2 and organization_id = $3 returning id`,
      [context.profileId, id, context.organizationId],
    );
    if (!updated.rows[0]) missing("Template ceklis tidak ditemukan.");
    await insertAuditEvent(database, context, {
      action: "field_template.archived",
      entityId: id,
      entityType: "field_checklist_template",
    });
    return { id, status: "archived" };
  });
}

export type ResolvedTemplate = {
  items: TemplateItem[];
  source: "builtin" | "organization";
  templateId: string | null;
  templateName: string;
};

/**
 * Menentukan template untuk tugas baru: pilihan eksplisit, lalu template
 * bawaan program, lalu template bawaan organisasi, lalu template sistem.
 */
export async function resolveTemplate(
  client: PoolClient,
  organizationId: string,
  input: { programId?: string | null; taskType: FieldTaskType; templateId?: string | null },
): Promise<ResolvedTemplate> {
  let template: { id: string; name: string } | undefined;
  if (input.templateId) {
    template = (
      await client.query<{ id: string; name: string }>(
        `select id, name from public.field_checklist_templates
         where id = $1 and organization_id = $2 and status = 'active' and task_type = $3`,
        [input.templateId, organizationId, input.taskType],
      )
    ).rows[0];
    if (!template) {
      throw new DomainError("VALIDATION_ERROR", "Template ceklis tidak aktif atau tidak cocok dengan jenis tugas.", 400);
    }
  } else {
    template = (
      await client.query<{ id: string; name: string }>(
        `select id, name from public.field_checklist_templates
         where organization_id = $1 and task_type = $2 and status = 'active' and is_default
           and (program_id = $3::uuid or program_id is null)
         order by (program_id is null), updated_at desc
         limit 1`,
        [organizationId, input.taskType, input.programId ?? null],
      )
    ).rows[0];
  }
  if (!template) {
    return {
      items: defaultTemplateItems(input.taskType),
      source: "builtin",
      templateId: null,
      templateName: "Bawaan sistem",
    };
  }
  return {
    items: await loadTemplateItems(client, organizationId, template.id),
    source: "organization",
    templateId: template.id,
    templateName: template.name,
  };
}

/** Pratinjau ceklis yang akan dibuat untuk tugas dengan masukan tertentu. */
export async function previewChecklist(context: RequestContext, input: ChecklistPreviewInput) {
  requirePermission(context, "field_tasks.manage");
  return withTenantTransaction(context, async (_database, client) => {
    const settings = await loadFieldSettings(client, context.organizationId);
    const resolved = await resolveTemplate(client, context.organizationId, {
      programId: input.program_id ?? null,
      taskType: input.task_type,
      templateId: input.template_id ?? null,
    });
    const items = expandTemplate(resolved.items, {
      beneficiaryName: null,
      cashAmount: input.cash_amount ?? null,
      customItems: input.custom_items,
      goodsPackageCount: input.goods_package_count ?? null,
      goodsSummary: input.goods_summary ?? null,
      requireReport: settings.require_report_to_complete,
      supportModes: input.task_type === "distribution" ? input.support_modes : [],
      taskType: input.task_type,
    });
    return {
      items,
      source: resolved.source,
      template_id: resolved.templateId,
      template_name: resolved.templateName,
    };
  });
}
