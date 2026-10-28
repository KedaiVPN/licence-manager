// Daemon config — dibaca dari environment (di-set via PM2 ecosystem / .env di VPS utama).
module.exports = {
  VERCEL_BASE_URL: process.env.VERCEL_BASE_URL || "https://licence-manager-nu.vercel.app",
  DAEMON_TOKEN: process.env.DAEMON_TOKEN || "",
  INSTALL_ENC_KEY: process.env.INSTALL_ENC_KEY || "",
  CRON_SECRET: process.env.CRON_SECRET || "",
  // Interval polling job baru (ms)
  POLL_INTERVAL: Number(process.env.DAEMON_POLL_INTERVAL || 15000),
  // Interval ping cron expiry ke Vercel (ms) — default 1 jam, sama seperti cron.js lama
  CRON_INTERVAL: Number(process.env.CRON_INTERVAL || 60 * 60 * 1000),
};
