import { prisma } from "@/lib/db";
import { requireAdminOrManager } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import { SettingsForm, UserForm } from "@/components/forms";
import { createUserAction, resetUserPasswordAction, toggleUserAccessAction, updateSettingsAction } from "@/app/actions";

export default async function SettingsPage() {
  const user = await requireAdminOrManager();
  const [settings, users, auditLogs, securityEvents, counts] = await Promise.all([
    getAppSettings(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true, deal: true }
    }),
    prisma.securityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: true }
    }),
    Promise.all([prisma.deal.count(), prisma.vendor.count(), prisma.customer.count(), prisma.appSetting.count()])
  ]);

  return (
    <div className="stack">
      <p className="subtitle">Admin controls for homepage behavior, deal form labels, user access, and system settings.</p>
      <section className="grid cards-4">
        <div className="card">
          <span className="kicker">Deals</span>
          <p className="metric">{counts[0]}</p>
        </div>
        <div className="card">
          <span className="kicker">Vendors</span>
          <p className="metric">{counts[1]}</p>
        </div>
        <div className="card">
          <span className="kicker">Customers</span>
          <p className="metric">{counts[2]}</p>
        </div>
        <div className="card">
          <span className="kicker">Stored settings</span>
          <p className="metric">{counts[3]}</p>
        </div>
      </section>
      <SettingsForm action={updateSettingsAction} settings={settings} />
      <section className="grid cards-2">
        <div className="panel">
          <span className="kicker">User management</span>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>{entry.role}</td>
                  <td>{entry.active ? "Active" : "Inactive"}</td>
                  <td>
                    <div className="stack">
                      <form action={resetUserPasswordAction.bind(null, entry.id)} className="inline-form">
                        <input name="password" type="password" placeholder="Temp password" required />
                        <button className="button-secondary" type="submit">
                          Reset
                        </button>
                      </form>
                      {entry.id !== user.id ? (
                        <form action={toggleUserAccessAction.bind(null, entry.id)}>
                          <button className={entry.active ? "button-danger" : "button-secondary"} type="submit">
                            {entry.active ? "Remove access" : "Restore / delete"}
                          </button>
                        </form>
                      ) : (
                        <span className="helper">Current account</span>
                      )}
                      <span className="helper">
                        Failed logins: {entry.failedLoginCount}
                        {entry.lockedUntil ? ` • Locked until ${new Date(entry.lockedUntil).toLocaleTimeString()}` : ""}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
        <div>
          {["ADMIN", "MANAGER"].includes(user.role) ? (
            <UserForm action={createUserAction} />
          ) : (
            <div className="panel helper">Only Admin and Manager users can add new accounts.</div>
          )}
        </div>
      </section>
      <section className="panel stack">
        <div className="row-between">
          <div>
            <span className="kicker">Audit Log</span>
            <p className="helper" style={{ marginBottom: 0 }}>
              Recent deal activity and admin changes from the backend side.
            </p>
          </div>
          <div className="badge">{user.role}</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>User</th>
                <th>Deal</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.action.replaceAll("_", " ")}</td>
                  <td>{entry.user.name}</td>
                  <td>{entry.deal.customerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel stack">
        <div className="row-between">
          <div>
            <span className="kicker">Security Events</span>
            <p className="helper" style={{ marginBottom: 0 }}>
              Login attempts, lockouts, logouts, password resets, and other sensitive account actions.
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>User</th>
                <th>Email</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {securityEvents.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.eventType.replaceAll("_", " ")}</td>
                  <td>{entry.user?.name || "Unknown"}</td>
                  <td>{entry.email || "Unknown"}</td>
                  <td>{entry.success ? "Success" : "Blocked / failed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
