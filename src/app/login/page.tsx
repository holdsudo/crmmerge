import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="panel login-card">
        <img src="/brand/champion-logo.png" alt="Champion Auto Finance" className="login-logo" />
        <span className="kicker">Internal Access Only</span>
        <h1 className="page-title">Champion Auto Finance CRM</h1>
        <p className="subtitle">Authorized personnel only. Deal, funding, and outreach activity may be monitored and audited.</p>
        <form action={loginAction} className="stack" style={{ marginTop: 20 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Password" required />
          </div>
          <div className="field">
            <label htmlFor="otp">Authenticator code</label>
            <input id="otp" name="otp" inputMode="numeric" pattern="[0-9]{6}" placeholder="Only required if MFA is enabled" />
          </div>
          {params.error ? <p className="error">{params.error}</p> : null}
          <button className="button" type="submit">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
