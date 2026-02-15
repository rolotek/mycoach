/**
 * AES-256-GCM encryption for user API keys (at rest in userApiKeys.encryptedKey).
 *
 * Key rotation (future):
 * 1. Generate new key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 2. Run a one-off migration: for each userApiKeys row, decrypt with OLD key, re-encrypt with NEW key, update row.
 * 3. Deploy with API_KEY_ENCRYPTION_KEY set to the new key only.
 * 4. See docs/ops/api-key-encryption-rotation.md for a step-by-step runbook.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function getEncryptionKey(): Buffer | null {
  const raw = process.env.API_KEY_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    if (!raw && process.env.NODE_ENV !== "test") {
      console.warn(
        "[crypto] API_KEY_ENCRYPTION_KEY not set; API key encrypt/decrypt will throw if called."
      );
    }
    return null;
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded).
 * Each call uses a new random 12-byte IV.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) throw new Error("API_KEY_ENCRYPTION_KEY is not set or invalid (must be 32-byte hex)");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a string produced by encrypt().
 * Expects format: iv:authTag:ciphertext (all hex-encoded).
 */
export function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  if (!key) throw new Error("API_KEY_ENCRYPTION_KEY is not set or invalid (must be 32-byte hex)");
  const [ivHex, authTagHex, cipherHex] = encoded.split(":");
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error("Invalid encrypted format: expected iv:authTag:ciphertext");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(cipherHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
