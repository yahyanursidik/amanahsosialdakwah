import {
  assertResource,
  ensureProfileAndBootstrap,
  normalizeField,
  readJsonBody,
  requireSession,
  sendError,
  sendJson,
  tableSchemas,
  toClientDocument,
  withRuntimeContext,
} from "../server/_shared/neon.mjs";

function placeholders(values, startAt = 1) {
  return values.map((_, index) => `$${index + startAt}`);
}

function normalizeValue(value) {
  if (value === "") {
    return null;
  }

  if (
    typeof value === "string" &&
    ((value.startsWith("{") && value.endsWith("}")) ||
      (value.startsWith("[") && value.endsWith("]")))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

function buildWhere(resource, filters = [], startAt = 1) {
  const clauses = [];
  const values = [];

  for (const filter of filters) {
    if (!filter || filter.value === undefined || filter.value === null) {
      continue;
    }

    if ("field" in filter) {
      const column = normalizeField(resource, filter.field);
      const parameterIndex = startAt + values.length;

      if (filter.operator === "contains") {
        clauses.push(`${column} ilike $${parameterIndex}`);
        values.push(`%${filter.value}%`);
      } else if (filter.operator === "ne") {
        clauses.push(`${column} <> $${parameterIndex}`);
        values.push(filter.value);
      } else if (filter.operator === "in" && Array.isArray(filter.value)) {
        clauses.push(`${column} = any($${parameterIndex})`);
        values.push(filter.value);
      } else {
        clauses.push(`${column} = $${parameterIndex}`);
        values.push(filter.value);
      }
    }
  }

  return {
    sql: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    values,
  };
}

function buildOrder(resource, sorters = []) {
  const clauses = sorters.map((sorter) => {
    const column = normalizeField(resource, sorter.field);
    const direction = sorter.order === "asc" ? "asc" : "desc";
    return `${column} ${direction}`;
  });

  if (clauses.length === 0) {
    clauses.push("created_at desc");
  }

  return `order by ${clauses.join(", ")}`;
}

function cleanValues(resource, values, organizationId, profileId) {
  const columns = tableSchemas[resource];
  const cleaned = {};

  for (const [key, value] of Object.entries(values ?? {})) {
    const column = key === "$id" ? "id" : key;

    if (columns.includes(column) && !["created_at", "updated_at"].includes(column)) {
      cleaned[column] = normalizeValue(value);
    }
  }

  if (columns.includes("organization_id") && organizationId) {
    cleaned.organization_id = organizationId;
  }

  if (columns.includes("created_by") && !cleaned.created_by) {
    cleaned.created_by = profileId;
  }

  return cleaned;
}

async function getList(client, body) {
  const columns = assertResource(body.resource);
  const pageSize = Math.min(body.pagination?.pageSize ?? 10, 500);
  const currentPage = Math.max(body.pagination?.current ?? body.pagination?.currentPage ?? 1, 1);
  const offset = (currentPage - 1) * pageSize;
  const where = buildWhere(body.resource, body.filters);
  const orderBy = buildOrder(body.resource, body.sorters);
  const listResult = await client.query(
    `
    select ${columns.join(", ")}
    from public.${body.resource}
    ${where.sql}
    ${orderBy}
    limit $${where.values.length + 1}
    offset $${where.values.length + 2}
    `,
    [...where.values, pageSize, offset],
  );
  const countResult = await client.query(
    `select count(*)::int as count from public.${body.resource} ${where.sql}`,
    where.values,
  );

  return {
    data: listResult.rows.map((row) => toClientDocument(body.resource, row)),
    total: countResult.rows[0]?.count ?? 0,
  };
}

async function getOne(client, body) {
  const columns = assertResource(body.resource);
  const result = await client.query(
    `
    select ${columns.join(", ")}
    from public.${body.resource}
    where id = $1
    limit 1
    `,
    [body.id],
  );

  if (!result.rows[0]) {
    const error = new Error("Data tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  return { data: toClientDocument(body.resource, result.rows[0]) };
}

async function createOne(client, body, organizationId, profileId) {
  assertResource(body.resource);
  const values = cleanValues(body.resource, body.values, organizationId, profileId);
  const entries = Object.entries(values);

  if (entries.length === 0) {
    throw new Error("Payload kosong.");
  }

  const columns = entries.map(([key]) => key);
  const parameters = entries.map(([, value]) => value);
  const result = await client.query(
    `
    insert into public.${body.resource} (${columns.join(", ")})
    values (${placeholders(parameters).join(", ")})
    returning *
    `,
    parameters,
  );

  return { data: toClientDocument(body.resource, result.rows[0]) };
}

async function updateOne(client, body, organizationId, profileId) {
  assertResource(body.resource);
  const values = cleanValues(body.resource, body.values, organizationId, profileId);
  delete values.id;
  const entries = Object.entries(values);

  if (entries.length === 0) {
    return getOne(client, body);
  }

  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
  const result = await client.query(
    `
    update public.${body.resource}
    set ${assignments.join(", ")}
    where id = $1
    returning *
    `,
    [body.id, ...entries.map(([, value]) => value)],
  );

  if (!result.rows[0]) {
    const error = new Error("Data tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  return { data: toClientDocument(body.resource, result.rows[0]) };
}

async function deleteOne(client, body) {
  assertResource(body.resource);
  const result = await client.query(
    `delete from public.${body.resource} where id = $1 returning *`,
    [body.id],
  );

  if (!result.rows[0]) {
    const error = new Error("Data tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  return { data: toClientDocument(body.resource, result.rows[0]) };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendError(response, 405, "Method tidak didukung.");
    return;
  }

  try {
    const body = await readJsonBody(request);
    const { user } = await requireSession(request);
    const profile = await ensureProfileAndBootstrap(user);
    const organizationId =
      body.organizationId ?? request.headers["x-active-organization"] ?? null;
    const operation = body.operation;
    const payload = await withRuntimeContext(
      profile.id,
      organizationId,
      async (client) => {
        switch (operation) {
          case "getList":
            return getList(client, body);
          case "getOne":
            return getOne(client, body);
          case "create":
            return createOne(client, body, organizationId, profile.id);
          case "update":
            return updateOne(client, body, organizationId, profile.id);
          case "deleteOne":
            return deleteOne(client, body);
          default:
            throw new Error(`Operasi data tidak dikenal: ${operation}`);
        }
      },
    );

    sendJson(response, 200, payload);
  } catch (error) {
    sendError(response, error.statusCode ?? 500, error.message ?? "Permintaan data gagal.");
  }
}
