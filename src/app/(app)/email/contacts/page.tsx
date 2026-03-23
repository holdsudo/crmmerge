import { createManualContactAction, deleteContactAction, importContactsCsvAction, syncAudienceContactsAction, updateContactStatusAction } from "@/app/email-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

export default async function EmailContactsPage() {
  await requireUser();
  const [contacts, counts] = await Promise.all([
    prisma.emailContact.findMany({
      orderBy: { createdAt: "desc" }
    }),
    prisma.emailContact.groupBy({
      by: ["status"],
      _count: { _all: true }
    })
  ]);

  return (
    <div className="stack">
      <section className="grid cards-4">
        {["ACTIVE", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"].map((status) => {
          const match = counts.find((entry) => entry.status === status);
          return (
            <div key={status} className="card">
              <span className="kicker">{status.toLowerCase()}</span>
              <p className="metric">{match?._count._all ?? 0}</p>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <div className="row-between">
          <div>
            <span className="kicker">Master contact list</span>
            <h2 style={{ marginTop: 0 }}>Unified recipients across vendors, customers, CSV imports, and manual entries</h2>
          </div>
          <form action={syncAudienceContactsAction}>
            <button className="button-secondary" type="submit">
              Sync linked CRM emails
            </button>
          </form>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Source</th>
                <th>Status</th>
                <th>Last email</th>
                <th>Update</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.name || "Unknown"}</td>
                  <td>{contact.email}</td>
                  <td>{contact.company || "None"}</td>
                  <td>{contact.source}</td>
                  <td>
                    <StatusBadge value={contact.status} />
                  </td>
                  <td>{contact.lastContactedAt ? `${formatDistanceToNow(contact.lastContactedAt)} ago` : "Never"}</td>
                  <td>
                    <form action={updateContactStatusAction} className="inline-form">
                      <input type="hidden" name="contactId" value={contact.id} />
                      <select name="status" defaultValue={contact.status}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
                        <option value="BOUNCED">BOUNCED</option>
                        <option value="COMPLAINED">COMPLAINED</option>
                        <option value="SUPPRESSED">SUPPRESSED</option>
                      </select>
                      <button className="button-secondary" type="submit">
                        Save
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="contactId" value={contact.id} />
                      <button className="button-danger" type="submit">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid cards-2">
        <div className="panel">
          <span className="kicker">Manual entry</span>
          <form action={createManualContactAction} className="form-grid">
            <div className="field">
              <label htmlFor="manual-email">Email</label>
              <input id="manual-email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="manual-name">Name</label>
              <input id="manual-name" name="name" />
            </div>
            <div className="field">
              <label htmlFor="manual-phone">Phone</label>
              <input id="manual-phone" name="phone" />
            </div>
            <div className="field">
              <label htmlFor="manual-company">Company</label>
              <input id="manual-company" name="company" />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="manual-notes">Notes</label>
              <textarea id="manual-notes" name="notes" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button className="button" type="submit">
                Add contact
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <span className="kicker">CSV import</span>
          <p className="helper">Accepted headers: email, name, phone, company, notes. Upload a file or paste CSV directly.</p>
          <form action={importContactsCsvAction} className="stack">
            <div className="field">
              <label htmlFor="csvFile">CSV file</label>
              <input id="csvFile" name="csvFile" type="file" accept=".csv,text/csv" />
            </div>
            <div className="field">
              <label htmlFor="csvText">Or paste CSV</label>
              <textarea id="csvText" name="csvText" placeholder={"email,name,company\nstore@example.com,Store Owner,Example Motors"} />
            </div>
            <div>
              <button className="button" type="submit">
                Import contacts
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
