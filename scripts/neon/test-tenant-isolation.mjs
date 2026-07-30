import { listSqlFiles, readWorkspaceFile, runSqlText } from "./shared.mjs";

const tests = listSqlFiles("db/tests");

if (tests.length === 0) {
  console.log("Tidak ada SQL test pada db/tests.");
  process.exit(0);
}

for (const test of tests) {
  await runSqlText(readWorkspaceFile(test.relativePath), { direct: true });
  console.log(`SQL test lulus: ${test.fileName}`);
}
