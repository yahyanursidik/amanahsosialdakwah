import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createProgramBeneficiaryFulfillment,
  getProgramBeneficiaryFulfillmentOptions,
  getProgramBeneficiaryJourney,
} from "../services/program-beneficiary-journey-service";
import {
  createProgramApplicationAllocation,
  createProgramDeliveryArea,
  createProgramPartnerAssignment,
  getProgramOperations,
} from "../services/program-operations-service";
import {
  createInitialProgramPlan,
  getProgramPlanningOptions,
} from "../services/program-initial-plan-service";
import type { AppEnv } from "../types";
import {
  createProgramFulfillmentSchema,
  programFulfillmentIdempotencyKeySchema,
  programBeneficiaryJourneyQuerySchema,
  programIdParamsSchema,
} from "./program-schemas";
import {
  createProgramApplicationAllocationSchema,
  createProgramDeliveryAreaSchema,
  createProgramPartnerAssignmentSchema,
  programOperationIdempotencyKeySchema,
} from "./program-operations-schemas";
import { createInitialProgramPlanSchema } from "./program-initial-plan-schemas";
import { programPublicationDraftSchema } from "./program-publication-schemas";
import {
  getProgramPublication,
  publishProgramPublication,
  saveProgramPublicationDraft,
} from "../services/program-publication-service";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError("VALIDATION_ERROR", "ID program tidak valid.", 400);
  }
}

function programInputValidationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError("VALIDATION_ERROR", "Data Program tidak valid.", 400);
  }
}

export const programsRoute = new Hono<AppEnv>({ strict: false });

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}) {
  const result = programFulfillmentIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter wajib untuk menghubungkan fulfilment.",
      400,
    );
  }
  return result.data;
}

function operationIdempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}) {
  const result = programOperationIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter wajib untuk alokasi kuota.",
      400,
    );
  }
  return result.data;
}

programsRoute.get("/planning-options", async (context) => {
  const requestContext = context.get("requestContext");
  const data = await getProgramPlanningOptions(requestContext);
  return context.json({ data, meta: { requestId: requestContext.requestId } });
});

programsRoute.post(
  "/initial-plan",
  zValidator(
    "json",
    createInitialProgramPlanSchema,
    programInputValidationHook,
  ),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createInitialProgramPlan(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

programsRoute.get(
  "/:id/operations",
  zValidator("param", programIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getProgramOperations(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

programsRoute.post(
  "/:id/operations/areas",
  zValidator("param", programIdParamsSchema, validationHook),
  zValidator("json", createProgramDeliveryAreaSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createProgramDeliveryArea(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

programsRoute.post(
  "/:id/operations/partners",
  zValidator("param", programIdParamsSchema, validationHook),
  zValidator("json", createProgramPartnerAssignmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createProgramPartnerAssignment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

programsRoute.post(
  "/:id/operations/allocations",
  zValidator("param", programIdParamsSchema, validationHook),
  zValidator("json", createProgramApplicationAllocationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createProgramApplicationAllocation(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      operationIdempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

programsRoute.get(
  "/:id/publication",
  zValidator("param", programIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getProgramPublication(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

programsRoute.put(
  "/:id/publication/draft",
  zValidator("param", programIdParamsSchema, validationHook),
  zValidator("json", programPublicationDraftSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await saveProgramPublicationDraft(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

programsRoute.post(
  "/:id/publication/publish",
  zValidator("param", programIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await publishProgramPublication(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

programsRoute.get(
  "/:id/beneficiary-journey",
  zValidator("param", programIdParamsSchema, validationHook),
  zValidator("query", programBeneficiaryJourneyQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getProgramBeneficiaryJourney(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("query"),
    );

    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

programsRoute.get(
  "/:id/beneficiary-journey/fulfillment-options",
  zValidator("param", programIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getProgramBeneficiaryFulfillmentOptions(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

programsRoute.post(
  "/:id/beneficiary-journey/fulfillments",
  zValidator("param", programIdParamsSchema, validationHook),
  zValidator("json", createProgramFulfillmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createProgramBeneficiaryFulfillment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
