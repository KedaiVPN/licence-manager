import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sanitizeLog, stripAnsi, buildRemoteCommand } = require("../daemon/lib/installer.js");

describe("sanitizeLog", () => {
  test("menyembunyikan password yang muncul di output", () => {
    const out = sanitizeLog("password: SuperSecret123", ["SuperSecret123"]);
    assert.ok(!out.includes("SuperSecret123"));
    assert.ok(out.includes("******"));
  });

  test("menghapus escape ANSI dari TUI", () => {
    const out = sanitizeLog("\u001b[0;32m[ OK ]\u001b[0m done", []);
    assert.equal(out, "[ OK ] done");
  });

  test("password kosong tidak membuat semua teks jadi bintang", () => {
    const out = sanitizeLog("hello world", ["", undefined]);
    assert.equal(out, "hello world");
  });

  test("menandai baris prompt interaktif sebagai butuh perhatian", () => {
    const out = sanitizeLog("Are You Sure Wanna Replace Script ? (Y/N)", []);
    assert.ok(out.includes("[BUTUH-KONFIRMASI]"));
  });

  test("stripAnsi tidak merusak teks biasa", () => {
    assert.equal(stripAnsi("biasa saja"), "biasa saja");
  });
});

describe("buildRemoteCommand", () => {
  test("mode auto mengirim DOMAIN + AUTO_INSTALL", () => {
    const cmd = buildRemoteCommand({ domain: "vpn.example.com", mode: "auto" });
    assert.ok(cmd.includes("DOMAIN='vpn.example.com'"));
    assert.ok(cmd.includes("AUTO_INSTALL=1"));
    assert.ok(cmd.includes("bash /root/setup.sh"));
  });

  test("domain dengan karakter shell berbahaya tetap di-quote aman", () => {
    const cmd = buildRemoteCommand({ domain: "a; rm -rf /", mode: "auto" });
    assert.ok(cmd.includes("'a; rm -rf /'"));
  });

  test("mode auto-default tidak memaksa FORCE_REINSTALL", () => {
    const cmd = buildRemoteCommand({ domain: "x.com", mode: "auto" });
    assert.ok(!cmd.includes("FORCE_REINSTALL=1"));
  });

  test("dry-run menambahkan DRY_RUN=1", () => {
    const cmd = buildRemoteCommand({ domain: "x.com", mode: "dry-run" });
    assert.ok(cmd.includes("DRY_RUN=1"));
  });

  test("menolak domain kosong", () => {
    assert.throws(() => buildRemoteCommand({ domain: "", mode: "auto" }));
  });

  test("menolak domain berisi newline (injeksi perintah)", () => {
    assert.throws(() => buildRemoteCommand({ domain: "a\nrm -rf /", mode: "auto" }));
  });
});

describe("daemon API endpoints contract", () => {
  const { daemonEndpoints } = require("../daemon/lib/installer.js");

  test("log & finish memakai path /api/daemon/install/:id (tanpa /log suffix)", () => {
    const ep = daemonEndpoints(7);
    assert.equal(ep.log, "/api/daemon/install/7");
    assert.equal(ep.finish, "/api/daemon/install/7");
  });

  test("id numerik di-inject apa adanya", () => {
    assert.equal(daemonEndpoints(42).log, "/api/daemon/install/42");
  });
});
