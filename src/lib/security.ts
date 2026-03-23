import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
}

function sha256(payload: string) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function getRequestMetadata() {
  const store = await headers();
  const forwardedFor = store.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || store.get("x-real-ip") || null,
    userAgent: store.get("user-agent") || null
  };
}

export async function assertTrustedOrigin() {
  const store = await headers();
  const origin = store.get("origin");

  if (!origin) {
    throw new Error("Missing request origin.");
  }

  const forwardedHost = store.get("x-forwarded-host");
  const host = forwardedHost || store.get("host");

  if (!host) {
    throw new Error("Missing request host.");
  }

  const forwardedProto = store.get("x-forwarded-proto");
  const expectedProtocol = forwardedProto || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const expectedOrigin = `${expectedProtocol}://${host}`;

  if (origin !== expectedOrigin) {
    throw new Error("Cross-origin request blocked.");
  }
}

export async function appendAuditLog({
  dealId,
  userId,
  action,
  oldValue,
  newValue
}: {
  dealId: string;
  userId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const previous = await prisma.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true }
  });
  const oldValueJson = oldValue === undefined ? undefined : stableStringify(oldValue);
  const newValueJson = newValue === undefined ? undefined : stableStringify(newValue);
  const previousHash = previous?.hash ?? null;
  const hash = sha256(
    stableStringify({
      dealId,
      userId,
      action,
      oldValueJson: oldValueJson ?? null,
      newValueJson: newValueJson ?? null,
      previousHash
    })
  );

  return prisma.auditLog.create({
    data: {
      dealId,
      userId,
      action,
      oldValueJson,
      newValueJson,
      previousHash,
      hash
    }
  });
}

export async function appendSecurityEvent({
  userId,
  email,
  eventType,
  success,
  details
}: {
  userId?: string | null;
  email?: string | null;
  eventType: string;
  success: boolean;
  details?: unknown;
}) {
  const previous = await prisma.securityEvent.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true }
  });
  const metadata = await getRequestMetadata();
  const detailsJson = details === undefined ? undefined : stableStringify(details);
  const previousHash = previous?.hash ?? null;
  const hash = sha256(
    stableStringify({
      userId: userId ?? null,
      email: email ?? null,
      eventType,
      success,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      detailsJson: detailsJson ?? null,
      previousHash
    })
  );

  return prisma.securityEvent.create({
    data: {
      userId: userId ?? undefined,
      email: email ?? undefined,
      eventType,
      success,
      ipAddress: metadata.ipAddress ?? undefined,
      userAgent: metadata.userAgent ?? undefined,
      detailsJson,
      previousHash,
      hash
    }
  });
}
