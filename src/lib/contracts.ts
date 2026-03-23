import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Storage } from "@google-cloud/storage";
import { decryptBytes, encryptBytes } from "@/lib/encryption";

const CONTRACTS_DIR = path.resolve(process.cwd(), "storage", "contracts");
const CONTRACTS_BUCKET = process.env.CONTRACTS_BUCKET;
const MAX_CONTRACT_SIZE_BYTES = 10 * 1024 * 1024;

let storageClient: Storage | null = null;

function getStorageClient() {
  if (!storageClient) {
    storageClient = new Storage();
  }

  return storageClient;
}

export async function saveContractFile(file: File) {
  if (!file.type.includes("pdf")) {
    throw new Error("Only PDF contracts are supported.");
  }
  if (file.size > MAX_CONTRACT_SIZE_BYTES) {
    throw new Error("Contract file exceeds the 10 MB upload limit.");
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("Uploaded contract is not a valid PDF.");
  }
  const encryptedBuffer = encryptBytes(buffer);

  if (CONTRACTS_BUCKET) {
    await getStorageClient().bucket(CONTRACTS_BUCKET).file(filename).save(encryptedBuffer, {
      contentType: "application/octet-stream",
      resumable: false,
      private: true,
      metadata: {
        cacheControl: "private, no-store"
      }
    });
  } else {
    await fs.mkdir(CONTRACTS_DIR, { recursive: true });
    const dest = path.join(CONTRACTS_DIR, filename);
    await fs.writeFile(dest, encryptedBuffer);
  }

  return { filename, originalName: file.name };
}

export async function readContractFile(filename: string) {
  const encryptedBuffer = CONTRACTS_BUCKET
    ? await getStorageClient().bucket(CONTRACTS_BUCKET).file(filename).download().then(([contents]) => contents)
    : await fs.readFile(path.join(CONTRACTS_DIR, filename));

  return decryptBytes(Buffer.from(encryptedBuffer));
}
