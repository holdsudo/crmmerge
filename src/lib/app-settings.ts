import { prisma } from "@/lib/db";

export const APP_SETTING_DEFAULTS = {
  quickbooksCompany: "Demo QuickBooks Company",
  quickbooksMode: "sandbox",
  homePageHeadline: "Performance overview",
  homeChartDefaultRange: "month",
  dealValueLabel: "Deal value",
  homeProfitLabel: "Profit",
  dealBuyerSectionLabel: "Buyer Info",
  dealVendorSectionLabel: "Vendor Info",
  dealFinancialSectionLabel: "Financials",
  dealVehicleSectionLabel: "Vehicle Info",
  dealFiSectionLabel: "F&I Products",
  dealAccountingSectionLabel: "Accounting",
  dealNotesSectionLabel: "Notes",
  showQuickbooksFields: "true",
  notesPanelOpenByDefault: "false",
  requireBuyerEmail: "false",
  workspaceTitle: "Champion Auto Finance",
  workspaceSubtitle: "Official internal CRM for deal flow, partner outreach, and reporting.",
  defaultFromName: "Champion Auto Finance",
  defaultFromEmail: "partners@championautofinance.com",
  defaultReplyToEmail: "info@championautofinance.com",
  unsubscribeBaseUrl: "",
  emailDeliveryMode: "smtp",
  smtpHost: "127.0.0.1",
  smtpPort: "2525",
  smtpSecure: "false",
  smtpUsername: "",
  smtpPassword: "",
  awsRegion: "us-east-1",
  sesConfigurationSet: "",
  testSendDefaultEmail: "",
  showEmailContacts: "true",
  showEmailTemplates: "true",
  showEmailCampaigns: "true",
  showEmailSingle: "true",
  showEmailMass: "true",
  showVendors: "true",
  showCustomers: "true",
  showSecurity: "true"
} as const;

export type AppSettingsMap = Record<string, string>;

export async function getAppSettings() {
  const settings = await prisma.appSetting.findMany();
  return {
    ...APP_SETTING_DEFAULTS,
    ...Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  } satisfies AppSettingsMap;
}

export function settingEnabled(value: string | undefined) {
  return value === "true";
}
