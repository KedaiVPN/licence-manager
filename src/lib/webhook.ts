import axios from "axios";
import { db } from "./db";

export async function sendWebhook(
  ipAddress: string,
  authKey: string,
  payload: {
    action: "update" | "delete";
    client_name: string;
    expired_date: string;
    status: "active" | "banned";
  }
) {
  // If deleting or banning, send an expired date in the past
  if (payload.action === "delete" || payload.status === "banned") {
    payload.expired_date = "2000-01-01";
    payload.status = "banned"; // Ensure status is banned on delete as well for the VPS logic
  }

  const url = `http://${ipAddress}:5888/callback/licence?auth=${authKey}`;

  try {
    const response = await axios.post(url, payload, {
      timeout: 5000, // 5 seconds timeout
    });

    console.log(`Webhook successfully sent to ${ipAddress}. Response status: ${response.status}`);
    return true;
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error occurred while sending webhook";
    console.error(`Failed to send webhook to ${ipAddress}:`, errorMessage);

    // Save to webhook_logs for manual retry
    try {
      await db.execute({
        sql: `INSERT INTO webhook_logs (ip_address, payload, error_message) VALUES (?, ?, ?)`,
        args: [ipAddress, JSON.stringify(payload), errorMessage],
      });
      console.log(`Failed webhook logged to database for ${ipAddress}`);
    } catch (dbError) {
      console.error("Failed to save webhook log to database:", dbError);
    }

    return false;
  }
}
