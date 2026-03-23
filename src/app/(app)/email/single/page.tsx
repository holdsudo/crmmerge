import { sendSingleEmailAction } from "@/app/email-actions";
import { requireUser } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

type SingleEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SingleEmailPage({ searchParams }: SingleEmailPageProps) {
  await requireUser();
  const params = (await searchParams) || {};
  const prefillToEmail = typeof params.to === "string" ? params.to : "";
  const prefillToName = typeof params.name === "string" ? params.name : "";

  const [settings, recentRecipients] = await Promise.all([
    getAppSettings(),
    prisma.emailContact.findMany({
      where: { lastContactedAt: { not: null } },
      orderBy: { lastContactedAt: "desc" },
      take: 10
    })
  ]);

  return (
    <div className="stack">
      <section className="panel">
        <span className="kicker">Single Email Shooter</span>
        <form action={sendSingleEmailAction} className="form-grid">
          <div className="field">
            <label htmlFor="single-to-email">Recipient email</label>
            <input id="single-to-email" name="toEmail" type="email" defaultValue={prefillToEmail} required />
          </div>
          <div className="field">
            <label htmlFor="single-to-name">Recipient name</label>
            <input id="single-to-name" name="toName" defaultValue={prefillToName} />
          </div>
          <div className="field">
            <label htmlFor="single-subject">Subject</label>
            <input id="single-subject" name="subject" required />
          </div>
          <div className="field">
            <label htmlFor="single-from-name">From name</label>
            <input id="single-from-name" name="fromName" defaultValue={settings.defaultFromName} required />
          </div>
          <div className="field">
            <label htmlFor="single-from-email">From email</label>
            <input id="single-from-email" name="fromEmail" type="email" defaultValue={settings.defaultFromEmail} required />
          </div>
          <div className="field">
            <label htmlFor="single-reply-to">Reply-to email</label>
            <input id="single-reply-to" name="replyToEmail" type="email" defaultValue={settings.defaultReplyToEmail} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="single-html">HTML content</label>
            <textarea id="single-html" name="htmlContent" className="editor-textarea" required />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="single-text">Plain text</label>
            <textarea id="single-text" name="textContent" className="editor-textarea" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="button" type="submit">
              Send single email
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <span className="kicker">Recent direct or campaign recipients</span>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Last email</th>
              </tr>
            </thead>
            <tbody>
              {recentRecipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td>{recipient.name || "Unknown"}</td>
                  <td>{recipient.email}</td>
                  <td>{recipient.lastContactedAt ? `${formatDistanceToNow(recipient.lastContactedAt)} ago` : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
