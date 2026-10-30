import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";

// Helper to get authenticated user from session cookie
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_session")?.value;
  if (!token) return null;
  return await verifyUserToken(token);
}

// GET /api/client/licenses — List licenses owned by this Telegram user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute({
      sql: "SELECT ip_address, client_name, expired_date, status, label, domain, is_monitoring_enabled FROM licenses WHERE tele_id = ? ORDER BY client_name ASC",
      args: [user.tele_id],
    });

    return NextResponse.json({ licenses: result.rows });
  } catch (error) {
    console.error("Client licenses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 });
  }
}

// POST /api/client/licenses — Register new license by user
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ip_address, client_name, expired_date, label, domain } = await request.json();

    if (!ip_address || !client_name || !expired_date || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const finalLabel = (label || "tunneling").toLowerCase();
    if (finalLabel !== "zivpn" && finalLabel !== "tunneling") {
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

    // Insert new license owned by this Telegram user
    await db.execute({
      sql: `INSERT INTO licenses (ip_address, client_name, expired_date, status, auth_key, tele_id, label, domain, is_monitoring_enabled)
            VALUES (?, ?, ?, 'active', '', ?, ?, ?, 0)`,
      args: [ip_address, client_name, expired_date, user.tele_id, finalLabel, domain || null],
    });

    return NextResponse.json({ success: true, message: "License registered successfully" });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "IP address already registered" }, { status: 400 });
    }
    console.error("Client license create error:", error);
    return NextResponse.json({ error: "Failed to register license" }, { status: 500 });
  }
}
