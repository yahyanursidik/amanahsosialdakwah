import {
  assertSeedIsAllowed,
  listSqlFiles,
  readWorkspaceFile,
  runSqlText,
} from "./shared.mjs";

const seeds = listSqlFiles("db/seeds");

assertSeedIsAllowed();

if (seeds.length === 0) {
  console.log("Tidak ada seed SQL pada db/seeds.");
  process.exit(0);
}

for (const seed of seeds) {
  await runSqlText(readWorkspaceFile(seed.relativePath), { direct: true });
  console.log(`Seed diterapkan: ${seed.fileName}`);
}
