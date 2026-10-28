import crypto from "crypto";

export const INSTALL_KEY_ERROR =
  "INSTALL_ENC_KEY harus 32 karakter (AES-256)";

// Enkripsi secret (mis. password root VPS) sebelum disimpan di DB.
// Format: v1:<iv>:<authTag>:<ciphertext> (semua base64url).
// Menggunakan random 96-bit IV + AES-256-GCM authenticated encryption.
export function encryptSecret(plaintext: string, key: string): string {
  if (key.length !== 32) throw new Error(INSTALL_KEY_ERROR);
  const secretKey = crypto.createHash("sha256").update(key).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

// Decrypt secret yang disimpan. Throw jika key salah / data rusak (GCM auth).
export function decryptSecret(payload: string, key: string): string {
  const [version, ivB64, tagB64, ctB64] = payload.split(":");
  if (version !== "v1") throw new Error("Unknown install-crypto version");
  const secretKey = crypto.createHash("sha256").update(key).digest();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    secretKey,
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
