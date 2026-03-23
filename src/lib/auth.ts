import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { appendSecurityEvent } from "@/lib/security";

const SESSION_COOKIE = "crm_session";

type SessionPayload = {
  userId: string;
  sessionVersion: number;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  return secret || "local-development-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function createSession(user: { id: string; sessionVersion: number }) {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, sessionVersion: user.sessionVersion }), "utf8").toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
    priority: "high"
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await readSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, active: true, sessionVersion: true, mfaEnabled: true }
  });

  if (!user || user.sessionVersion !== session.sessionVersion) {
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.active) {
    if (user?.active === false) {
      await clearSession();
    }
    redirect("/login");
  }
  return user;
}

export async function requireAdminOrManager() {
  const user = await requireUser();
  if (!["ADMIN", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export async function authenticate(email: string, password: string, otp?: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    await appendSecurityEvent({
      email,
      eventType: "LOGIN_FAILED",
      success: false,
      details: { reason: "USER_NOT_FOUND" }
    });
    return { ok: false as const, error: "Invalid credentials." };
  }
  if (!user.active) {
    await appendSecurityEvent({
      userId: user.id,
      email,
      eventType: "LOGIN_BLOCKED",
      success: false,
      details: { reason: "INACTIVE_ACCOUNT" }
    });
    return { ok: false as const, error: "This account is inactive." };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await appendSecurityEvent({
      userId: user.id,
      email,
      eventType: "LOGIN_BLOCKED",
      success: false,
      details: { reason: "ACCOUNT_LOCKED", lockedUntil: user.lockedUntil.toISOString() }
    });
    return { ok: false as const, error: "This account is temporarily locked." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockThreshold = 5;
    const lockedUntil = failedLoginCount >= lockThreshold ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil
      }
    });
    await appendSecurityEvent({
      userId: user.id,
      email,
      eventType: lockedUntil ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
      success: false,
      details: { failedLoginCount, lockedUntil: lockedUntil?.toISOString() ?? null }
    });
    return {
      ok: false as const,
      error: lockedUntil ? "Account locked after too many failed attempts. Try again later." : "Invalid credentials."
    };
  }

  if (user.mfaEnabled) {
    const { decryptText } = await import("@/lib/encryption");
    const { verifyTotpCode } = await import("@/lib/totp");
    const secret = user.mfaSecretCiphertext ? decryptText(user.mfaSecretCiphertext) : null;
    if (!secret || !otp || !verifyTotpCode(secret, otp)) {
      await appendSecurityEvent({
        userId: user.id,
        email,
        eventType: "LOGIN_FAILED",
        success: false,
        details: { reason: "INVALID_MFA_CODE" }
      });
      return { ok: false as const, error: "Invalid credentials." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });
  await appendSecurityEvent({
    userId: user.id,
    email,
    eventType: "LOGIN_SUCCEEDED",
    success: true
  });
  return { ok: true as const, user };
}
