"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export function AppShell({
  title,
  subtitle,
  user,
  navGroups,
  children
}: {
  title: string;
  subtitle?: string;
  user: { name: string; role: string };
  navGroups: NavGroup[];
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar user={user} navGroups={navGroups} />
      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          <div className="row">
            <div className="card" style={{ padding: "12px 16px" }}>
              <strong>{user.name}</strong>
              <div className="helper">{user.role}</div>
            </div>
            <form action={logoutAction}>
              <button className="button-secondary" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Sidebar({
  user,
  navGroups
}: {
  user: { name: string; role: string };
  navGroups: NavGroup[];
}) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <h2 className="brand">Dealership CRM</h2>
      <p className="helper" style={{ marginTop: 0 }}>
        Vendor deals, reporting, accounting sync, and outreach in one place.
      </p>
      <div className="stack" style={{ marginTop: 24 }}>
        {navGroups.map((group) => (
          <div key={group.label} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            <nav className="nav">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : ""}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 28 }}>
        <span className="kicker">Workspace Access</span>
        <div style={{ fontWeight: 700 }}>{user.role}</div>
        <p className="helper" style={{ marginBottom: 0 }}>
          Staff can work deals and send outreach. Admin and Manager can also manage users, settings, and sender defaults.
        </p>
      </div>
    </aside>
  );
}
