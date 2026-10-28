// ============================================================
// Multi-role daemon: cron expiry pinger + installer runner.
//
// Cara kerja:
//   - Semua env dibaca dari file .env di direktori yang sama.
//   - Jika DAEMON_TOKEN ter-set, role installer juga aktif.
//   - Cron expiry ping selalu aktif (idempotent, aman dobel dengan service.js lama).
//
// Untuk VPS yang SUDAH punya service.js di PM2:
//   1. Stop service lama:  pm2 stop service
//   2. Ganti entry point:  pm2 start /path/ke/service.js --name service
//   3. Buat file .env di direktori yang sama dengan service.js.
// ============================================================

// -- .env auto-loader (tanpa dependency) ----------------------
// Baca KEY=VALUE per baris, skip #comment, tanpa interpolation.
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const eq = line.indexOf("=");
      if (eq < 0) return;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    });
}

// -- Config (fallback dari .env atau process.env yang sudah di-set) --
const config = {
  VERCEL_BASE_URL:
    process.env.VERCEL_BASE_URL || "https://licence-manager-nu.vercel.app",
  CRON_SECRET: process.env.CRON_SECRET || "",
  DAEMON_TOKEN: process.env.DAEMON_TOKEN || "",
  INSTALL_ENC_KEY: process.env.INSTALL_ENC_KEY || "",
  POLL_INTERVAL: Number(process.env.DAEMON_POLL_INTERVAL || 15000), // ms
  CRON_INTERVAL: Number(process.env.CRON_INTERVAL || 60 * 60 * 1000), // ms
};

// -- Helper: HTTP GET ke Vercel (dengan Authorization) -------
function httpGet(urlPath, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.VERCEL_BASE_URL + urlPath);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {},
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    const req = require("https").request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// -- Helper: HTTP POST/PATCH ke Vercel ------------------------
function httpPost(urlPath, body, token, method = "POST") {
  return new Promise((resolve, reject) => {
    const url = new URL(config.VERCEL_BASE_URL + urlPath);
    const bodyStr = JSON.stringify(body);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    const req = require("https").request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// ============================================================
// ROLE 1: Cron expiry ping (selalu aktif)
// ============================================================
async function pingCron() {
  const t = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  try {
    const data = await httpGet("/api/cron/check-expirations", config.CRON_SECRET);
    console.log(`[${t}] [CRON] OK — ${JSON.stringify(data).slice(0, 80)}`);
  } catch (e) {
    console.error(`[${t}] [CRON] FAIL — ${e.message}`);
  }
}

// ============================================================
// ROLE 2: Installer runner (hanya aktif bila DAEMON_TOKEN ada)
//
// Fungsi murni ada di daemon/lib/installer.js (ada di repo).
// Di sini kita require ulang karena file ini dan installer.js
// sama-sama dideploy ke /www/wwwroot/lm-installer/.
// ============================================================

let installerReady = false;
let ssh2 = null;
let installerLib = null;

if (config.DAEMON_TOKEN && config.INSTALL_ENC_KEY) {
  try {
    installerLib = require("./daemon/lib/installer");
    ssh2 = require("ssh2");
    installerReady = true;
    console.log(`[INSTALLER] Mode installer AKTIF (poll setiap ${config.POLL_INTERVAL / 1000}s)`);
  } catch (e) {
    console.error(`[INSTALLER] Gagal load ssh2/installer lib: ${e.message}`);
    console.error("[INSTALLER] Pastikan 'npm install --omit=dev' sudah dijalankan.");
  }
} else {
  if (config.DAEMON_TOKEN) console.warn("[INSTALLER] DAEMON_TOKEN ter-set tapi INSTALL_ENC_KEY kosong — installer dinonaktifkan.");
  else console.log("[INSTALLER] DAEMON_TOKEN belum di-set — installer dinonaktifkan.");
}

async function pushLog(jobId, line) {
  if (!config.DAEMON_TOKEN) return;
  try {
    await httpPost(installerLib.daemonEndpoints(jobId).log, { line }, config.DAEMON_TOKEN);
  } catch (e) {
    console.error(`[JOB ${jobId}] LOG FAIL: ${e.message}`);
  }
}

async function finishJob(jobId, status, message) {
  if (!config.DAEMON_TOKEN) return;
  try {
    await httpPost(installerLib.daemonEndpoints(jobId).finish, { status, message }, config.DAEMON_TOKEN, "PATCH");
  } catch (e) {
    console.error(`[JOB ${jobId}] FINISH FAIL: ${e.message}`);
  }
}

async function pollAndRun() {
  if (!installerReady) return;
  try {
    const data = await httpGet("/api/daemon/install?status=pending", config.DAEMON_TOKEN);
    if (!data.job) return;

    const job = data.job;
    console.log(`[INSTALLER] Claimed JOB #${job.id} → ${job.ip_address}`);

    const { Client } = ssh2;
    const conn = new Client();
    const passwords = [job.password];
    let timer = null;

    conn.on("ready", () => {
      let cmd;
      try {
        cmd = installerLib.buildRemoteCommand({
          domain: job.domain,
          mode: "auto",
          sshPort: job.ssh_port,
        });
      } catch (e) {
        pushLog(job.id, `[ERROR] buildRemoteCommand: ${e.message}`).then(() =>
          finishJob(job.id, "failed", e.message)
        );
        conn.end();
        return;
      }

      conn.exec(cmd, (err, stream) => {
        if (err) {
          pushLog(job.id, `[ERROR] SSH exec: ${err.message}`).then(() =>
            finishJob(job.id, "failed", err.message)
          );
          conn.end();
          return;
        }

        stream.on("data", (data) => {
          const line = installerLib.sanitizeLog(data.toString(), passwords);
          console.log(`[JOB ${job.id}] ${line}`);
          pushLog(job.id, line);
        });

        stream.stderr.on("data", (data) => {
          const line = installerLib.sanitizeLog(data.toString(), passwords);
          console.error(`[JOB ${job.id}] [ERR] ${line}`);
          pushLog(job.id, line);
        });

        stream.on("close", (code) => {
          clearTimeout(timer);
          console.log(`[JOB ${job.id}] closed, code=${code}`);
          if (code === 10) {
            finishJob(job.id, "needs_confirmation",
              "Script sudah terpasang; butuh FORCE_REINSTALL."
            );
          } else if (code !== 0) {
            finishJob(job.id, "failed", `Exit code ${code}`);
          } else {
            finishJob(job.id, "success", "Done.");
          }
          conn.end();
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      pushLog(job.id, `[ERROR] SSH: ${err.message}`).then(() =>
        finishJob(job.id, "failed", err.message)
      );
    });

    timer = setTimeout(() => {
      console.error(`[JOB ${job.id}] TIMEOUT — disconnecting`);
      conn.end();
    }, 10 * 60 * 1000);

    conn.connect({
      host: job.ip_address,
      port: Number(job.ssh_port) || 22,
      username: "root",
      password: job.password,
      readyTimeout: 30000,
      algorithms: {
        kex: ["ecdh-sha2-nistp256", "diffie-hellman-group-exchange-sha256"],
        cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"],
      },
    });
  } catch (e) {
    console.error(`[INSTALLER] pollAndRun error: ${e.message}`);
  }
}

// ============================================================
// START — satu proses, dua role
// ============================================================
console.log("======================================================");
console.log(" PM2 Daemon: cron expiry pinger + installer runner");
console.log(` Vercel : ${config.VERCEL_BASE_URL}`);
console.log(` Cron   : setiap ${config.CRON_INTERVAL / 1000 / 60} menit`);
console.log(` Poll   : setiap ${config.POLL_INTERVAL / 1000}s`);
console.log("======================================================");

// Jalankan cron ping sekarang + ulangi
pingCron();
setInterval(pingCron, config.CRON_INTERVAL);

// Installer polling (tanpa blocking cron)
if (installerReady) {
  const poll = () => {
    pollAndRun().finally(() => {
      setTimeout(poll, config.POLL_INTERVAL);
    });
  };
  poll();
}
