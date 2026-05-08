import re

with open('src/lib/db.ts', 'r') as f:
    content = f.read()

# Add domain and is_monitoring_enabled to the creation schema if not exists
if 'domain TEXT' not in content:
    content = content.replace(
        "tele_id TEXT,\n        label TEXT,\n        notif_state TEXT DEFAULT '{}'\n      )",
        "tele_id TEXT,\n        label TEXT,\n        notif_state TEXT DEFAULT '{}',\n        domain TEXT,\n        is_monitoring_enabled INTEGER DEFAULT 0\n      )"
    )

# Add migration logic
migration_logic = """
      if (!columns.includes('notif_state')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN notif_state TEXT DEFAULT '{}'");
      }

      if (!columns.includes('domain')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN domain TEXT");
      }

      if (!columns.includes('is_monitoring_enabled')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN is_monitoring_enabled INTEGER DEFAULT 0");
      }
"""

if 'columns.includes(\'domain\')' not in content:
    content = content.replace(
        """      if (!columns.includes('notif_state')) {
        await db.execute("ALTER TABLE licenses ADD COLUMN notif_state TEXT DEFAULT '{}'");
      }""",
        migration_logic.strip()
    )

with open('src/lib/db.ts', 'w') as f:
    f.write(content)
