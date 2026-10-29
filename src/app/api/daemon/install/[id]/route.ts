import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Daemon-only: /api/daemon/install/[id]
// POST  -> append log line { line }
// PATCH -> finish job { status, message? }

function isAuthorized(request: Request): boolean {
  const token = process.env.DAEMON_TOKEN || "";
  if (!token) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${token}`;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// POST /api/daemon/install/:id/log  { line }
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const { id } = await ctx.params;
    const { line } = await request.json();
    if (!id || typeof line !== "string") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE install_jobs SET log = log || ? WHERE id = ?",
      args: [line + "\n", id],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Daemon install log error:", error);
    return NextResponse.json({ error: "Failed to append log" }, { status: 500 });
  }
}

// PATCH /api/daemon/install/[id] { status: 'success'|'failed'|..., message? }
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const { id } = await ctx.params;
    const { status, message } = await request.json();

    if (!["success", "failed", "needs_confirmation", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const logSuffix = message ? message + "\n" : "";

    // Update install job status
    await db.execute({
      sql: "UPDATE install_jobs SET status = ?, finished_at = datetime('now'), log = log || ? WHERE id = ?",
      args: [status, logSuffix, id],
    });

    // If install succeeded, auto-enable monitoring for the license
    if (status === "success") {
      try {
        const jobRes = await db.execute({
          sql: "SELECT ip_address FROM install_jobs WHERE id = ?",
          args: [id],
        });

        if (jobRes.rows.length > 0) {
          const ipAddress = (jobRes.rows[0] as any).ip_address;
          await db.execute({
            sql: "UPDATE licenses SET is_monitoring_enabled = 1 WHERE ip_address = ? AND domain IS NOT NULL AND status = 'active'",
            args: [ipAddress],
          });
        }
      } catch (e) {
        console.error("Failed to auto-enable monitoring:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Daemon install finish error:", error);
    return NextResponse.json({ error: "Failed to finish job" }, { status: 500 });
  }
}
