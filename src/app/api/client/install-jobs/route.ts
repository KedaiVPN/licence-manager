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

// GET /api/client/install-jobs — List user's install jobs (sanitized, no password)
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute({
      sql: `SELECT id, ip_address, client_name, domain, status, log, started_at, finished_at, created_at
            FROM install_jobs
            WHERE owner_tele_id = ?
            ORDER BY id DESC
            LIMIT 50`,
      args: [user.tele_id],
    });

    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    console.error("Client install-jobs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch install jobs" }, { status: 500 });
  }
}
