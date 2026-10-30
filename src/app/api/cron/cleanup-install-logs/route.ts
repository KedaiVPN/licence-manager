import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  // Verify cron secret if set
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get current time in WIB (Asia/Jakarta) for logging
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const wibDate = new Date(nowStr);
    const t = wibDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    // Find all install_jobs that finished more than 1 day ago and have logs
    // Turso stores finished_at as TEXT in ISO datetime format via datetime('now')
    const checkResult = await db.execute({
      sql: `SELECT id, ip_address, client_name FROM install_jobs
            WHERE finished_at IS NOT NULL
            AND datetime(finished_at) < datetime('now', '-1 day')
            AND log IS NOT NULL
            AND log != ''`,
      args: [],
    });

    const jobsToClean = checkResult.rows.length;

    if (jobsToClean > 0) {
      // Clear logs for old finished jobs
      await db.execute({
        sql: `UPDATE install_jobs
              SET log = ''
              WHERE finished_at IS NOT NULL
              AND datetime(finished_at) < datetime('now', '-1 day')`,
        args: [],
      });

      console.log(`[${t}] [CLEANUP] Cleared logs from ${jobsToClean} old install jobs`);
    } else {
      console.log(`[${t}] [CLEANUP] No old logs to clean`);
    }

    return NextResponse.json({
      success: true,
      cleaned: jobsToClean,
      message: `Cleared logs from ${jobsToClean} install jobs older than 1 day`,
    });
  } catch (error) {
    console.error("Cleanup Install Logs Error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup install logs" },
      { status: 500 }
    );
  }
}
