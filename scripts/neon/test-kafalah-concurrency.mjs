import { createPool } from "./shared.mjs";

const pool = createPool({ direct: true });
const schema = `kafalah_concurrency_${crypto.randomUUID().replaceAll("-", "")}`;

try {
  await pool.query(`create schema "${schema}"`);
  await pool.query(`
    create table "${schema}".needs (
      id integer primary key,
      approved_amount numeric(20,2) not null,
      matched_amount numeric(20,2) not null default 0,
      check (matched_amount between 0 and approved_amount)
    )
  `);
  await pool.query(
    `insert into "${schema}".needs (id, approved_amount) values (1, 100.00)`,
  );

  async function reserve(amount) {
    const result = await pool.query(
      `update "${schema}".needs
          set matched_amount = matched_amount + $1::numeric
        where id = 1
          and approved_amount - matched_amount >= $1::numeric
      returning matched_amount::text`,
      [amount],
    );
    return result.rows[0] ? "reserved" : "insufficient";
  }

  const results = await Promise.all([reserve("80.00"), reserve("80.00")]);
  const final = await pool.query(
    `select matched_amount::text from "${schema}".needs where id = 1`,
  );

  if (
    results.filter((result) => result === "reserved").length !== 1 ||
    results.filter((result) => result === "insufficient").length !== 1 ||
    final.rows[0]?.matched_amount !== "80.00"
  ) {
    throw new Error(
      `Kafalah concurrency invariant gagal: results=${results.join(",")}, matched=${final.rows[0]?.matched_amount}`,
    );
  }
  console.log(
    "Kafalah concurrency test lulus: satu matching berhasil, satu ditolak, total 80.00.",
  );
} finally {
  await pool.query(`drop schema if exists "${schema}" cascade`);
  await pool.end();
}
