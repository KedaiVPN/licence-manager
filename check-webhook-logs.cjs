const { createClient } = require('@libsql/client');
require('dotenv').config();

// Use local sqlite for testing
const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || '' });

async function run() {
  const res = await db.execute('SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 20');
  console.log(JSON.stringify(res.rows, null, 2));
}
run().catch(e => console.error('ERROR:', e.message));
