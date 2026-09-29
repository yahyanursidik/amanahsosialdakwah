import { Hono } from "hono";

import { getPublicOverview } from "../services/public-overview-service";
import type { AppEnv } from "../types";

export const publicOverviewRoute = new Hono<AppEnv>({ strict: false });

publicOverviewRoute.get("/", async (context) => {
  const data = await getPublicOverview();
  // Angka agregat publik; aman di-cache singkat oleh browser/CDN.
  context.header("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  return context.json({ data, meta: { requestId: context.get("requestId") } });
});
