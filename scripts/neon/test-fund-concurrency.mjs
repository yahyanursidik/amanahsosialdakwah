import { createPool } from "./shared.mjs";

const pool = createPool({ direct: true });
const schema = `fund_concurrency_${crypto.randomUUID().replaceAll("-", "")}`;

try {
  await pool.query(`create schema "${schema}"`);
  await pool.query(`
    create table "${schema}".balances (
      id integer primary key,
      available numeric(20,2) not null check (available >= 0)
    )
  `);
  await pool.query(`insert into "${schema}".balances (id, available) values (1, 100.00)`);

  async function allocate(amount) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const locked = await client.query(
        `select available::text from "${schema}".balances where id = 1 for update`,
      );
      const available = locked.rows[0]?.available ?? "0";
      const allowed = await client.query(
        "select $1::numeric <= $2::numeric as value",
        [amount, available],
      );
      if (!allowed.rows[0]?.value) {
        await client.query("rollback");
        return "insufficient";
      }
      await client.query(
        `update "${schema}".balances set available = available - $1::numeric where id = 1`,
        [amount],
      );
      await client.query("commit");
      return "allocated";
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  const results = await Promise.all([allocate("80.00"), allocate("80.00")]);
  const final = await pool.query(
    `select available::text from "${schema}".balances where id = 1`,
  );

  if (
    results.filter((result) => result === "allocated").length !== 1 ||
    results.filter((result) => result === "insufficient").length !== 1 ||
    final.rows[0]?.available !== "20.00"
  ) {
    throw new Error(
      `Concurrency invariant gagal: results=${results.join(",")}, saldo=${final.rows[0]?.available}`,
    );
  }
  console.log("Concurrency test lulus: satu alokasi berhasil, satu ditolak, saldo akhir 20.00.");
} finally {
  await pool.query(`drop schema if exists "${schema}" cascade`);
  await pool.end();
}
