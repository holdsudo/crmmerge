import { createCampaignAction, deleteCampaignAction, markCampaignSentAction, queueCampaignAction, resendRecipientAction, sendCampaignAction, sendTestEmailAction } from "@/app/email-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";

export default async function EmailCampaignsPage() {
  await requireUser();
  const [campaigns, templates, settings] = await Promise.all([
    prisma.emailCampaign.findMany({
      include: {
        recipients: { orderBy: { updatedAt: "desc" }, take: 12 },
        events: { orderBy: { createdAt: "desc" }, take: 8 }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.emailTemplate.findMany({
      orderBy: { createdAt: "desc" }
    }),
    getAppSettings()
  ]);

  return (
    <div className="stack">
      <section className="panel">
        <span className="kicker">Campaigns</span>
        <div className="stack">
          {campaigns.length ? (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="card stack">
                <div className="row-between">
                  <div>
                    <strong>{campaign.name}</strong>
                    <div className="helper">{campaign.subject}</div>
                  </div>
                  <StatusBadge value={campaign.status} />
                </div>
                <div className="helper">{campaign.recipients.length} recipients tracked</div>
                <div className="helper">
                  Previous run: {campaign.sentAt ? formatDate(campaign.sentAt) : "Not sent yet"} • Last update {formatDate(campaign.updatedAt)}
                </div>
                <div className="helper">
                  From {campaign.fromName} &lt;{campaign.fromEmail}&gt;{campaign.replyToEmail ? ` • reply-to ${campaign.replyToEmail}` : ""}
                </div>
                <div className="row">
                  <form action={queueCampaignAction}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="button-secondary" type="submit">
                      Refresh audience + queue
                    </button>
                  </form>
                  <form action={sendCampaignAction}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="button" type="submit">
                      Send campaign
                    </button>
                  </form>
                  <form action={markCampaignSentAction}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="button-secondary" type="submit">
                      Mark sent manually
                    </button>
                  </form>
                  <form action={deleteCampaignAction}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="button-danger" type="submit">
                      Delete campaign
                    </button>
                  </form>
                </div>
                <form action={sendTestEmailAction} className="inline-form">
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <input
                    name="toEmail"
                    type="email"
                    placeholder={settings.testSendDefaultEmail || "test@example.com"}
                    defaultValue={settings.testSendDefaultEmail || ""}
                    required
                  />
                  <button className="button-secondary" type="submit">
                    Send test
                  </button>
                </form>
                <details className="accordion-panel">
                  <summary>
                    <span>Recipient history</span>
                    <span className="summary-meta">{campaign.recipients.length} tracked</span>
                  </summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Last activity</th>
                          <th>Error</th>
                          <th>Resend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.recipients.map((recipient) => {
                          const lastActivity =
                            recipient.clickedAt || recipient.openedAt || recipient.complainedAt || recipient.bouncedAt || recipient.sentAt || recipient.updatedAt;
                          return (
                            <tr key={recipient.id}>
                              <td>{recipient.email}</td>
                              <td>
                                <StatusBadge value={recipient.status} />
                              </td>
                              <td>{lastActivity ? `${formatDistanceToNow(lastActivity)} ago` : "Never"}</td>
                              <td>{recipient.errorMessage || "-"}</td>
                              <td>
                                <form action={resendRecipientAction}>
                                  <input type="hidden" name="recipientId" value={recipient.id} />
                                  <button className="button-secondary" type="submit">
                                    Resend
                                  </button>
                                </form>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
                <details className="accordion-panel">
                  <summary>
                    <span>Previous campaign runs</span>
                    <span className="summary-meta">{campaign.events.length} events</span>
                  </summary>
                  <div className="stack">
                    {campaign.events.length ? (
                      campaign.events.map((event) => (
                        <div key={event.id} className="card">
                          <strong>{event.eventType}</strong>
                          <div className="helper">
                            {formatDate(event.createdAt)}
                            {event.providerMessageId ? ` • ${event.providerMessageId}` : ""}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty">No campaign events yet.</div>
                    )}
                  </div>
                </details>
              </div>
            ))
          ) : (
            <div className="empty">No campaigns created yet.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <span className="kicker">Create campaign</span>
        <form action={createCampaignAction} className="form-grid">
          <div className="field">
            <label htmlFor="campaign-name">Campaign name</label>
            <input id="campaign-name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="campaign-template">Start from template</label>
            <select id="campaign-template" name="templateId" defaultValue="">
              <option value="">None</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="campaign-subject">Subject</label>
            <input id="campaign-subject" name="subject" />
          </div>
          <div className="field">
            <label htmlFor="campaign-preview">Preview text</label>
            <input id="campaign-preview" name="previewText" />
          </div>
          <div className="field">
            <label htmlFor="campaign-from-name">From name</label>
            <input id="campaign-from-name" name="fromName" defaultValue={settings.defaultFromName} required />
          </div>
          <div className="field">
            <label htmlFor="campaign-from-email">From email</label>
            <input id="campaign-from-email" name="fromEmail" type="email" defaultValue={settings.defaultFromEmail} required />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="campaign-reply-to">Reply-to email</label>
            <input id="campaign-reply-to" name="replyToEmail" type="email" defaultValue={settings.defaultReplyToEmail} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="campaign-html">HTML content</label>
            <textarea id="campaign-html" name="htmlContent" className="editor-textarea" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="campaign-text">Plain text</label>
            <textarea id="campaign-text" name="textContent" className="editor-textarea" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="campaign-manual">Manual recipients</label>
            <textarea id="campaign-manual" name="manualRecipients" placeholder="one@example.com&#10;two@example.com" />
          </div>
          <label className="checkbox-card">
            <input name="includeVendors" type="checkbox" />
            <span>Include vendor contacts</span>
          </label>
          <label className="checkbox-card">
            <input name="includeCustomers" type="checkbox" />
            <span>Include customer contacts</span>
          </label>
          <label className="checkbox-card" style={{ gridColumn: "1 / -1" }}>
            <input name="includeManual" type="checkbox" defaultChecked />
            <span>Include manual + CSV contacts</span>
          </label>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="campaign-notes">Notes</label>
            <textarea id="campaign-notes" name="notes" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="button" type="submit">
              Create campaign draft
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
