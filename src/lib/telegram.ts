import { NextResponse } from "next/server";

const BOT_API_KEY = process.env.BOT_API_KEY;
const ADMIN_TELE_ID = process.env.ADMIN_TELE_ID || process.env["ADMIN_TELE-ID"];

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!BOT_API_KEY || !chatId) return false;
  
  try {
    const url = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text, 
        parse_mode: "HTML" 
      }),
    });
    
    if (!response.ok) {
      console.error(`Telegram API error: ${response.status} ${response.statusText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error sending telegram message:", error);
    return false;
  }
}

export async function sendLicenseNotification(
  clientName: string,
  ipAddress: string,
  expiredDate: string,
  teleId: string | null,
  action: "create" | "extend" = "create"
): Promise<void> {
  const dateStr = new Date(expiredDate).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = `━━━━━━━━━━━━━━━━━━━━
✅ LICENSE ${action === "extend" ? "EXTENSION" : "CREATED"} ✅
━━━━━━━━━━━━━━━━━━━━
» NAMA: <code>${clientName}</code>
» IP      : <code>${ipAddress}</code>
━━━━━━━━━━━━━━━━━━━━
» TGL EXP: <code>${dateStr}</code>
» PESAN   : Lisensi ${action === "extend" ? "diperpanjang" : "berhasil dibuat"}
━━━━━━━━━━━━━━━━━━━━`;

  // Prioritas: kirim ke client (tele_id) dulu, jika kosong kirim ke admin
  let sent = false;
  
  if (teleId) {
    sent = await sendTelegramMessage(teleId, message);
  }

  // Fallback ke admin jika tidak terkirim ke client
  if (!sent && ADMIN_TELE_ID) {
    await sendTelegramMessage(ADMIN_TELE_ID, message);
  }
}
