import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { DomainError } from "../domain/errors";
import {
  activateKafalahContract,
  approveKafalahNeed,
  createKafalahContract,
  createKafalahMatch,
  createKafalahNeed,
  decideKafalahMonitoring,
  decideKafalahRenewal,
  getKafalahContract,
  listKafalahBeneficiaries,
  listKafalahContracts,
  listKafalahMatches,
  listKafalahNeeds,
  listKafalahSponsors,
  postKafalahPayment,
  recordKafalahDistribution,
  requestKafalahRenewal,
  submitKafalahMonitoring,
} from "../services/kafalah-service";
import type { AppEnv } from "../types";
import {
  createKafalahContractSchema,
  createKafalahMatchSchema,
  createKafalahNeedSchema,
  kafalahDistributionSchema,
  kafalahIdempotencyKeySchema,
  kafalahIdParamsSchema,
  kafalahListQuerySchema,
  kafalahMonitoringDecisionSchema,
  kafalahMonitoringSchema,
  kafalahPaymentSchema,
  kafalahRenewalDecisionSchema,
  kafalahRenewalSchema,
} from "./kafalah-schemas";

const invalid = (result: { success: boolean }) => {
  if (!result.success)
    throw new DomainError("VALIDATION_ERROR", "Data Kafalah tidak valid.", 400);
};
const key = (context: {
  req: { header: (name: string) => string | undefined };
}) => {
  const parsed = kafalahIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!parsed.success)
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter wajib untuk command ini.",
      400,
    );
  return parsed.data;
};
const list = (
  result: { data: unknown[]; page: number; pageSize: number; total: number },
  requestId: string,
) => ({
  data: result.data,
  meta: {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    requestId,
  },
});
const one = (data: unknown, requestId: string) => ({
  data,
  meta: { requestId },
});
export const kafalahRoute = new Hono<AppEnv>({ strict: false });

kafalahRoute.get(
  "/beneficiaries",
  zValidator("query", kafalahListQuerySchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      list(
        await listKafalahBeneficiaries(ctx, c.req.valid("query")),
        ctx.requestId,
      ),
    );
  },
);

kafalahRoute.get(
  "/sponsors",
  zValidator("query", kafalahListQuerySchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      list(await listKafalahSponsors(ctx, c.req.valid("query")), ctx.requestId),
    );
  },
);
kafalahRoute.get(
  "/needs",
  zValidator("query", kafalahListQuerySchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      list(await listKafalahNeeds(ctx, c.req.valid("query")), ctx.requestId),
    );
  },
);
kafalahRoute.post(
  "/needs",
  zValidator("json", createKafalahNeedSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(await createKafalahNeed(ctx, c.req.valid("json")), ctx.requestId),
      201,
    );
  },
);
kafalahRoute.post(
  "/needs/:id/approve",
  zValidator("param", kafalahIdParamsSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await approveKafalahNeed(ctx, c.req.valid("param").id),
        ctx.requestId,
      ),
    );
  },
);
kafalahRoute.get(
  "/matches",
  zValidator("query", kafalahListQuerySchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      list(await listKafalahMatches(ctx, c.req.valid("query")), ctx.requestId),
    );
  },
);
kafalahRoute.post(
  "/matches",
  zValidator("json", createKafalahMatchSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(await createKafalahMatch(ctx, c.req.valid("json")), ctx.requestId),
      201,
    );
  },
);
kafalahRoute.get(
  "/contracts",
  zValidator("query", kafalahListQuerySchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      list(
        await listKafalahContracts(ctx, c.req.valid("query")),
        ctx.requestId,
      ),
    );
  },
);
kafalahRoute.post(
  "/contracts",
  zValidator("json", createKafalahContractSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(await createKafalahContract(ctx, c.req.valid("json")), ctx.requestId),
      201,
    );
  },
);
kafalahRoute.get(
  "/contracts/:id",
  zValidator("param", kafalahIdParamsSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await getKafalahContract(ctx, c.req.valid("param").id),
        ctx.requestId,
      ),
    );
  },
);
kafalahRoute.post(
  "/contracts/:id/activate",
  zValidator("param", kafalahIdParamsSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await activateKafalahContract(ctx, c.req.valid("param").id),
        ctx.requestId,
      ),
    );
  },
);
kafalahRoute.post(
  "/schedules/:id/payments",
  zValidator("param", kafalahIdParamsSchema, invalid),
  zValidator("json", kafalahPaymentSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await postKafalahPayment(
          ctx,
          c.req.valid("param").id,
          c.req.valid("json"),
          key(c),
        ),
        ctx.requestId,
      ),
      201,
    );
  },
);
kafalahRoute.post(
  "/schedules/:id/distributions",
  zValidator("param", kafalahIdParamsSchema, invalid),
  zValidator("json", kafalahDistributionSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await recordKafalahDistribution(
          ctx,
          c.req.valid("param").id,
          c.req.valid("json"),
          key(c),
        ),
        ctx.requestId,
      ),
      201,
    );
  },
);
kafalahRoute.post(
  "/contracts/:id/monitoring",
  zValidator("param", kafalahIdParamsSchema, invalid),
  zValidator("json", kafalahMonitoringSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await submitKafalahMonitoring(
          ctx,
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        ctx.requestId,
      ),
      201,
    );
  },
);
kafalahRoute.post(
  "/monitoring/:id/decision",
  zValidator("param", kafalahIdParamsSchema, invalid),
  zValidator("json", kafalahMonitoringDecisionSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await decideKafalahMonitoring(
          ctx,
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        ctx.requestId,
      ),
    );
  },
);
kafalahRoute.post(
  "/contracts/:id/renewals",
  zValidator("param", kafalahIdParamsSchema, invalid),
  zValidator("json", kafalahRenewalSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await requestKafalahRenewal(
          ctx,
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        ctx.requestId,
      ),
      201,
    );
  },
);
kafalahRoute.post(
  "/renewals/:id/decision",
  zValidator("param", kafalahIdParamsSchema, invalid),
  zValidator("json", kafalahRenewalDecisionSchema, invalid),
  async (c) => {
    const ctx = c.get("requestContext");
    return c.json(
      one(
        await decideKafalahRenewal(
          ctx,
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        ctx.requestId,
      ),
    );
  },
);
