import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  encryptSecret,
  decryptSecret,
  INSTALL_KEY_ERROR,
} from "../src/lib/install-crypto.js";

const KEY_32 = "0123456789abcdef0123456789abcdef";

describe("install-crypto", () => {
  test("roundtrip encrypt -> decrypt menghasilkan plaintext asli", () => {
    const enc = encryptSecret("RahasiaRoot123!", KEY_32);
    assert.notEqual(enc, "RahasiaRoot123!");
    assert.equal(decryptSecret(enc, KEY_32), "RahasiaRoot123!");
  });

  test("hasil encrypt konsisten format v1:iv:tag:ciphertext", () => {
    const enc = encryptSecret("abc", KEY_32);
    const parts = enc.split(":");
    assert.equal(parts.length, 4);
    assert.equal(parts[0], "v1");
    // iv 12 byte base64url, tag 16 byte
    assert.equal(Buffer.from(parts[1], "base64url").length, 12);
    assert.equal(Buffer.from(parts[2], "base64url").length, 16);
  });

  test("salt berbeda -> ciphertext berbeda (iv acak)", () => {
    const a = encryptSecret("same", KEY_32);
    const b = encryptSecret("same", KEY_32);
    assert.notEqual(a, b);
  });

  test("decrypt dengan key salah gagal (throw)", () => {
    const enc = encryptSecret("x", KEY_32);
    const wrongKey = "ffffffffffffffffffffffffffffffff";
    assert.throws(() => decryptSecret(enc, wrongKey));
  });

  test("ciphertext dimanipulasi gagal decrypt (auth tag)", () => {
    const enc = encryptSecret("x", KEY_32);
    const [v, iv, , ct] = enc.split(":");
    const tampered = ct.replace(/^./, ct[0] === "A" ? "B" : "A");
    assert.throws(() => decryptSecret(`${v}:${iv}:AA:${tampered}`, KEY_32));
  });

  test("key bukan 32 byte ditolak saat encrypt", () => {
    assert.throws(
      () => encryptSecret("x", "pendek"),
      (e: any) => e.message === INSTALL_KEY_ERROR
    );
  });
});