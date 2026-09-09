import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import { publicProgramSlugParamsSchema } from "./program-publication-schemas";
import { getPublicProgramLanding } from "../services/program-publication-service";
import type { AppEnv } from "../types";

export const publicProgramsRoute = new Hono<AppEnv>({ strict: false });

publicProgramsRoute.get(
  "/:slug",
  zValidator("param", publicProgramSlugParamsSchema, (result) => {
    if (!result.success) throw new DomainError("NOT_FOUND", "Halaman program tidak ditemukan.", 404);
  }),
  async (context) => {
    const data = await getPublicProgramLanding(context.req.valid("param").slug);
    if (!data) throw new DomainError("NOT_FOUND", "Halaman program tidak ditemukan.", 404);
    return context.json({ data, meta: { requestId: context.get("requestId") } });
  },
);
