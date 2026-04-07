import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWebhook } from "@/lib/webhook";

// GET failed webhooks
export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM webhook_logs ORDER BY created_at DESC");
    return NextResponse.json({ logs: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch webhook logs" }, { status: 500 });
  }
}

// POST retry failed webhook
export async function POST(request: Request) {
  try {
    const { log_id } = await request.json();

    if (!log_id) {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 });
    }

    // Get the log entry
    const logResult = await db.execute({
      sql: "SELECT * FROM webhook_logs WHERE id = ?",
      args: [log_id],
    });

    if (logResult.rows.length === 0) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const log = logResult.rows[0];
    const ipAddress = log.ip_address as string;
    const payloadStr = log.payload as string;

    // Check if the license still exists to get the current auth_key
    const licenseResult = await db.execute({
      sql: "SELECT auth_key FROM licenses WHERE ip_address = ?",
      args: [ipAddress],
    });

    if (licenseResult.rows.length === 0) {
      return NextResponse.json({
        error: "Cannot retry webhook: The associated license no longer exists in the database."
      }, { status: 400 });
    }

    const authKey = licenseResult.rows[0].auth_key as string;
    const payload = JSON.parse(payloadStr);

    // Attempt to resend the webhook
    const success = await sendWebhook(ipAddress, authKey, payload);

    if (success) {
      // If successful, delete the log
      await db.execute({
        sql: "DELETE FROM webhook_logs WHERE id = ?",
        args: [log_id],
      });
      return NextResponse.json({ success: true, message: "Webhook retry successful" });
    } else {
      return NextResponse.json({
        success: false,
        message: "Webhook retry failed again. The VPS might still be offline."
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error retrying webhook:", error);
    return NextResponse.json({ error: "Internal server error during retry" }, { status: 500 });
  }
}

// DELETE a specific webhook log or clear all
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      await db.execute({
        sql: "DELETE FROM webhook_logs WHERE id = ?",
        args: [id],
      });
    } else {
      // Clear all logs
      await db.execute("DELETE FROM webhook_logs");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete log(s)" }, { status: 500 });
  }
}
