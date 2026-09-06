import path from "node:path";

import { defineConfig } from "vite";

/**
 * Produces a single native-ESM module consumed by the Vercel catch-all API
 * function. Keeping application code bundled prevents Node's ESM runtime from
 * resolving TypeScript-only files after deployment.
 */
export default defineConfig({
  publicDir: false,
  build: {
    // Type declaration untuk entrypoint disimpan di repository agar `typecheck`
    // tetap dapat berjalan pada checkout bersih sebelum artefak dibuat.
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "server/index.ts"),
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    outDir: "server/build-output",
    rollupOptions: {
      external: (moduleId) =>
        moduleId.startsWith("node:") ||
        (!moduleId.startsWith(".") && !path.isAbsolute(moduleId)),
    },
    target: "node22",
  },
});
