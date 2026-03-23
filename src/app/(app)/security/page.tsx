import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTotpUri } from "@/lib/totp";
import { decryptText } from "@/lib/encryption";
import { beginMfaEnrollmentAction, confirmMfaEnrollmentAction, disableMfaAction } from "@/app/actions";

export default async function SecurityPage() {
  const user = await requireUser();
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true, mfaSecretCiphertext: true, email: true }
  });
  if (!current) {
    return null;
  }

  const secret = current.mfaSecretCiphertext ? decryptText(current.mfaSecretCiphertext) : null;
  const pendingEnrollment = Boolean(secret) && !current.mfaEnabled;
  const otpUri = secret ? buildTotpUri(current.email, secret) : null;

  return (
    <div className="stack">
      <p className="subtitle">Manage account security controls, including multi-factor authentication.</p>
      <section className="panel stack">
        <div className="row-between">
          <div>
            <span className="kicker">Multi-factor authentication</span>
            <h2 style={{ marginTop: 0 }}>{current.mfaEnabled ? "Enabled" : "Not enabled"}</h2>
          </div>
        </div>
        {current.mfaEnabled ? (
          <form action={disableMfaAction}>
            <button className="button-danger" type="submit">Disable MFA</button>
          </form>
        ) : pendingEnrollment ? (
          <div className="stack">
            <div className="card">
              <div><strong>Manual secret</strong></div>
              <div className="helper" style={{ wordBreak: "break-all" }}>{secret}</div>
              <div className="helper" style={{ marginTop: 8 }}>Authenticator URI: {otpUri}</div>
            </div>
            <form action={confirmMfaEnrollmentAction} className="inline-form">
              <input name="otp" inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit code" required />
              <button className="button" type="submit">Verify and enable MFA</button>
            </form>
          </div>
        ) : (
          <form action={beginMfaEnrollmentAction}>
            <button className="button" type="submit">Start MFA setup</button>
          </form>
        )}
      </section>
    </div>
  );
}
