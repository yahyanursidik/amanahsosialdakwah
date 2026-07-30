import { assertResetIsAllowed, runSqlText } from "./shared.mjs";

assertResetIsAllowed();

await runSqlText(
  `
  drop schema if exists private cascade;
  drop schema if exists public cascade;
  create schema public;
  grant usage on schema public to public;
  grant create on schema public to public;
  `,
  { direct: true },
);

console.log("Database Neon berhasil di-reset. Jalankan npm run neon:migrate lalu npm run neon:seed.");
