import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function GET(request: Request, { params }: { params: Promise<{ label: string }> }) {
  const resolvedParams = await params;
  const label = resolvedParams.label;
  try {
    const { searchParams } = new URL(request.url);
    let ip = searchParams.get("ip");

    // If IP is not provided in query params, try to detect it from headers
    if (!ip) {
      const headersList = await headers();
      const forwardedFor = headersList.get("x-forwarded-for");
      const realIp = headersList.get("x-real-ip");

      if (forwardedFor) {
        ip = forwardedFor.split(',')[0].trim();
      } else if (realIp) {
        ip = realIp;
      }
    }

    if (!ip) {
      return NextResponse.json(
        { error: "Could not determine IP address. Please provide it via ?ip= parameter." },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT client_name, expired_date, status, label FROM licenses WHERE ip_address = ?",
      args: [ip],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({
        valid: false,
        message: "License not found"
      });
    }

    const license = result.rows[0];

    // Ensure label matches exactly
    if (license.label !== label) {
      return NextResponse.json({
        valid: false,
        message: "License not found"
      });
    }

    // If the license is found but status is banned, we also consider it invalid
    if (license.status === "banned") {
      return NextResponse.json({
        valid: false,
        message: "License is banned"
      });
    }

    return NextResponse.json({
      valid: true,
      client_name: license.client_name,
      expired_date: license.expired_date,
    });
  } catch (error) {
    console.error("Error checking license:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
