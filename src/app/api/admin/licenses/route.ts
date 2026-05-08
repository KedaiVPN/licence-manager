import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWebhook } from "@/lib/webhook";
import crypto from "crypto";

// GET all licenses
export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM licenses ORDER BY client_name ASC");
    return NextResponse.json({ licenses: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 });
  }
}

// POST new license
export async function POST(request: Request) {
  try {
    const { ip_address, client_name, expired_date, auth_key, tele_id, label, domain, is_monitoring_enabled } = await request.json();

    if (!ip_address || !client_name || !expired_date || !label) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (label !== "zivpn" && label !== "tunneling") {
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

    const finalAuthKey = auth_key || "";
    const finalTeleId = tele_id || null;

    await db.execute({
      sql: "INSERT INTO licenses (ip_address, client_name, expired_date, status, auth_key, tele_id, label, domain, is_monitoring_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [ip_address, client_name, expired_date, "active", finalAuthKey, finalTeleId, label, domain || null, is_monitoring_enabled ? 1 : 0],
    });

    // Only send webhook if auth_key exists (new VPS might not have it yet)
    if (finalAuthKey) {
      // Await webhook to prevent serverless termination
      await sendWebhook(ip_address, finalAuthKey, {
        action: "update",
        client_name,
        expired_date,
        status: "active",
      });
    }

    return NextResponse.json({ success: true, message: "License created successfully" });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "IP address already registered" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create license" }, { status: 500 });
  }
}

// PUT update license
export async function PUT(request: Request) {
  try {
    const { ip_address, client_name, expired_date, status, auth_key, tele_id, label, domain, is_monitoring_enabled } = await request.json();

    if (!ip_address) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    }

    const updates = [];
    const args: (string | number)[] = [];

    if (client_name !== undefined) {
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
    }
    if (expired_date !== undefined) {
      updates.push("expired_date = ?");
      args.push(expired_date);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      args.push(status);
    }
    if (auth_key !== undefined) {
      updates.push("auth_key = ?");
      args.push(auth_key);
    }
    if (tele_id !== undefined) {
      updates.push("tele_id = ?");
      args.push(tele_id || null);
    }
    if (label !== undefined) {
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
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(ip_address);

    const sql = "UPDATE licenses SET " + updates.join(", ") + " WHERE ip_address = ?";
    await db.execute({
      sql,
      args,
    });

    // Fetch the updated license to get the auth_key
    const result = await db.execute({
      sql: "SELECT * FROM licenses WHERE ip_address = ?",
      args: [ip_address],
    });

    if (result.rows.length > 0) {
      const license = result.rows[0];

      // Only send webhook if auth_key exists
      if (license.auth_key) {
        // Await webhook to prevent serverless termination
        await sendWebhook(
          license.ip_address as string,
          license.auth_key as string,
          {
            action: "update",
            client_name: license.client_name as string,
            expired_date: license.expired_date as string,
            status: license.status as "active" | "banned",
          }
        );
      }
    }

    return NextResponse.json({ success: true, message: "License updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update license" }, { status: 500 });
  }
}

// DELETE license
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip_address = searchParams.get("ip");

    if (!ip_address) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    }

    // Fetch before deleting to get auth_key and details for webhook
    const result = await db.execute({
      sql: "SELECT * FROM licenses WHERE ip_address = ?",
      args: [ip_address],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const license = result.rows[0];

    // Only send webhook if auth_key exists
    if (license.auth_key) {
      // Await webhook to prevent serverless termination (it will send expired_date in the past)
      await sendWebhook(
        license.ip_address as string,
        license.auth_key as string,
        {
          action: "delete",
          client_name: license.client_name as string,
          expired_date: license.expired_date as string,
          status: license.status as "active" | "banned",
        }
      );
    }

    // Now delete from database
    await db.execute({
      sql: "DELETE FROM licenses WHERE ip_address = ?",
      args: [ip_address],
    });

    return NextResponse.json({ success: true, message: "License deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete license" }, { status: 500 });
  }
}
