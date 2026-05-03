import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const BOT_API_KEY = process.env.BOT_API_KEY;
const ADMIN_TELE_ID = process.env.ADMIN_TELE_ID || process.env["ADMIN_TELE-ID"];

async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!BOT_API_KEY || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    console.error("Error sending telegram notification:", error);
  }
}

export async function GET(request: Request) {
  // Verifying cron secret if provided by vercel
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get current time in WIB (Asia/Jakarta)
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const wibDate = new Date(nowStr);
    const today = new Date(wibDate.getFullYear(), wibDate.getMonth(), wibDate.getDate());
    const currentHour = wibDate.getHours();

    const result = await db.execute("SELECT * FROM licenses WHERE status = 'active'");

    for (const license of result.rows) {
      const { ip_address, client_name, expired_date, tele_id, notif_state } = license as any;

      const expDateWib = new Date(expired_date + "T00:00:00");

      // Calculate diff in days
      const diffTime = expDateWib.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let state: Record<string, boolean> = {};
      try {
        state = JSON.parse(notif_state || "{}");
      } catch (e) {
        state = {};
      }

      // We'll generate a unique key for the notification to prevent double sends
      const dateStr = today.toISOString().split('T')[0];

      let message = "";
      let shouldSend = false;
      let stateKey = "";

      if (diffDays === 2 && currentHour === 0) {
        stateKey = `2days_${dateStr}`;
        if (!state[stateKey]) {
          shouldSend = true;
          message = `━━━━━━━━━━━━━━━━━━━━
⚠️WARNING LICENCE SCRIPT⚠️
━━━━━━━━━━━━━━━━━━━━
» NAMA: ${client_name}
» IP        : ${ip_address}
━━━━━━━━━━━━━━━━━━━━
» TGL EXP: ${expired_date}
» TERSISA: 2hari
» PESAN   : Segera perpanjang vps nya,
Mumpung masih agak lama, biar gk panik 😌
━━━━━━━━━━━━━━━━━━━━`;
        }
      } else if (diffDays === 1 && [0, 7, 18].includes(currentHour)) {
        stateKey = `1day_${dateStr}_${currentHour}`;
        if (!state[stateKey]) {
          shouldSend = true;
          message = `━━━━━━━━━━━━━━━━━━━━
‼️WARNING LICENCE SCRIPT‼️
━━━━━━━━━━━━━━━━━━━━
» NAMA: ${client_name}
» IP        : ${ip_address}
━━━━━━━━━━━━━━━━━━━━
» TGL EXP: ${expired_date}
» TERSISA: 1 hari
» PESAN   : Segera perpanjang vps nya,
Biar server nya gk mati dan gk di demo user😏
━━━━━━━━━━━━━━━━━━━━`;
        }
      } else if (diffDays <= 0) {
        stateKey = `expired_${expired_date}`;
        if (!state[stateKey]) {
          shouldSend = true;
          message = `━━━━━━━━━━━━━━━━━━━━
🚫WARNING LICENCE SCRIPT🚫
━━━━━━━━━━━━━━━━━━━━
» NAMA: ${client_name}
» IP        : ${ip_address}
━━━━━━━━━━━━━━━━━━━━
» TGL EXP: ${expired_date}
» TERSISA: Gk ada sisa
» PESAN   : Server ini sudah expired 😵‍💫
━━━━━━━━━━━━━━━━━━━━`;
        }
      }

      if (shouldSend) {
        // Send to ADMIN
        if (ADMIN_TELE_ID) {
          await sendTelegramMessage(ADMIN_TELE_ID, message);
        }

        // Send to Client if tele_id exists
        if (tele_id) {
          await sendTelegramMessage(tele_id, message);
        }

        // Update state
        state[stateKey] = true;
        await db.execute({
          sql: "UPDATE licenses SET notif_state = ? WHERE ip_address = ?",
          args: [JSON.stringify(state), ip_address]
        });
      }
    }

    return NextResponse.json({ success: true, checked: result.rows.length });
  } catch (error) {
    console.error("Cron Expiration Check Error:", error);
    return NextResponse.json({ error: "Failed to check expirations" }, { status: 500 });
  }
}
