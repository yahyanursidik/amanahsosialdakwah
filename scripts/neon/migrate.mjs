import fs from "node:fs";
import {
  createPool,
  listSqlFiles,
  readWorkspaceFile,
} from "./shared.mjs";

const migrations = listSqlFiles("db/migrations");
const drizzleMigrations = listSqlFiles("drizzle").filter(
  (migration) => !migration.fileName.startsWith("0000_"),
);

if (migrations.length === 0 && drizzleMigrations.length === 0) {
  console.log("Tidak ada migration SQL yang perlu diterapkan.");
  process.exit(0);
}

const pool = createPool({ direct: true });

try {
  await pool.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  for (const migration of [
    ...migrations,
    ...drizzleMigrations.map((migration) => ({
      ...migration,
      fileName: `drizzle/${migration.fileName}`,
    })),
  ]) {
    const existing = await pool.query(
      "select 1 from public.schema_migrations where version = $1",
      [migration.fileName],
    );

    if (existing.rowCount > 0) {
      console.log(`Lewati migration yang sudah diterapkan: ${migration.fileName}`);
      continue;
    }

    const sqlText = readWorkspaceFile(migration.relativePath).replaceAll(
      "--> statement-breakpoint",
      "",
    );

    await pool.query("begin");
    try {
      await pool.query(sqlText);
      await pool.query(
        "insert into public.schema_migrations (version) values ($1)",
        [migration.fileName],
      );
      await pool.query("commit");
      console.log(`Migration diterapkan: ${migration.fileName}`);
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  }
} finally {
  await pool.end();
}

fs.mkdirSync(new URL("../../src/generated/neon/", import.meta.url), {
  recursive: true,
});
