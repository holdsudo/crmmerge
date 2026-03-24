import Link from "next/link";
import { Deal, UserRole, Vendor } from "@prisma/client";
import type { AppSettingsMap } from "@/lib/app-settings";
import { ROLE_OPTIONS } from "@/lib/constants";
import { DealFormClient } from "@/components/deal-form-client";

export function VendorForm({
  action,
  vendor
}: {
  action: (formData: FormData) => void | Promise<void>;
  vendor?: Vendor;
}) {
  return (
    <form action={action} className="panel stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Vendor name</label>
          <input id="name" name="name" defaultValue={vendor?.name} required />
        </div>
        <div className="field">
          <label htmlFor="contactName">Contact name</label>
          <input id="contactName" name="contactName" defaultValue={vendor?.contactName ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={vendor?.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="activeStatus">Status</label>
          <select id="activeStatus" name="activeStatus" defaultValue={vendor?.active ?? true ? "active" : "inactive"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="row">
        <button className="button" type="submit">
          {vendor ? "Save vendor" : "Create vendor"}
        </button>
        <Link className="button-secondary" href={vendor ? `/vendors/${vendor.id}` : "/vendors"}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function CustomerForm({
  action,
  customer
}: {
  action: (formData: FormData) => void | Promise<void>;
  customer?: { name: string; phone?: string | null; email?: string | null; coBuyerName?: string | null };
}) {
  return (
    <form action={action} className="panel stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Customer name</label>
          <input id="name" name="name" defaultValue={customer?.name} required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="coBuyerName">Co-buyer</label>
          <input id="coBuyerName" name="coBuyerName" defaultValue={customer?.coBuyerName ?? ""} />
        </div>
      </div>
      <div className="row">
        <button className="button" type="submit">
          {customer ? "Save customer" : "Create customer"}
        </button>
      </div>
    </form>
  );
}

export function DealForm({
  action,
  vendors,
  customers,
  users,
  deal,
  readOnly,
  defaultVendorId,
  settings
}: {
  action: (formData: FormData) => void | Promise<void>;
  vendors: Vendor[];
  customers: Array<{ id: string; name: string; phone?: string | null; email?: string | null; coBuyerName?: string | null }>;
  users: Array<{ id: string; name: string; role: string }>;
  deal?: Partial<Deal>;
  readOnly?: boolean;
  defaultVendorId?: string;
  settings: AppSettingsMap;
}) {
  return <DealFormClient action={action} vendors={vendors} customers={customers} users={users} deal={deal} readOnly={readOnly} defaultVendorId={defaultVendorId} settings={settings} />;
}

export function SettingsForm({
  action,
  settings
}: {
  action: (formData: FormData) => void | Promise<void>;
  settings: Record<string, string>;
}) {
  return (
    <form action={action} className="panel stack">
      <section className="stack">
        <div>
          <span className="kicker">Homepage</span>
          <p className="helper">Control the language and default chart behavior on the owner overview.</p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="homePageHeadline">Home headline</label>
            <input id="homePageHeadline" name="homePageHeadline" defaultValue={settings.homePageHeadline ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="homeChartDefaultRange">Default chart range</label>
            <select id="homeChartDefaultRange" name="homeChartDefaultRange" defaultValue={settings.homeChartDefaultRange ?? "month"}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="dealValueLabel">Deal value label</label>
            <input id="dealValueLabel" name="dealValueLabel" defaultValue={settings.dealValueLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="homeProfitLabel">Profit label</label>
            <input id="homeProfitLabel" name="homeProfitLabel" defaultValue={settings.homeProfitLabel ?? ""} />
          </div>
        </div>
      </section>

      <section className="stack">
        <div>
          <span className="kicker">Deal Workspace</span>
          <p className="helper">Rename sections and control what deal-entry staff sees by default.</p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="dealBuyerSectionLabel">Buyer section label</label>
            <input id="dealBuyerSectionLabel" name="dealBuyerSectionLabel" defaultValue={settings.dealBuyerSectionLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="dealVendorSectionLabel">Vendor section label</label>
            <input id="dealVendorSectionLabel" name="dealVendorSectionLabel" defaultValue={settings.dealVendorSectionLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="dealFinancialSectionLabel">Financial section label</label>
            <input id="dealFinancialSectionLabel" name="dealFinancialSectionLabel" defaultValue={settings.dealFinancialSectionLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="dealVehicleSectionLabel">Vehicle section label</label>
            <input id="dealVehicleSectionLabel" name="dealVehicleSectionLabel" defaultValue={settings.dealVehicleSectionLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="dealFiSectionLabel">F&amp;I section label</label>
            <input id="dealFiSectionLabel" name="dealFiSectionLabel" defaultValue={settings.dealFiSectionLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="dealAccountingSectionLabel">Accounting section label</label>
            <input id="dealAccountingSectionLabel" name="dealAccountingSectionLabel" defaultValue={settings.dealAccountingSectionLabel ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="dealNotesSectionLabel">Notes section label</label>
            <input id="dealNotesSectionLabel" name="dealNotesSectionLabel" defaultValue={settings.dealNotesSectionLabel ?? ""} />
          </div>
        </div>
        <div className="checkbox-grid settings-checkbox-grid">
          <label className="checkbox-card">
            <input type="checkbox" name="showQuickbooksFields" defaultChecked={settings.showQuickbooksFields === "true"} />
            <span>Show QuickBooks fields on deals</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="notesPanelOpenByDefault" defaultChecked={settings.notesPanelOpenByDefault === "true"} />
            <span>Open notes panel by default</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="requireBuyerEmail" defaultChecked={settings.requireBuyerEmail === "true"} />
            <span>Require buyer email on new deals</span>
          </label>
        </div>
      </section>

      <section className="stack">
        <div>
          <span className="kicker">QuickBooks</span>
          <p className="helper">Connection metadata and environment mode for accounting sync.</p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="quickbooksCompany">QuickBooks company</label>
            <input id="quickbooksCompany" name="quickbooksCompany" defaultValue={settings.quickbooksCompany ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="quickbooksMode">QuickBooks connection mode</label>
            <select id="quickbooksMode" name="quickbooksMode" defaultValue={settings.quickbooksMode ?? "sandbox"}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>
      </section>

      <section className="stack">
        <div>
          <span className="kicker">Email Workspace</span>
          <p className="helper">Sender defaults, local SMTP delivery, fallback SES settings, and navigation controls for outreach features.</p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="workspaceTitle">Workspace title</label>
            <input id="workspaceTitle" name="workspaceTitle" defaultValue={settings.workspaceTitle ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="workspaceSubtitle">Workspace subtitle</label>
            <input id="workspaceSubtitle" name="workspaceSubtitle" defaultValue={settings.workspaceSubtitle ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="defaultFromName">Default from name</label>
            <input id="defaultFromName" name="defaultFromName" defaultValue={settings.defaultFromName ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="defaultFromEmail">Default from email</label>
            <input id="defaultFromEmail" name="defaultFromEmail" type="email" defaultValue={settings.defaultFromEmail ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="defaultReplyToEmail">Default reply-to</label>
            <input id="defaultReplyToEmail" name="defaultReplyToEmail" type="email" defaultValue={settings.defaultReplyToEmail ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="emailDeliveryMode">Delivery mode</label>
            <select id="emailDeliveryMode" name="emailDeliveryMode" defaultValue={settings.emailDeliveryMode ?? "smtp"}>
              <option value="smtp">Local / custom SMTP</option>
              <option value="ses">AWS SES fallback</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="smtpHost">SMTP host</label>
            <input id="smtpHost" name="smtpHost" defaultValue={settings.smtpHost ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="smtpPort">SMTP port</label>
            <input id="smtpPort" name="smtpPort" type="number" min="1" max="65535" defaultValue={settings.smtpPort ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="smtpUsername">SMTP username</label>
            <input id="smtpUsername" name="smtpUsername" defaultValue={settings.smtpUsername ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="smtpPassword">SMTP password</label>
            <input id="smtpPassword" name="smtpPassword" type="password" autoComplete="new-password" defaultValue={settings.smtpPassword ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="awsRegion">AWS region</label>
            <input id="awsRegion" name="awsRegion" defaultValue={settings.awsRegion ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="sesConfigurationSet">SES configuration set</label>
            <input id="sesConfigurationSet" name="sesConfigurationSet" defaultValue={settings.sesConfigurationSet ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="testSendDefaultEmail">Default test email</label>
            <input id="testSendDefaultEmail" name="testSendDefaultEmail" type="email" defaultValue={settings.testSendDefaultEmail ?? ""} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="unsubscribeBaseUrl">Unsubscribe base URL</label>
            <input id="unsubscribeBaseUrl" name="unsubscribeBaseUrl" defaultValue={settings.unsubscribeBaseUrl ?? ""} />
          </div>
        </div>
        <div className="checkbox-grid settings-checkbox-grid">
          <label className="checkbox-card">
            <input type="checkbox" name="smtpSecure" defaultChecked={settings.smtpSecure === "true"} />
            <span>Use TLS / secure SMTP</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showEmailContacts" defaultChecked={settings.showEmailContacts === "true"} />
            <span>Show Email Contacts</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showEmailTemplates" defaultChecked={settings.showEmailTemplates === "true"} />
            <span>Show Email Templates</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showEmailCampaigns" defaultChecked={settings.showEmailCampaigns === "true"} />
            <span>Show Email Campaigns</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showEmailSingle" defaultChecked={settings.showEmailSingle === "true"} />
            <span>Show Single Sender</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showEmailMass" defaultChecked={settings.showEmailMass === "true"} />
            <span>Show Mass Sender</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showVendors" defaultChecked={settings.showVendors === "true"} />
            <span>Show Vendors in nav</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showCustomers" defaultChecked={settings.showCustomers === "true"} />
            <span>Show Customers in nav</span>
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="showSecurity" defaultChecked={settings.showSecurity === "true"} />
            <span>Show Security in nav</span>
          </label>
        </div>
      </section>
      <button className="button" type="submit">
        Save admin settings
      </button>
    </form>
  );
}

export function UserForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="panel stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue={UserRole.STAFF}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="password">Temporary password</label>
          <input id="password" name="password" type="password" required />
        </div>
      </div>
      <button className="button" type="submit">
        Add user
      </button>
    </form>
  );
}

export function CsvImportForm({
  action,
  title,
  description,
  fieldName
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  description: string;
  fieldName: string;
}) {
  return (
    <form action={action} className="panel stack">
      <div>
        <span className="kicker">{title}</span>
        <p className="helper" style={{ marginBottom: 0 }}>
          {description}
        </p>
      </div>
      <div className="field">
        <label htmlFor={fieldName}>Spreadsheet file</label>
        <input id={fieldName} name={fieldName} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
      </div>
      <button className="button" type="submit">
        Import file
      </button>
    </form>
  );
}
