import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";
import { encryptSecret } from "@/lib/install-crypto";

// Helper to get authenticated user from session cookie
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_session")?.value;
  if (!token) return null;
  return await verifyUserToken(token);
}

// POST /api/client/install — Trigger installation for user's own license
// Body: { ip_address, ssh_port?, password }
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ip_address, ssh_port, password } = await request.json();

    if (!ip_address || !password) {
      return NextResponse.json({ error: "ip_address and password are required" }, { status: 400 });
    }

    // Verify license belongs to this user
    const licenseResult = await db.execute({
      sql: "SELECT * FROM licenses WHERE ip_address = ? AND tele_id = ?",
      args: [ip_address, user.tele_id],
    });

    if (licenseResult.rows.length === 0) {
      return NextResponse.json({ error: "License not found or not owned by you" }, { status: 403 });
    }

    const license = licenseResult.rows[0] as any;

    if (license.status !== "active") {
      return NextResponse.json({ error: "License is not active; install blocked" }, { status: 400 });
    }

    // Prevent parallel installs for the same IP
    const active = await db.execute({
      sql: "SELECT id FROM install_jobs WHERE ip_address = ? AND status IN ('pending','running')",
      args: [ip_address],
    });
    if (active.rows.length > 0) {
      return NextResponse.json({ error: "An install job is already pending/running for this IP" }, { status: 409 });
    }

    // Encrypt password
    const encKey = process.env.INSTALL_ENC_KEY || "";
    if (encKey.length !== 32) {
      return NextResponse.json({ error: "INSTALL_ENC_KEY is not configured (must be 32 chars)" }, { status: 500 });
    }
    const passwordEnc = encryptSecret(String(password), encKey);

    // Create install job
    const insert = await db.execute({
      sql: `INSERT INTO install_jobs (ip_address, client_name, domain, ssh_port, password_enc, status, log, owner_tele_id)
            VALUES (?, ?, ?, ?, ?, 'pending', '', ?)`,
      args: [
        ip_address,
        license.client_name,
        license.domain || "-",
        ssh_port || 22,
        passwordEnc,
        user.tele_id,
      ],
    });

    return NextResponse.json({
      success: true,
      job_id: Number(insert.lastInsertRowid),
      message: "Instalasi dimulai. Progress akan diupdate secara real-time.",
    });
  } catch (error) {
    console.error("Client install error:", error);
    return NextResponse.json({ error: "Failed to create install job" }, { status: 500 });
  }
}
