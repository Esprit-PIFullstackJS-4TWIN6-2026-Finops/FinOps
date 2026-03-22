import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "..", "migrations");

async function ensureTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function run() {
  const conn = await pool.getConnection();
  try {
    await ensureTable(conn);
    const [doneRows] = await conn.query("SELECT filename FROM schema_migrations");
    const done = new Set(doneRows.map((r) => r.filename));
    const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await conn.beginTransaction();
      try {
        await conn.query(sql);
        await conn.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
        await conn.commit();
        console.log(`Applied migration: ${file}`);
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    }
  } finally {
    conn.release();
    await pool.end();
  }
}

run()
  .then(() => {
    console.log("Migrations complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

