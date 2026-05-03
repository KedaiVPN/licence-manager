import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const BOT_API_KEY = process.env.BOT_API_KEY;
const ADMIN_TELE_ID = process.env.ADMIN_TELE_ID || process.env["ADMIN_TELE-ID"];

// Function to send a message via Telegram Bot API
async function sendMessage(chatId: string | number, text: string) {
  if (!BOT_API_KEY) return;

  try {
    const url = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("Error sending telegram message:", error);
  }
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Check if there is a message with text
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id.toString();
      const text = update.message.text.trim();
      const username = update.message.from.username || update.message.from.first_name || "User";

      if (text === "/start") {
        let serverCount = 0;

        // Fetch total licenses depending on user status
        if (chatId === ADMIN_TELE_ID) {
          // Admin: show all
          const result = await db.execute("SELECT COUNT(*) as count FROM licenses");
          serverCount = Number(result.rows[0].count);
        } else {
          // Check if this chat.id exists in our licenses table as tele_id
          const userCheck = await db.execute({
            sql: "SELECT COUNT(*) as count FROM licenses WHERE tele_id = ?",
            args: [chatId],
          });
          const userLicenses = Number(userCheck.rows[0].count);

          if (userLicenses > 0) {
            // User is registered
            serverCount = userLicenses;
          } else {
            // Unregistered user: show active licenses without tele_id
            const result = await db.execute("SELECT COUNT(*) as count FROM licenses WHERE status = 'active' AND (tele_id IS NULL OR tele_id = '')");
            serverCount = Number(result.rows[0].count);
          }
        }

        const responseText = `█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
█░░╦─╦╔╗╦─╔╗╔╗╔╦╗╔╗░░█
█░░║║║╠─║─║─║║║║║╠─░░█
█░░╚╩╝╚╝╚╝╚╝╚╝╩─╩╚╝░░█
█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█

👋 Username: <code>${username}</code>
🆔 ID Anda: <code>${chatId}</code>
🖥️Total server: <code>${serverCount}</code>`;

        await sendMessage(chatId, responseText);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
