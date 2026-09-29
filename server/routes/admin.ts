import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  addMember,
  createRole,
  getOrganizationProfile,
  listMembers,
  listRolesWithPermissions,
  updateMember,
  updateOrganizationProfile,
  updateRole,
} from "../services/admin-service";
import type { AppEnv } from "../types";
import {
  addMemberSchema,
  adminIdParamsSchema,
  organizationProfileSchema,
  roleSchema,
  updateMemberSchema,
} from "./admin-schemas";

function invalid(result: {
  error?: { issues?: Array<{ message: string }> };
  success: boolean;
}): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      result.error?.issues?.[0]?.message ?? "Data tidak valid.",
      400,
    );
  }
}

export const adminRoute = new Hono<AppEnv>({ strict: false });

const one = (data: unknown, requestId: string) => ({ data, meta: { requestId } });

adminRoute.get("/organization", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(one(await getOrganizationProfile(requestContext), requestContext.requestId));
});

adminRoute.put(
  "/organization",
  zValidator("json", organizationProfileSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(await updateOrganizationProfile(requestContext, context.req.valid("json")), requestContext.requestId),
    );
  },
);

adminRoute.get("/members", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(one(await listMembers(requestContext), requestContext.requestId));
});

adminRoute.post(
  "/members",
  zValidator("json", addMemberSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(one(await addMember(requestContext, context.req.valid("json")), requestContext.requestId), 201);
  },
);

adminRoute.put(
  "/members/:id",
  zValidator("param", adminIdParamsSchema, invalid),
  zValidator("json", updateMemberSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await updateMember(requestContext, context.req.valid("param").id, context.req.valid("json")),
        requestContext.requestId,
      ),
    );
  },
);

adminRoute.get("/roles", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(one(await listRolesWithPermissions(requestContext), requestContext.requestId));
});

adminRoute.post(
  "/roles",
  zValidator("json", roleSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(one(await createRole(requestContext, context.req.valid("json")), requestContext.requestId), 201);
  },
);

adminRoute.put(
  "/roles/:id",
  zValidator("param", adminIdParamsSchema, invalid),
  zValidator("json", roleSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await updateRole(requestContext, context.req.valid("param").id, context.req.valid("json")),
        requestContext.requestId,
      ),
    );
  },
);
