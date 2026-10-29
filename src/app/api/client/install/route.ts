import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_session")?.value;
  if (!token) return null;
  return await verifyUserToken(token);
}

// GET /api/client/install?ip=... — Get latest install job for this user's license
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ip = searchParams.get("ip");
    if (!ip) {
      return NextResponse.json({ error: "ip is required" }, { status: 400 });
    }

    // Get latest job for this IP belonging to this user
    const res = await db.execute({
      sql: "SELECT id, ip_address, client_name, domain, status, log, created_at, started_at, finished_at FROM install_jobs WHERE ip_address = ? AND owner_tele_id = ? ORDER BY id DESC LIMIT 1",
      args: [ip, user.tele_id],
    });

    return NextResponse.json({ job: res.rows[0] || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

// POST /api/client/install — Trigger installation for user's own license
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ip_address, ssh_port, password, domain, client_name } = await request.json();

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
    const { encryptSecret } = await import("@/lib/install-crypto");
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
        client_name || license.client_name,
        domain || license.domain || "-",
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
