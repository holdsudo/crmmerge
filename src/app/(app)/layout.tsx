import { requireUser } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import { AppShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const settings = await getAppSettings();
  const navGroups = [
    {
      label: "CRM",
      items: [
        { href: "/home", label: "Home" },
        { href: "/dashboard", label: "Dashboard" },
        ...(settings.showCustomers === "true" ? [{ href: "/customers", label: "Customers" }] : []),
        ...(settings.showVendors === "true" ? [{ href: "/vendors", label: "Vendors" }] : []),
        { href: "/deals", label: "Deals" },
        { href: "/reports", label: "Reports" },
        ...(settings.showSecurity === "true" ? [{ href: "/security", label: "Security" }] : []),
        { href: "/settings", label: "Settings" }
      ]
    },
    {
      label: "Email",
      items: [
        { href: "/email", label: "Workspace" },
        ...(settings.showEmailContacts === "true" ? [{ href: "/email/contacts", label: "Contacts" }] : []),
        ...(settings.showEmailTemplates === "true" ? [{ href: "/email/templates", label: "Templates" }] : []),
        ...(settings.showEmailCampaigns === "true" ? [{ href: "/email/campaigns", label: "Campaigns" }] : []),
        ...(settings.showEmailSingle === "true" ? [{ href: "/email/single", label: "Single Sender" }] : []),
        ...(settings.showEmailMass === "true" ? [{ href: "/email/mass", label: "Mass Sender" }] : [])
      ]
    }
  ];

  return (
    <AppShell
      title={settings.workspaceTitle}
      subtitle={settings.workspaceSubtitle}
      user={{ name: user.name, role: user.role }}
      navGroups={navGroups}
    >
      {children}
    </AppShell>
  );
}
