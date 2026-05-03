const https = require('https');

// Usage: node setup-webhook.js <YOUR_BOT_API_KEY> <YOUR_VERCEL_DOMAIN>
const botKey = process.argv[2];
const domain = process.argv[3];

if (!botKey || !domain) {
  console.error("Usage: node setup-webhook.js <YOUR_BOT_API_KEY> <YOUR_VERCEL_DOMAIN>");
  console.error("Example: node setup-webhook.js 12345:ABCDE my-license-manager.vercel.app");
  process.exit(1);
}

const webhookUrl = `https://${domain}/api/telegram/webhook`;
const apiUrl = `https://api.telegram.org/bot${botKey}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

console.log(`Setting webhook to: ${webhookUrl}`);

https.get(apiUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("Telegram API Response:", data);
  });
}).on("error", (err) => {
  console.error("Error setting webhook:", err.message);
});
