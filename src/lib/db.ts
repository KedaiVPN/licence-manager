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
        auth_key TEXT NOT NULL
      )
    `);

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

    console.log("Database initialized and tables verified.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}
