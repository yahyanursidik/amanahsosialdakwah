import { createPool, listSqlFiles } from "./shared.mjs";

const expectedVersions = [
  ...listSqlFiles("db/migrations").map((migration) => migration.fileName),
  ...listSqlFiles("drizzle")
    .filter((migration) => !migration.fileName.startsWith("0000_"))
    .map((migration) => `drizzle/${migration.fileName}`),
];
const pool = createPool({ direct: true });

try {
  const result = await pool.query(
    "select version from public.schema_migrations order by version",
  );
  const appliedVersions = new Set(result.rows.map((row) => row.version));
  const pendingVersions = expectedVersions.filter(
    (version) => !appliedVersions.has(version),
  );

  if (pendingVersions.length > 0) {
    throw new Error(
      `Migration production tertunda: ${pendingVersions.join(", ")}`,
    );
  }

  console.log(
    `Verifikasi migration lulus: ${expectedVersions.length} migration telah diterapkan.`,
  );
} finally {
  await pool.end();
}
