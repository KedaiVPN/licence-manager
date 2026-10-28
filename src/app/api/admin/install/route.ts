import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/install-crypto";

// POST /api/admin/install — buat job instalasi baru untuk satu lisensi.
// Body: { ip_address, domain, ssh_port?, password }
// Password dienkripsi sebelum masuk DB (AES-256-GCM, INSTALL_ENC_KEY).
export async function POST(request: Request) {
  try {
    const { ip_address, client_name, domain, ssh_port, password } =
      await request.json();

    if (!ip_address || !domain || !password) {
      return NextResponse.json(
        { error: "ip_address, domain, and password are required" },
        { status: 400 }
      );
    }

    const encKey = process.env.INSTALL_ENC_KEY || "";
    if (encKey.length !== 32) {
      return NextResponse.json(
        { error: "INSTALL_ENC_KEY is not configured (must be 32 chars)" },
        { status: 500 }
      );
    }

    // Pastikan lisensinya ada dan aktif — jangan izinkan install utk lisensi asing.
    const licenseResult = await db.execute({
      sql: "SELECT ip_address, client_name, status FROM licenses WHERE ip_address = ?",
      args: [ip_address],
    });

    if (licenseResult.rows.length === 0) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const license = licenseResult.rows[0] as any;

    if (license.status !== "active") {
      return NextResponse.json(
        { error: "License is not active; install blocked" },
        { status: 400 }
      );
    }

    // Jangan bolehkan dua job berjalan paralel untuk IP yang sama.
    const active = await db.execute({
      sql: "SELECT id FROM install_jobs WHERE ip_address = ? AND status IN ('pending','running')",
      args: [ip_address],
    });
    if (active.rows.length > 0) {
      return NextResponse.json(
        { error: "An install job is already pending/running for this IP" },
        { status: 409 }
      );
    }

    const passwordEnc = encryptSecret(String(password), process.env.INSTALL_ENC_KEY as string);

    const insert = await db.execute({
      sql: `INSERT INTO install_jobs (ip_address, client_name, domain, ssh_port, password_enc, status, log)
            VALUES (?, ?, ?, ?, ?, 'pending', '')`,
      args: [
        ip_address,
        client_name || (licenseResult.rows[0] as any).client_name,
        domain,
        ssh_port || 22,
        passwordEnc,
      ],
    });

    return NextResponse.json({
      success: true,
      job_id: Number(insert.lastInsertRowid),
      message: "Install job queued",
    });
  } catch (error) {
    console.error("Install job create error:", error);
    return NextResponse.json(
      { error: "Failed to create install job" },
      { status: 500 }
    );
  }
}

// GET list jobs (for admin dashboard list view)
// Support ?ip=<address> -> return the latest job for that IP (resume view).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get("ip");
    if (ip) {
      const res = await db.execute({
        sql: "SELECT id, ip_address, client_name, domain, status, log, created_at, started_at, finished_at FROM install_jobs WHERE ip_address = ? ORDER BY id DESC LIMIT 1",
        args: [ip],
      });
      return NextResponse.json({ job: res.rows[0] || null });
    }
    const result = await db.execute(
      "SELECT id, ip_address, client_name, domain, status, created_at, started_at, finished_at FROM install_jobs ORDER BY id DESC LIMIT 100"
    );
    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

// DELETE /api/admin/install?id=123 — cancel a pending job.
// Hanya job 'pending' yang bisa dibatalkan (running tidak disentuh agar
// konsistensi dengan daemon yang sedang bekerja).
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const upd = await db.execute({
      sql: "UPDATE install_jobs SET status = 'cancelled', finished_at = datetime('now') WHERE id = ? AND status = 'pending'",
      args: [id],
    });
    if (upd.rowsAffected === 0) {
      return NextResponse.json(
        { error: "Job not found or not cancellable (only pending jobs can be cancelled)" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
  }
}
