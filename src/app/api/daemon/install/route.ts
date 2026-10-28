import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/install-crypto";

// Daemon-only endpoints (token'd, NOT admin JWT).
// GET /api/daemon/install?status=pending -> claim next pending job
// Log & finish ada di /api/daemon/install/[id] (lihat [id]/route.ts).

function isAuthorized(request: Request): boolean {
  const token = process.env.DAEMON_TOKEN || "";
  if (!token) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${token}`;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const result = await db.execute({
      sql: `SELECT id, ip_address, client_name, domain, ssh_port, password_enc
            FROM install_jobs
            WHERE status = ?
            ORDER BY id ASC
            LIMIT 1`,
      args: [status],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ job: null });
    }

    const job = result.rows[0] as any;
    // Decrypt password only on the daemon side.
    const password = decryptSecret(job.password_enc, process.env.INSTALL_ENC_KEY || "");
    if (!password) {
      return NextResponse.json({ job: null });
    }

    // Atomically claim: set to 'running'.
    await db.execute({
      sql: "UPDATE install_jobs SET status = 'running', started_at = datetime('now') WHERE id = ? AND status = 'pending'",
      args: [job.id],
    });

    return NextResponse.json({
      job: {
        id: job.id,
        ip_address: job.ip_address,
        client_name: job.client_name,
        domain: job.domain,
        ssh_port: Number(job.ssh_port) || 22,
        password,
      },
    });
  } catch (error) {
    console.error("Daemon install claim error:", error);
    return NextResponse.json({ error: "Failed to claim job" }, { status: 500 });
  }
}
