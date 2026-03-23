"use server";

import { redirect } from "next/navigation";
import { authenticate, clearSession, createSession, getCurrentUser } from "@/lib/auth";
import { appendSecurityEvent, assertTrustedOrigin } from "@/lib/security";

export async function loginAction(formData: FormData) {
  await assertTrustedOrigin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const otp = String(formData.get("otp") || "").trim();

  if (!email || !password) {
    redirect("/login?error=Email%20and%20password%20are%20required.");
  }

  const result = await authenticate(email, password, otp || undefined);
  if (!result.ok) {
    redirect(`/login?error=${encodeURIComponent(result.error)}`);
  }

  await createSession({ id: result.user.id, sessionVersion: result.user.sessionVersion });
  redirect("/dashboard");
}

export async function logoutAction() {
  await assertTrustedOrigin();
  const user = await getCurrentUser();
  await appendSecurityEvent({
    userId: user?.id,
    email: user?.email,
    eventType: "LOGOUT",
    success: true
  });
  await clearSession();
  redirect("/login");
}
