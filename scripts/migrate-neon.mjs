import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
if (!adminEmail) throw new Error("ADMIN_EMAIL não configurado.");

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  const sql = await fs.readFile(path.resolve("db/migrations/001_neon_auth_and_data.sql"), "utf8");
  await client.query("SELECT pg_advisory_lock($1)", [2026091501]);
  await client.query(sql);
  await client.query(`INSERT INTO app_users(email,display_name,role,active)
    VALUES ($1,'Administrador','administrador',TRUE)
    ON CONFLICT(email) DO UPDATE SET role='administrador',active=TRUE,updated_at=NOW()`, [adminEmail]);
  const counts = await client.query(`SELECT
    (SELECT COUNT(*)::int FROM alunos) alunos,
    (SELECT COUNT(*)::int FROM avaliacoes) avaliacoes,
    (SELECT COUNT(*)::int FROM textos) textos,
    (SELECT COUNT(*)::int FROM import_history) import_history`);
  console.log(JSON.stringify({ status: "ok", counts: counts.rows[0] }, null, 2));
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [2026091501]).catch(() => undefined);
  client.release();
  await pool.end();
}
