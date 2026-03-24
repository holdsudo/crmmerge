import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";

export default async function EmailLandingPage() {
  await requireUser();
  const settings = await getAppSettings();

  const cards = [
    settings.showEmailContacts === "true"
      ? {
          href: "/email/contacts",
          title: "Contacts",
          description: "Manual contacts, CSV imports, vendor/customer sync, and suppression controls."
        }
      : null,
    settings.showEmailTemplates === "true"
      ? {
          href: "/email/templates",
          title: "Templates",
          description: "Upload HTML, save reusable emails, and keep plain-text versions."
        }
      : null,
    settings.showEmailSingle === "true"
      ? {
          href: "/email/single",
          title: "Single Email Shooter",
          description: "Send one-off emails directly from the merged CRM through SES."
        }
      : null,
    settings.showEmailMass === "true" || settings.showEmailCampaigns === "true"
      ? {
          href: "/email/mass",
          title: "Mass Email Shooter",
          description: "Build campaigns, queue vendors/customers/manual lists, and track run history."
        }
      : null
  ].filter(Boolean) as Array<{ href: string; title: string; description: string }>;

  return (
    <div className="stack">
      <section className="hero-panel email-hero-panel">
        <div className="hero-copy stack">
          <div>
            <span className="kicker">Email Workspace</span>
            <h2 style={{ margin: "6px 0 10px" }}>Champion Auto Finance outbound control center.</h2>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Build branded templates, import contacts, send one-offs, and manage full campaign runs from the same CRM your team uses for deals.
            </p>
          </div>
          <div className="hero-stat-row">
            <div className="hero-stat">
              <span className="kicker">Templates</span>
              <strong>{settings.showEmailTemplates === "true" ? "Enabled" : "Hidden"}</strong>
            </div>
            <div className="hero-stat">
              <span className="kicker">Contacts</span>
              <strong>{settings.showEmailContacts === "true" ? "Enabled" : "Hidden"}</strong>
            </div>
            <div className="hero-stat">
              <span className="kicker">Campaigns</span>
              <strong>{settings.showEmailCampaigns === "true" ? "Enabled" : "Hidden"}</strong>
            </div>
          </div>
        </div>
        <div className="hero-visual panel">
          <img src="/brand/champion-shield-mark.png" alt="Champion Auto Finance shield" className="hero-mark" />
          <div className="hero-visual-grid">
            <div>
              <span className="kicker">Single sender</span>
              <strong>{settings.showEmailSingle === "true" ? "Ready" : "Hidden"}</strong>
            </div>
            <div>
              <span className="kicker">Mass sender</span>
              <strong>{settings.showEmailMass === "true" ? "Ready" : "Hidden"}</strong>
            </div>
            <div>
              <span className="kicker">Campaign flow</span>
              <strong>SES powered</strong>
            </div>
            <div>
              <span className="kicker">Branding</span>
              <strong>Champion Auto Finance</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <span className="kicker">Workspace Modules</span>
        <h2 style={{ marginTop: 0 }}>Choose an email workflow</h2>
        <div className="grid cards-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="card">
              <strong>{card.title}</strong>
              <div className="helper">{card.description}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
