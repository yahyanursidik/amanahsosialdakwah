import path from "node:path";

import { assertSeedIsAllowed, readWorkspaceFile, runSqlText } from "./shared.mjs";

/**
 * Menjalankan satu file seed tertentu (bukan seluruh db/seeds) agar seed lain
 * — misalnya yang menetapkan ulang saldo stok — tidak ikut dijalankan.
 *
 *   node scripts/neon/seed-file.mjs db/seeds/zzz-demo-giving-waqf-beneficiaries.sql
 */
const target = process.argv[2];

if (!target || !target.endsWith(".sql")) {
  throw new Error("Sebutkan path file seed .sql, misalnya db/seeds/zzz-demo-giving-waqf-beneficiaries.sql");
}

assertSeedIsAllowed();

const relativePath = path.normalize(target).replaceAll("\\", "/");
await runSqlText(readWorkspaceFile(relativePath), { direct: true });
console.log(`Seed diterapkan: ${relativePath}`);
