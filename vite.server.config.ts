import path from "node:path";

import { defineConfig } from "vite";

/**
 * Produces a self-contained native-ESM bundle consumed by the Vercel catch-all
 * API function. Keeping application code and runtime dependencies bundled
 * prevents Node's ESM runtime from resolving TypeScript-only files or missing
 * traced packages after deployment.
 */
export default defineConfig({
  publicDir: false,
  ssr: {
    // Seluruh dependency npm dibundel agar fungsi tidak bergantung pada file
    // tracing dependency tambahan di runtime Vercel.
    noExternal: true,
  },
  build: {
    // Type declaration untuk entrypoint disimpan di repository agar `typecheck`
    // tetap dapat berjalan pada checkout bersih sebelum artefak dibuat.
    emptyOutDir: false,
    ssr: path.resolve(__dirname, "server/index.ts"),
    outDir: "server/build-output",
    rollupOptions: {
      output: {
        entryFileNames: "index.mjs",
      },
    },
    target: "node22",
  },
});
