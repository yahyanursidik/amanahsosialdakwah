import { randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import {
  buildChecklist,
  canCompleteTask,
  type FieldTaskType,
} from "../domain/field-task-rules";
import type {
  CreateFieldTasksInput,
  FieldTaskListQuery,
} from "../routes/field-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

const reference = () =>
  `TGS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;

const taskSelect = `
  select task.*,
         -- tanggal polos (tanpa zona waktu) agar tenggat tidak bergeser sehari
         to_char(task.due_date, 'YYYY-MM-DD') as due_date,
         assignee.display_name as assignee_name,
         program.name as program_name, program.support_modes as program_support_modes,
         beneficiary.display_name as beneficiary_name,
         beneficiary.primary_phone as beneficiary_phone,
         plan.reference_number as distribution_reference,
         shipment.reference_number as shipment_reference,
         beneficiary_case.reference_number as case_reference,
         coalesce(progress.total, 0)::int as items_total,
         coalesce(progress.done, 0)::int as items_done,
         coalesce(progress.required_total, 0)::int as required_total,
         coalesce(progress.required_done, 0)::int as required_done
  from public.field_tasks task
  join public.profiles assignee on assignee.id = task.assigned_profile_id
  left join public.programs program on program.id = task.program_id and program.organization_id = task.organization_id
  left join public.crm_contacts beneficiary on beneficiary.id = task.beneficiary_contact_id and beneficiary.organization_id = task.organization_id
  left join public.distribution_plans plan on plan.id = task.distribution_plan_id and plan.organization_id = task.organization_id
  left join public.logistics_shipments shipment on shipment.id = task.shipment_id and shipment.organization_id = task.organization_id
  left join public.beneficiary_cases beneficiary_case on beneficiary_case.id = task.case_id and beneficiary_case.organization_id = task.organization_id
  left join lateral (
    select count(*) as total,
           count(*) filter (where item.is_done) as done,
           count(*) filter (where item.is_required) as required_total,
           count(*) filter (where item.is_required and item.is_done) as required_done
    from public.field_task_items item
    where item.task_id = task.id and item.organization_id = task.organization_id
  ) progress on true
`;

const priorityOrder = `case task.priority when 'urgent' then 0 when 'high' then 1 else 2 end`;

export async function listFieldTasks(
  context: RequestContext,
  query: FieldTaskListQuery,
) {
  requirePermission(context, "field_tasks.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["task.organization_id = $1"];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (query.mine || !context.permissions.has("field_tasks.manage")) {
      filters.push(`task.assigned_profile_id = ${add(context.profileId)}`);
    } else if (query.assigned_profile_id) {
      filters.push(`task.assigned_profile_id = ${add(query.assigned_profile_id)}`);
    }
    if (query.status === "open") filters.push(`task.status in ('todo','in_progress')`);
    else if (query.status) filters.push(`task.status = ${add(query.status)}`);
    if (query.program_id) filters.push(`task.program_id = ${add(query.program_id)}`);
    if (query.q) {
      const like = add(`%${query.q}%`);
      filters.push(
        `(task.title ilike ${like} or task.reference_number ilike ${like} or beneficiary.display_name ilike ${like})`,
      );
    }
    const where = filters.join(" and ");
    const total = await client.query<{ total: number }>(
      `select count(*)::int as total from public.field_tasks task
       left join public.crm_contacts beneficiary on beneficiary.id = task.beneficiary_contact_id and beneficiary.organization_id = task.organization_id
       where ${where}`,
      values,
    );
    const limit = add(query.pageSize);
    const offset = add((query.page - 1) * query.pageSize);
    const rows = await client.query<Row>(
      `${taskSelect} where ${where}
       order by case task.status when 'in_progress' then 0 when 'todo' then 1 when 'done' then 2 else 3 end,
                ${priorityOrder}, task.due_date nulls last, task.created_at
       limit ${limit} offset ${offset}`,
      values,
    );
    return {
      data: rows.rows,
      page: query.page,
      pageSize: query.pageSize,
      total: total.rows[0]?.total ?? 0,
    };
  });
}

/** Tugas terbuka milik petugas untuk ringkasan ruang kerja lapangan. */
export async function listMyOpenTasks(client: PoolClient, context: RequestContext) {
  if (!context.permissions.has("field_tasks.read")) return [];
  const result = await client.query<Row>(
    `${taskSelect}
     where task.organization_id = $1 and task.assigned_profile_id = $2
       and task.status in ('todo','in_progress')
     order by case task.status when 'in_progress' then 0 else 1 end,
              ${priorityOrder}, task.due_date nulls last, task.created_at
     limit 50`,
    [context.organizationId, context.profileId],
  );
  return result.rows;
}

async function loadTask(client: PoolClient, context: RequestContext, id: string, lock = false) {
  const result = await client.query<Row>(
    `select * from public.field_tasks where id = $1 and organization_id = $2 ${lock ? "for update" : ""}`,
    [id, context.organizationId],
  );
  return result.rows[0] ?? missing("Tugas lapangan tidak ditemukan.");
}

function assertCanWork(task: Row, context: RequestContext) {
  if (
    task.assigned_profile_id !== context.profileId &&
    !context.permissions.has("field_tasks.manage")
  ) {
    throw new DomainError("FORBIDDEN", "Tugas ini ditugaskan ke petugas lain.", 403);
  }
  if (["done", "cancelled"].includes(String(task.status))) {
    throw new DomainError("INVALID_STATE", "Tugas ini sudah ditutup.", 409);
  }
}

export async function getFieldTask(context: RequestContext, id: string) {
  requirePermission(context, "field_tasks.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `${taskSelect} where task.id = $1 and task.organization_id = $2`,
      [id, context.organizationId],
    );
    const task = result.rows[0] ?? missing("Tugas lapangan tidak ditemukan.");
    if (
      task.assigned_profile_id !== context.profileId &&
      !context.permissions.has("field_tasks.manage")
    ) {
      throw new DomainError("FORBIDDEN", "Tugas ini ditugaskan ke petugas lain.", 403);
    }
    const [items, reports, goods] = await Promise.all([
      client.query<Row>(
        `select item.*, done_profile.display_name as done_by_name
         from public.field_task_items item
         left join public.profiles done_profile on done_profile.id = item.done_by
         where item.task_id = $1 and item.organization_id = $2
         order by item.sequence_number`,
        [id, context.organizationId],
      ),
      client.query<Row>(
        `select id, reference_number, report_type, status, occurred_at
         from public.field_reports
         where task_id = $1 and organization_id = $2
         order by occurred_at desc`,
        [id, context.organizationId],
      ),
      task.program_id
        ? client.query<Row>(
            `select product.name, plan_item.quantity::text as quantity, plan_item.unit
             from public.program_goods_plan_items plan_item
             join public.inventory_products product
               on product.id = plan_item.product_id and product.organization_id = plan_item.organization_id
             where plan_item.program_id = $1 and plan_item.organization_id = $2
               and plan_item.status = 'planned'
             order by plan_item.sort_order`,
            [task.program_id, context.organizationId],
          )
        : Promise.resolve({ rows: [] as Row[] }),
    ]);
    const beneficiary = task.beneficiary_contact_id
      ? (
          await client.query<Row>(
            `select id, display_name, primary_phone, whatsapp_phone,
                    concat_ws(', ', address_line, village, district, city) as address
             from public.crm_contacts where id = $1 and organization_id = $2`,
            [task.beneficiary_contact_id, context.organizationId],
          )
        ).rows[0]
      : null;
    return {
      ...task,
      beneficiary,
      items: items.rows,
      program_goods: goods.rows,
      reports: reports.rows,
    };
  });
}

const modeLabel = (modes: string[]) =>
  modes.includes("cash") && modes.includes("in_kind")
    ? "dana & barang"
    : modes.includes("cash")
      ? "dana"
      : "barang";

function defaultTitle(type: FieldTaskType, name: string | null, modes: string[]) {
  const target = name ?? "penerima";
  switch (type) {
    case "distribution":
      return `Salurkan ${modeLabel(modes)} — ${target}`;
    case "verification":
      return `Verifikasi ${target}`;
    case "delivery":
      return `Antar barang — ${target}`;
    case "monitoring":
      return `Pantau ${target}`;
    default:
      return `Tugas lapangan — ${target}`;
  }
}

/**
 * Membuat tugas lapangan; satu tugas per penerima yang dipilih. Ceklis
 * dibentuk otomatis dari jenis tugas dan bentuk dukungan (dana/barang).
 */
export async function createFieldTasks(
  context: RequestContext,
  input: CreateFieldTasksInput,
) {
  requirePermission(context, "field_tasks.manage");
  return withTenantTransaction(context, async (database, client) => {
    const member = await client.query(
      `select 1 from public.memberships where organization_id = $1 and profile_id = $2 and status = 'active'`,
      [context.organizationId, input.assigned_profile_id],
    );
    if (!member.rows[0]) {
      throw new DomainError("VALIDATION_ERROR", "Petugas harus anggota aktif organisasi.", 400);
    }

    let supportModes = input.support_modes;
    if (input.program_id) {
      const program = (
        await client.query<{ support_modes: string[] }>(
          `select support_modes from public.programs where id = $1 and organization_id = $2`,
          [input.program_id, context.organizationId],
        )
      ).rows[0];
      if (!program) missing("Program tidak ditemukan.");
      if (input.task_type === "distribution" && supportModes.length === 0) {
        supportModes = program!.support_modes.filter(
          (mode): mode is "cash" | "in_kind" => mode === "cash" || mode === "in_kind",
        );
      }
    }
    if (input.task_type !== "distribution") supportModes = [];
    if (input.task_type === "distribution") {
      const invalid = (message: string) => {
        throw new DomainError("VALIDATION_ERROR", message, 400);
      };
      if (supportModes.length === 0) {
        invalid("Program ini tidak menyalurkan dana atau barang; pilih bentuk bantuan.");
      }
      if (supportModes.includes("cash") && !input.cash_amount) {
        invalid("Program menyalurkan dana: isi nominal dana per penerima.");
      }
      if (supportModes.includes("in_kind") && !input.goods_package_count && !input.goods_summary) {
        invalid("Program menyalurkan barang: isi jumlah paket atau rincian barang.");
      }
    }

    const beneficiaries = input.beneficiary_contact_ids.length
      ? (
          await client.query<Row & { display_name: string; address: string | null }>(
            `select id, display_name, concat_ws(', ', address_line, village, district, city) as address
             from public.crm_contacts
             where organization_id = $1 and id = any($2::uuid[])`,
            [context.organizationId, input.beneficiary_contact_ids],
          )
        ).rows
      : [];
    if (beneficiaries.length !== input.beneficiary_contact_ids.length) {
      missing("Sebagian penerima tidak ditemukan.");
    }
    const targets: Array<(Row & { address: string | null; display_name: string }) | null> =
      beneficiaries.length > 0 ? beneficiaries : [null];

    const checklist = buildChecklist({
      cashAmount: input.cash_amount ?? null,
      customItems: input.custom_items,
      goodsPackageCount: input.goods_package_count ?? null,
      goodsSummary: input.goods_summary ?? null,
      supportModes,
      taskType: input.task_type,
    });

    const ids: string[] = [];
    for (const target of targets) {
      const task = (
        await client.query<Row>(
          `insert into public.field_tasks (
             organization_id, reference_number, task_type, title, instructions,
             priority, due_date, program_id, beneficiary_contact_id,
             distribution_plan_id, shipment_id, case_id, support_modes,
             cash_amount, goods_package_count, goods_summary, location_text,
             assigned_profile_id, created_by, updated_by
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)
           returning id`,
          [
            context.organizationId,
            reference(),
            input.task_type,
            input.title && targets.length === 1
              ? input.title
              : input.title
                ? `${input.title} — ${target?.display_name ?? ""}`.trim()
                : defaultTitle(input.task_type, target?.display_name ?? null, supportModes),
            input.instructions ?? null,
            input.priority,
            input.due_date ?? null,
            input.program_id ?? null,
            target?.id ?? null,
            input.distribution_plan_id ?? null,
            input.shipment_id ?? null,
            input.case_id ?? null,
            supportModes,
            supportModes.includes("cash") ? (input.cash_amount ?? null) : null,
            supportModes.includes("in_kind") ? (input.goods_package_count ?? null) : null,
            supportModes.includes("in_kind") || input.task_type === "delivery"
              ? (input.goods_summary ?? null)
              : null,
            target?.address || null,
            input.assigned_profile_id,
            context.profileId,
          ],
        )
      ).rows[0]!;
      for (const [index, item] of checklist.entries()) {
        await client.query(
          `insert into public.field_task_items (organization_id, task_id, sequence_number, item_kind, label, is_required)
           values ($1,$2,$3,$4,$5,$6)`,
          [context.organizationId, task.id, index + 1, item.item_kind, item.label, item.is_required],
        );
      }
      ids.push(task.id);
    }

    await insertAuditEvent(database, context, {
      action: "field_task.created",
      after: { assignee: input.assigned_profile_id, ids, supportModes, taskType: input.task_type },
      entityId: ids[0]!,
      entityType: "field_task",
    });
    return { created: ids.length, ids };
  });
}

export async function updateFieldTaskItem(
  context: RequestContext,
  taskId: string,
  itemId: string,
  input: { is_done: boolean; note?: string | undefined },
) {
  requirePermission(context, "field_tasks.read");
  return withTenantTransaction(context, async (_database, client) => {
    const task = await loadTask(client, context, taskId, true);
    assertCanWork(task, context);
    const updated = await client.query<Row>(
      `update public.field_task_items
       set is_done = $1,
           done_at = case when $1 then coalesce(done_at, now()) else null end,
           done_by = case when $1 then coalesce(done_by, $2::uuid) else null end,
           note = coalesce($3, note)
       where id = $4 and task_id = $5 and organization_id = $6
       returning *`,
      [input.is_done, context.profileId, input.note ?? null, itemId, taskId, context.organizationId],
    );
    const item = updated.rows[0] ?? missing("Butir ceklis tidak ditemukan.");
    if (task.status === "todo" && input.is_done) {
      await client.query(
        `update public.field_tasks set status = 'in_progress', started_at = now(), updated_by = $1
         where id = $2 and organization_id = $3`,
        [context.profileId, taskId, context.organizationId],
      );
    }
    return item;
  });
}

async function loadItems(client: PoolClient, context: RequestContext, taskId: string) {
  return (
    await client.query<{ id: string; is_done: boolean; is_required: boolean; item_kind: string; label: string }>(
      `select id, is_done, is_required, item_kind, label from public.field_task_items
       where task_id = $1 and organization_id = $2 order by sequence_number`,
      [taskId, context.organizationId],
    )
  ).rows;
}

export async function completeFieldTask(
  context: RequestContext,
  taskId: string,
  completionNotes: string | undefined,
) {
  requirePermission(context, "field_tasks.read");
  return withTenantTransaction(context, async (database, client) => {
    const task = await loadTask(client, context, taskId, true);
    if (task.status === "done") return task;
    assertCanWork(task, context);
    const check = canCompleteTask(await loadItems(client, context, taskId), { withReport: false });
    if (!check.ok) {
      throw new DomainError(
        "INVALID_STATE",
        `Masih ada ceklis wajib: ${check.pending.map((item) => item.label).join("; ")}.`,
        409,
      );
    }
    const updated = await client.query<Row>(
      `update public.field_tasks
       set status = 'done', completed_at = now(), completion_notes = $1,
           started_at = coalesce(started_at, now()), updated_by = $2
       where id = $3 and organization_id = $4 returning *`,
      [completionNotes ?? null, context.profileId, taskId, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "field_task.completed",
      after: updated.rows[0],
      before: task,
      entityId: taskId,
      entityType: "field_task",
    });
    return updated.rows[0];
  });
}

export async function cancelFieldTask(context: RequestContext, taskId: string, reason: string) {
  requirePermission(context, "field_tasks.manage");
  return withTenantTransaction(context, async (database, client) => {
    const task = await loadTask(client, context, taskId, true);
    if (["done", "cancelled"].includes(String(task.status))) {
      throw new DomainError("INVALID_STATE", "Tugas ini sudah ditutup.", 409);
    }
    const updated = await client.query<Row>(
      `update public.field_tasks set status = 'cancelled', cancelled_reason = $1, updated_by = $2
       where id = $3 and organization_id = $4 returning *`,
      [reason, context.profileId, taskId, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "field_task.cancelled",
      after: updated.rows[0],
      before: task,
      entityId: taskId,
      entityType: "field_task",
    });
    return updated.rows[0];
  });
}

/**
 * Dipanggil saat laporan lapangan tertaut tugas diterima: butir "Kirim
 * laporan" dicentang dan tugas selesai bila seluruh ceklis wajib terpenuhi.
 */
export async function applyReportToTask(
  client: PoolClient,
  context: RequestContext,
  taskId: string,
  reportId: string,
) {
  const task = await loadTask(client, context, taskId, true);
  // Laporan tetap diterima walau tugas sudah ditutup atau milik petugas lain
  // (mis. terkirim belakangan dari antrean offline); tugas tidak diubah.
  if (["done", "cancelled"].includes(String(task.status))) {
    return { completed: task.status === "done", pending: [] as string[] };
  }
  if (
    task.assigned_profile_id !== context.profileId &&
    !context.permissions.has("field_tasks.manage")
  ) {
    return null;
  }
  await client.query(
    `update public.field_task_items
     set is_done = true, done_at = coalesce(done_at, now()), done_by = coalesce(done_by, $1::uuid)
     where task_id = $2 and organization_id = $3 and item_kind = 'report'`,
    [context.profileId, taskId, context.organizationId],
  );
  const check = canCompleteTask(await loadItems(client, context, taskId), { withReport: true });
  await client.query(
    `update public.field_tasks
     set status = case when $1::boolean then 'done' else 'in_progress' end,
         completed_at = case when $1::boolean then now() else completed_at end,
         completed_report_id = case when $1::boolean then $2::uuid else completed_report_id end,
         started_at = coalesce(started_at, now()), updated_by = $3
     where id = $4 and organization_id = $5`,
    [check.ok, reportId, context.profileId, taskId, context.organizationId],
  );
  return { completed: check.ok, pending: check.pending.map((item) => item.label) };
}
