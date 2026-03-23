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
      <section className="panel">
        <span className="kicker">Email Workspace</span>
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
