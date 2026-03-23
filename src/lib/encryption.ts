import crypto from "crypto";

const ENCRYPTION_VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (process.env.NODE_ENV === "production" && !raw) {
    throw new Error("APP_ENCRYPTION_KEY must be set in production.");
  }

  const fallback = "development-only-encryption-key-32";
  const input = raw || Buffer.from(fallback).toString("base64");
  const decoded = Buffer.from(input, "base64");

  if (decoded.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  return decoded;
}

export function encryptBytes(plaintext: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([Buffer.from([ENCRYPTION_VERSION]), iv, tag, ciphertext]);
}

export function decryptBytes(payload: Buffer) {
  if (payload.length < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted payload is too short.");
  }

  const version = payload.subarray(0, 1).readUInt8(0);
  if (version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption payload version: ${version}`);
  }

  const iv = payload.subarray(1, 1 + IV_LENGTH);
  const tag = payload.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(1 + IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptText(value: string) {
  return encryptBytes(Buffer.from(value, "utf8")).toString("base64");
}

export function decryptText(value: string) {
  return decryptBytes(Buffer.from(value, "base64")).toString("utf8");
}
