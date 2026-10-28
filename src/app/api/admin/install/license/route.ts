import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get("ip");
    if (!ip) {
      return NextResponse.json({ error: "ip is required" }, { status: 400 });
    }

    const res = await db.execute({
      sql: "SELECT ip_address, client_name, status, domain FROM licenses WHERE ip_address = ?",
      args: [ip],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ license: null });
    }

    return NextResponse.json({ license: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch license" }, { status: 500 });
  }
}
