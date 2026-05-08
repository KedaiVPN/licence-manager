import re

with open('src/app/api/admin/licenses/route.ts', 'r') as f:
    content = f.read()

# Add domain and is_monitoring_enabled to POST
post_search = """    const { ip_address, client_name, expired_date, auth_key, tele_id, label } = await request.json();

    if (!ip_address || !client_name || !expired_date || !label) {"""

post_replace = """    const { ip_address, client_name, expired_date, auth_key, tele_id, label, domain, is_monitoring_enabled } = await request.json();

    if (!ip_address || !client_name || !expired_date || !label) {"""

content = content.replace(post_search, post_replace)

client_validation_post = """    if (label !== "zivpn" && label !== "tunneling") {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }

    // Validate client_name uniqueness
    const existingClient = await db.execute({
      sql: "SELECT ip_address FROM licenses WHERE client_name = ?",
      args: [client_name],
    });

    if (existingClient.rows.length > 0) {
      return NextResponse.json({ error: "Client name already exists (1 client = 1 node)" }, { status: 400 });
    }

    const finalAuthKey = auth_key || "";"""

content = content.replace("""    if (label !== "zivpn" && label !== "tunneling") {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }

    const finalAuthKey = auth_key || "";""", client_validation_post)

post_insert_search = """    await db.execute({
      sql: "INSERT INTO licenses (ip_address, client_name, expired_date, status, auth_key, tele_id, label) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [ip_address, client_name, expired_date, "active", finalAuthKey, finalTeleId, label],
    });"""

post_insert_replace = """    await db.execute({
      sql: "INSERT INTO licenses (ip_address, client_name, expired_date, status, auth_key, tele_id, label, domain, is_monitoring_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [ip_address, client_name, expired_date, "active", finalAuthKey, finalTeleId, label, domain || null, is_monitoring_enabled ? 1 : 0],
    });"""

content = content.replace(post_insert_search, post_insert_replace)

# Add domain and is_monitoring_enabled to PUT
put_search = """    const { ip_address, client_name, expired_date, status, auth_key, tele_id, label } = await request.json();"""

put_replace = """    const { ip_address, client_name, expired_date, status, auth_key, tele_id, label, domain, is_monitoring_enabled } = await request.json();"""

content = content.replace(put_search, put_replace)

put_client_name_search = """    if (client_name !== undefined) {
      updates.push("client_name = ?");
      args.push(client_name);
    }"""

put_client_name_replace = """    if (client_name !== undefined) {
      // Validate client_name uniqueness for PUT (excluding current IP)
      const existingClient = await db.execute({
        sql: "SELECT ip_address FROM licenses WHERE client_name = ? AND ip_address != ?",
        args: [client_name, ip_address],
      });

      if (existingClient.rows.length > 0) {
        return NextResponse.json({ error: "Client name already exists (1 client = 1 node)" }, { status: 400 });
      }
      updates.push("client_name = ?");
      args.push(client_name);
    }"""

content = content.replace(put_client_name_search, put_client_name_replace)


put_domain_monitoring = """    if (label !== undefined) {
      if (label !== "zivpn" && label !== "tunneling") {
        return NextResponse.json({ error: "Invalid label" }, { status: 400 });
      }
      updates.push("label = ?");
      args.push(label);
    }

    if (domain !== undefined) {
      updates.push("domain = ?");
      args.push(domain || null);
    }

    if (is_monitoring_enabled !== undefined) {
      updates.push("is_monitoring_enabled = ?");
      args.push(is_monitoring_enabled ? 1 : 0);
    }"""

content = content.replace("""    if (label !== undefined) {
      if (label !== "zivpn" && label !== "tunneling") {
        return NextResponse.json({ error: "Invalid label" }, { status: 400 });
      }
      updates.push("label = ?");
      args.push(label);
    }""", put_domain_monitoring)

with open('src/app/api/admin/licenses/route.ts', 'w') as f:
    f.write(content)
