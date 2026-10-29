import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL || "file:./local.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || "";

export const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

export async function initDb() {
  try {
    // Create licenses table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        ip_address TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        expired_date TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        auth_key TEXT NOT NULL,
        tele_id TEXT,
        label TEXT,
        notif_state TEXT DEFAULT '{}',
        domain TEXT,
        is_monitoring_enabled INTEGER DEFAULT 0
      )
    `);

    // Migrate existing table if needed by checking columns
    try {
      const result = await db.execute("PRAGMA table_info(licenses)");
      const columns = result.rows.map((row: any) => row.name);

      if (!columns.includes('tele_id')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN tele_id TEXT");
      }

            if (!columns.includes('label')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN label TEXT");
      }

if (!columns.includes('notif_state')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN notif_state TEXT DEFAULT '{}'");
      }

      if (!columns.includes('domain')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN domain TEXT");
      }

      if (!columns.includes('is_monitoring_enabled')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN is_monitoring_enabled INTEGER DEFAULT 0");
      }
    } catch (e) {
      console.error("Failed to migrate licenses table:", e);
    }

    // Create webhook_logs table to store failed webhooks for manual retry
    await db.execute(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'failed',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create install_jobs table for remote VPS script installation
    await db.execute(`
      CREATE TABLE IF NOT EXISTS install_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        client_name TEXT NOT NULL,
        domain TEXT NOT NULL,
        ssh_port INTEGER DEFAULT 22,
        password_enc TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        log TEXT DEFAULT '',
        started_at DATETIME,
        finished_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        owner_tele_id TEXT
      )
    `);

    // Migrate install_jobs table: add owner_tele_id if missing
    try {
      const ijColumns = (await db.execute("PRAGMA table_info(install_jobs)")).rows.map((r: any) => r.name);
      if (!ijColumns.includes('owner_tele_id')) {
        await db.execute("ALTER TABLE install_jobs ADD COLUMN owner_tele_id TEXT");
      }
    } catch (e) {
      console.error("Failed to migrate install_jobs table:", e);
    }

    console.log("Database initialized and tables verified.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}
