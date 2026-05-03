const https = require("https");

// URL Production Vercel Anda
const TARGET_URL = "https://licence-manager-nu.vercel.app/api/cron/check-expirations";

// Rahasia Cron (Jika Anda mengatur CRON_SECRET di .env Vercel, masukkan di sini, jika tidak, kosongkan)
const CRON_SECRET = process.env.CRON_SECRET || "";

// Interval waktu: 1 Jam (dalam milidetik)
const INTERVAL = 60 * 60 * 1000;

function pingCron() {
  console.log(`[${new Date().toLocaleString()}] ⏳ Memulai ping ke Vercel: ${TARGET_URL}`);

  const options = {
    method: "GET",
    headers: {}
  };

  if (CRON_SECRET) {
    options.headers["Authorization"] = `Bearer ${CRON_SECRET}`;
  }

  const req = https.request(TARGET_URL, options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[${new Date().toLocaleString()}] ✅ Berhasil terhubung ke Vercel (Status: ${res.statusCode})`);
        console.log(`[${new Date().toLocaleString()}] 📄 Respon Vercel: ${data}`);
      } else {
        console.log(`[${new Date().toLocaleString()}] ⚠️ Peringatan: Vercel merespon dengan status error (Status: ${res.statusCode})`);
        console.log(`[${new Date().toLocaleString()}] 📄 Detail Respon: ${data}`);
      }
      console.log("-------------------------------------------------");
    });
  });

  req.on("error", (error) => {
    console.error(`[${new Date().toLocaleString()}] ❌ GAGAL terhubung ke Vercel!`);
    console.error(`[${new Date().toLocaleString()}] 🔧 Pesan Error:`, error.message);
    console.log("-------------------------------------------------");
  });

  req.end();
}

console.log("=================================================");
console.log(`🚀 PM2 Cron Job Notifikasi Vercel Diaktifkan!`);
console.log(`🌐 Target: ${TARGET_URL}`);
console.log(`⏱️ Interval: ${INTERVAL / 1000 / 60} menit`);
console.log("=================================================");

// Jalankan ping pertama kali saat script di-start
pingCron();

// Set interval agar berjalan berulang setiap jam
setInterval(pingCron, INTERVAL);
