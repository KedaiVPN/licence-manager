// Fungsi murni untuk installer daemon: sanitasi log + pembangun perintah remote.
// Tidak melakukan I/O apa pun sehingga mudah di-utest.
// Ditulis dalam CommonJS agar kompatibel dengan cron.js / daemon runner.

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07/g;

// Buang escape sequence ANSI agar log tampil bersih di web.
function stripAnsi(text) {
  return String(text).replace(ANSI_RE, "");
}

// Deteksi baris prompt interaktif TUI yang butuh konfirmasi manusia.
const PROMPT_RE =
  /(are you sure|press \[.*enter|masukkan domain|want to replace|wanna replace|\(y\/n\)|press enter|tekan enter)/i;

function detectPrompt(line) {
  return PROMPT_RE.test(line);
}

// Buang password (dan varian-nya) dari sembarang output sebelum masuk log.
function sanitizeLog(line, passwords) {
  let out = stripAnsi(line);

  for (const pwd of passwords) {
    if (!pwd || pwd.length < 3) continue;
    out = out.split(pwd).join("******");
  }

  if (detectPrompt(out)) {
    out = `${out} [BUTUH-KONFIRMASI]`;
  }

  return out;
}

// Bangun command remote untuk SSH ke target.
// Domain selalu di-quote single-quote; menolak input berbahaya (newline, NUL).
function buildRemoteCommand({ domain, mode = "auto", sshPort = 22 }) {
  if (!domain) throw new Error("Domain required");
  if (/\n|\r|\x00/.test(domain)) throw new Error("Invalid domain (newline/NUL)");

  const sq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

  let extra = "";
  if (mode === "dry-run") extra = " DRY_RUN=1 ";
  else if (mode === "auto") extra = " AUTO_INSTALL=1 ";

  return [
    `export DOMAIN=${sq(domain)};`,
    `export SSH_PORT=${Number(sshPort) || 22};`,
    extra,
    `bash -lc "cd /root && curl -fsSL https://raw.githubusercontent.com/KedaiVPN/dynamic/main/setup.sh -o /root/setup.sh && chmod +x /root/setup.sh && AUTO_INSTALL=1 DOMAIN=${sq(domain)} bash /root/setup.sh"`,
  ].join(" ");
}

module.exports = { stripAnsi, detectPrompt, sanitizeLog, buildRemoteCommand };