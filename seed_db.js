const { createClient } = require('@libsql/client');

const db = createClient({
  url: 'file:./local.db',
});

async function seed() {
  try {
    await db.execute(`
      INSERT INTO licenses (ip_address, client_name, expired_date, status, auth_key, tele_id, label, domain, is_monitoring_enabled)
      VALUES
        ('192.168.1.1', 'Alpha-Node', '2025-12-31', 'active', 'auth_1', 'tele_1', 'zivpn', 'alpha.example.com', 1),
        ('192.168.1.2', 'Beta-Node', '2025-12-31', 'active', 'auth_2', 'tele_2', 'tunneling', 'beta.example.com', 0),
        ('192.168.1.3', 'Gamma-Node', '2025-12-31', 'active', 'auth_3', 'tele_3', 'zivpn', 'gamma.example.com', 1)
    `);
    console.log("Seeded database successfully.");
  } catch (err) {
    console.error("Error seeding:", err);
  }
}

seed();
