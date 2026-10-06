import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Endpoint /api/check/izintxt
// Returns all active licenses in plaintext format for backward compatibility
// Format: ### client_name expired_date ip_address label
// Example: ### izal 2026-12-31 103.150.61.51 @VIP

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let ip = searchParams.get("ip");

    // Build query
    let sql = "SELECT client_name, expired_date, ip_address, label FROM licenses WHERE status = 'active'";
    let params: any[] = [];

    // If IP is provided, filter by IP (for single IP lookup)
    if (ip) {
      sql += " AND ip_address = ?";
      params.push(ip);
    }

    sql += " ORDER BY expired_date DESC";

    const result = await db.execute({ sql, args: params });

    if (result.rows.length === 0) {
      // Return empty response (same as GitHub "izin" file)
      return new NextResponse("", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Format rows to plaintext
    let plaintext = "";
    for (const row of result.rows) {
      plaintext += `### ${row.client_name} ${row.expired_date} ${row.ip_address} ${row.label || ""}
`;
    }

    return new NextResponse(plaintext, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error fetching plaintext licenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
