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

// GET /api/client/install/license?ip=...
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

    // Get license milik user ini berdasarkan IP
    const res = await db.execute({
      sql: "SELECT ip_address, client_name, status, domain FROM licenses WHERE ip_address = ? AND tele_id = ?",
      args: [ip, user.tele_id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ license: null });
    }

    return NextResponse.json({ license: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch license" }, { status: 500 });
  }
}
