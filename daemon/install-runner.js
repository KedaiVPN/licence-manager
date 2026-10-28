// Main installer daemon: klaim job dari Vercel, SSH ke VPS target,
// jalankan setup.sh, push log ke Vercel.

// ssh2 sudah terinstall; fungsi murni installer di lib/installer.js.
const { Client } = require("ssh2");
const https = require("https");
const config = require("../config");
const { sanitizeLog, buildRemoteCommand } = require("./lib/installer");

// -- Helper: HTTP request ke Vercel API dengan DAEMON_TOKEN ---------------

function vercelReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.VERCEL_BASE_URL + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (config.DAEMON_TOKEN) opts.headers["Authorization"] = `Bearer ${config.DAEMON_TOKEN}`;
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(JSON.stringify(body));

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// -- Helper: ping cron expiry ke Vercel (compatible dengan cron.js lama) ---

async function pingCron() {
  try {
    const url = config.VERCEL_BASE_URL + "/api/cron/check-expirations";
    const opts = { method: "GET", headers: {} };
    if (config.CRON_SECRET) opts.headers["Authorization"] = `Bearer ${config.CRON_SECRET}`;

    const urlObj = new URL(url);
    const req = https.request(
      { hostname: urlObj.hostname, path: urlObj.pathname, method: "GET", headers: opts.headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const t = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[${t}] [CRON] OK | ${data}`);
          } else {
            console.error(`[${t}] [CRON] WARN status ${res.statusCode} | ${data}`);
          }
        });
      }
    );
    req.on("error", (e) => console.error(`[CRON] FAIL: ${e.message}`));
    req.end();
  } catch (e) {
    console.error(`[CRON] EXC: ${e.message}`);
  }
}

// -- Helper: push log line ke Vercel -------------------------------------

async function pushLog(jobId, line) {
  try {
    await vercelReq("POST", `/api/daemon/install/${jobId}/log`, { line });
  } catch (e) {
    console.error(`[JOB ${jobId}] LOG PUSH FAIL: ${e.message}`);
  }
}

// -- Helper: update job status akhir -------------------------------------

async function finishJob(jobId, status, message) {
  try {
    await vercelReq("PATCH", `/api/daemon/install/${jobId}`, { status, message });
  } catch (e) {
    console.error(`[JOB ${jobId}] FINISH FAIL: ${e.message}`);
  }
}

// -- Core: execute install di 1 VPS via SSH -------------------------------

async function executeInstall(job, passwords) {
  const { id, ip_address, domain, ssh_port } = job;
  console.log(`[JOB ${id}] Connecting to ${ip_address}:${ssh_port || 22} ...`);

  return new Promise((resolve) => {
    const conn = new Client();
    let stdoutDone = false;
    let stderrDone = false;

    // Timeout 10 menit — VPS instalasi biasanya selesai < 8 menit.
    const timer = setTimeout(() => {
      console.error(`[JOB ${id}] TIMEOUT — closing connection`);
      conn.end();
    }, 10 * 60 * 1000);

    conn.on("ready", () => {
      console.log(`[JOB ${id}] SSH connected. Building command...`);

      let cmd;
      try {
        cmd = buildRemoteCommand({ domain, mode: "auto", sshPort: ssh_port });
      } catch (e) {
        clearTimeout(timer);
        pushLog(id, `[ERROR] buildRemoteCommand: ${e.message}`);
        finishJob(id, "failed", "Build command failed: " + e.message).then(resolve);
        conn.end();
        return;
      }

      conn.exec(cmd, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          pushLog(id, `[ERROR] SSH exec: ${err.message}`);
          finishJob(id, "failed", "SSH exec failed: " + err.message).then(resolve);
          conn.end();
          return;
        }

        stream.on("data", (data) => {
          const line = sanitizeLog(data.toString(), passwords);
          console.log(`[JOB ${id}] ${line}`);
          pushLog(id, line);
        });

        stream.stderr.on("data", (data) => {
          const line = sanitizeLog(data.toString(), passwords);
          console.error(`[JOB ${id}] [ERR] ${line}`);
          pushLog(id, line);
        });

        stream.on("close", (code) => {
          clearTimeout(timer);
          console.log(`[JOB ${id}] Stream closed, exit code: ${code}`);

          // Exit 10 = needs_confirmation (guard existing install di setup.sh).
          // Non-zero lain = kegagalan nyata.
          if (code === 10) {
            finishJob(id, "needs_confirmation",
              "Script sudah terpasang di VPS target; butuh FORCE_REINSTALL manual."
            ).then(resolve);
          } else if (code !== 0) {
            finishJob(id, "failed", `Installer keluar dengan exit code ${code}.`).then(resolve);
          } else {
            finishJob(id, "success", "Installation completed successfully.").then(resolve);
          }
          conn.end();
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      console.error(`[JOB ${id}] SSH connection error: ${err.message}`);
      pushLog(id, `[ERROR] SSH: ${err.message}`);
      finishJob(id, "failed", "SSH connection error: " + err.message).then(resolve);
    });

    // Connect ke VPS target
    conn.connect({
      host: ip_address,
      port: Number(ssh_port) || 22,
      username: "root",
      password: job.password,
      readyTimeout: 30000,
      // Jangan auto-terima host key baru — security risk.
      // Di environment production, host key VPS harus di-hardcode di KnownHosts
      // atau pakai algorithm publik (key-based auth) sebagai gantinya.
      algorithms: {
        kex: [
          "ecdh-sha2-nistp256",
          "ecdh-sha2-nistp384",
          "ecdh-sha2-nistp256",
          "diffie-hellman-group-exchange-sha256",
        ],
        cipher: [
          "aes128-ctr", "aes192-ctr", "aes256-ctr",
          "aes128-gcm@openssh.com", "aes256-gcm@openssh.com",
        ],
      },
    });
  });
}

// -- Polling loop: klaim + eksekusi 1 job --------------------------------

async function pollAndRun() {
  try {
    // 1. Klaim 1 job pending
    const data = await vercelReq("GET", "/api/daemon/install?status=pending");
    if (!data.job) return; // tidak ada job

    const job = data.job;
    console.log(`[DAEMON] Claimed JOB #${job.id} (${job.ip_address})`);

    // Password di-simpan di memory proses ini; tidak pernah di-log.
    // Dikirim ke executeInstall untuk sanitasi log (bukan untuk ditulis).
    await executeInstall(job, [job.password]);

  } catch (e) {
    console.error(`[DAEMON] pollAndRun error: ${e.message}`);
  }
}

// -- Main: start daemon (cron + installer) --------------------------------

function start() {
  console.log("======================================================");
  console.log(" DAEMON installer-manager aktif");
  console.log(` Vercel: ${config.VERCEL_BASE_URL}`);
  console.log(` Poll interval: ${config.POLL_INTERVAL / 1000}s`);
  console.log(` Cron interval: ${config.CRON_INTERVAL / 1000 / 60}min`);
  console.log("======================================================");

  // Jalankan cron expiry ping sekarang (mirip cron.js asli),
  // lalu ulangi setiap CRON_INTERVAL.
  pingCron();
  setInterval(pingCron, config.CRON_INTERVAL);

  // Polling installer job
  const poll = () => {
    pollAndRun().finally(() => {
      setTimeout(poll, config.POLL_INTERVAL);
    });
  };
  poll();
}

start();
