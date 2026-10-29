import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Admin-only: Backfill is_monitoring_enabled=1 for licenses with successful install jobs
// This is a one-time operation for licenses installed before the auto-enable feature was added.
export async function POST(request: Request) {
  try {
    // Check authorization header
    const adminToken = process.env.ADMIN_DASHBOARD_TOKEN || "";
    if (!adminToken) {
      return NextResponse.json(
        { error: "Backfill not configured" },
        { status: 503 }
      );
    }

    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update licenses with successful install jobs
    await db.execute({
      sql: `UPDATE licenses 
            SET is_monitoring_enabled = 1 
            WHERE domain IS NOT NULL 
              AND status = 'active'
              AND is_monitoring_enabled = 0
              AND ip_address IN (
                SELECT DISTINCT ip_address FROM install_jobs 
                WHERE status = 'success'
              )`,
      args: [],
    });

    // Count how many were updated
    const result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM licenses 
            WHERE domain IS NOT NULL 
              AND status = 'active'
              AND is_monitoring_enabled = 1
              AND ip_address IN (
                SELECT DISTINCT ip_address FROM install_jobs 
                WHERE status = 'success'
              )`,
      args: [],
    });

    const count = (result.rows[0] as any)?.count || 0;

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${count} licenses auto-enabled for monitoring`,
      count,
    });
  } catch (error) {
    console.error("Backfill monitoring error:", error);
    return NextResponse.json(
      { error: "Failed to backfill monitoring" },
      { status: 500 }
    );
  }
}
