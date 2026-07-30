import {
  ensureProfileAndBootstrap,
  readJsonBody,
  requireSession,
  sendError,
  sendJson,
  withRuntimeContext,
} from "../../server/_shared/neon.mjs";

const actionAliases = {
  create: "manage",
  delete: "manage",
  edit: "manage",
  list: "read",
  show: "read",
};

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
      body.organizationId ?? request.headers["x-active-organization"];
    const resource = body.resource;
    const action = actionAliases[body.action] ?? body.action;

    if (!organizationId || !resource || !action) {
      sendJson(response, 200, {
        can: false,
        reason: "Konteks akses belum lengkap.",
      });
      return;
    }

    const permissionKey = `${resource}.${action}`;
    const can = await withRuntimeContext(
      profile.id,
      organizationId,
      async (client) => {
        const result = await client.query(
          "select private.has_permission($1::uuid, $2::text) as can",
          [organizationId, permissionKey],
        );

        return result.rows[0]?.can === true;
      },
    );

    sendJson(response, 200, {
      can,
      ...(can ? {} : { reason: `Permission ${permissionKey} belum diberikan.` }),
    });
  } catch (error) {
    sendJson(response, 200, {
      can: false,
      reason: error.message ?? "Akses tidak dapat diperiksa.",
    });
  }
}
