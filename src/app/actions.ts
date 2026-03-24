"use server";

import bcrypt from "bcryptjs";
import { DealStatus, QbSyncStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeCsvHeader } from "@/lib/csv";
import { FI_PRODUCT_OPTIONS } from "@/lib/constants";
import { parseSpreadsheet } from "@/lib/spreadsheet";
import { requireAdminOrManager, requireUser } from "@/lib/auth";
import { appendAuditLog, appendSecurityEvent, assertTrustedOrigin } from "@/lib/security";
import { saveContractFile } from "@/lib/contracts";
import { assertCanAssignUser, assertStrongPassword, customerAccessWhere, dealAccessWhere, vendorAccessWhere } from "@/lib/access";
import { decryptText, encryptText } from "@/lib/encryption";
import { buildTotpUri, generateTotpSecret, verifyTotpCode } from "@/lib/totp";

const vendorSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  active: z.boolean()
});

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  coBuyerName: z.string().optional()
});

const dealSchema = z.object({
  vendorId: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().min(2),
  buyerPhone: z.string().optional(),
  buyerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  coBuyerName: z.string().optional(),
  dealDate: z.coerce.date(),
  amountOwedToVendor: z.coerce.number().positive(),
  downPayment: z.coerce.number().min(0).nullable().optional(),
  termMonths: z.coerce.number().int().positive().optional().nullable(),
  interestAmount: z.coerce.number().min(0).optional().nullable(),
  carType: z.string().min(1),
  vehicleYear: z.coerce.number().int().min(1980).max(2099).nullable().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  interestRate: z.coerce.number().min(0).max(100),
  yourProfit: z.coerce.number().min(0),
  fiProducts: z.array(z.string()).default([]),
  status: z.nativeEnum(DealStatus),
  assignedStaffId: z.string().optional(),
  lenderName: z.string().optional(),
  notes: z.string().optional(),
  qbSyncStatus: z.nativeEnum(QbSyncStatus),
  qbExternalId: z.string().optional()
});

function cleanOptional(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw || undefined;
}

async function handleContractUpload(formData: FormData) {
  const file = formData.get("contractFile");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  if (!file.type.includes("pdf")) {
    throw new Error("Contracts must be uploaded as PDFs.");
  }
  return saveContractFile(file);
}

function parseVendorForm(formData: FormData) {
  return vendorSchema.parse({
    name: formData.get("name"),
    contactName: cleanOptional(formData.get("contactName")),
    email: cleanOptional(formData.get("email")) ?? "",
    phone: cleanOptional(formData.get("phone")),
    active: formData.get("activeStatus") !== "inactive"
  });
}

function parseCustomerForm(formData: FormData) {
  return customerSchema.parse({
    name: formData.get("name"),
    phone: cleanOptional(formData.get("phone")),
    email: cleanOptional(formData.get("email")) ?? "",
    coBuyerName: cleanOptional(formData.get("coBuyerName"))
  });
}

function parseDealForm(formData: FormData) {
  return dealSchema.parse({
    vendorId: formData.get("vendorId"),
    customerId: cleanOptional(formData.get("customerId")),
    customerName: formData.get("customerName"),
    buyerPhone: cleanOptional(formData.get("buyerPhone")),
    buyerEmail: cleanOptional(formData.get("buyerEmail")) ?? "",
    coBuyerName: cleanOptional(formData.get("coBuyerName")),
    dealDate: formData.get("dealDate"),
  amountOwedToVendor: formData.get("amountOwedToVendor"),
  downPayment: cleanOptional(formData.get("downPayment")) ? Number(formData.get("downPayment")) : null,
  termMonths: cleanOptional(formData.get("termMonths")) ?? undefined,
  interestAmount: cleanOptional(formData.get("interestAmount")) ?? undefined,
  carType: formData.get("carType"),
    vehicleYear: cleanOptional(formData.get("vehicleYear")) ? Number(formData.get("vehicleYear")) : null,
    vehicleMake: cleanOptional(formData.get("vehicleMake")),
    vehicleModel: cleanOptional(formData.get("vehicleModel")),
    interestRate: formData.get("interestRate"),
    yourProfit: formData.get("yourProfit"),
    fiProducts: formData.getAll("fiProducts").map((value) => String(value)),
    status: formData.get("status"),
    assignedStaffId: cleanOptional(formData.get("assignedStaffId")),
    lenderName: cleanOptional(formData.get("lenderName")),
    notes: cleanOptional(formData.get("notes")),
    qbSyncStatus: formData.get("qbSyncStatus"),
    qbExternalId: cleanOptional(formData.get("qbExternalId"))
  });
}

async function resolveVendorForDeal(formData: FormData, selectedVendorId: string, user: Awaited<ReturnType<typeof requireUser>>) {
  if (selectedVendorId !== "__new__") {
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: selectedVendorId,
        ...vendorAccessWhere(user)
      },
      select: { id: true }
    });
    if (!vendor) {
      throw new Error("Vendor not found.");
    }
    return vendor.id;
  }

  if (user.role === UserRole.STAFF) {
    throw new Error("Staff users cannot create new vendors.");
  }

  const name = String(formData.get("newVendorName") || "").trim();
  if (!name) {
    throw new Error("New vendor name is required.");
  }

  const vendor = await prisma.vendor.create({
    data: {
      name,
      contactName: cleanOptional(formData.get("newVendorContactName")),
      email: cleanOptional(formData.get("newVendorEmail")) || undefined,
      phone: cleanOptional(formData.get("newVendorPhone")),
      active: true
    }
  });

  return vendor.id;
}

async function resolveCustomerForDeal(
  user: Awaited<ReturnType<typeof requireUser>>,
  formData: FormData,
  selectedCustomerId: string | undefined,
  parsed: z.infer<typeof dealSchema>
) {
  if (!selectedCustomerId || selectedCustomerId === "__new__") {
    const customer = await prisma.customer.create({
      data: {
        name: parsed.customerName,
        phone: parsed.buyerPhone,
        email: parsed.buyerEmail || undefined,
        coBuyerName: parsed.coBuyerName
      }
    });

    return {
      customerId: customer.id,
      customerName: customer.name,
      buyerPhone: customer.phone || undefined,
      buyerEmail: customer.email || undefined,
      coBuyerName: customer.coBuyerName || undefined
    };
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: selectedCustomerId,
      ...customerAccessWhere(user)
    }
  });
  if (!customer) {
    throw new Error("Customer not found.");
  }

  return {
    customerId: customer.id,
    customerName: parsed.customerName || customer.name,
    buyerPhone: parsed.buyerPhone || customer.phone || undefined,
    buyerEmail: parsed.buyerEmail || customer.email || undefined,
    coBuyerName: parsed.coBuyerName || customer.coBuyerName || undefined
  };
}

export async function beginMfaEnrollmentAction() {
  await assertTrustedOrigin();
  const user = await requireUser();
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecretCiphertext: encryptText(secret)
    }
  });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "MFA_ENROLLMENT_STARTED",
    success: true
  });
  revalidatePath("/security");
}

export async function confirmMfaEnrollmentAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const otp = String(formData.get("otp") || "").trim();
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaSecretCiphertext: true, email: true }
  });
  const secret = current?.mfaSecretCiphertext ? decryptText(current.mfaSecretCiphertext) : null;
  if (!secret || !verifyTotpCode(secret, otp)) {
    throw new Error("Invalid authenticator code.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
      sessionVersion: { increment: 1 }
    }
  });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "MFA_ENABLED",
    success: true
  });
  redirect("/login");
}

export async function disableMfaAction() {
  await assertTrustedOrigin();
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecretCiphertext: null,
      sessionVersion: { increment: 1 }
    }
  });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "MFA_DISABLED",
    success: true
  });
  redirect("/login");
}

function getCsvFile(formData: FormData, fieldName: string) {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please upload a CSV file.");
  }
  return file;
}

async function getCsvRows(formData: FormData, fieldName: string) {
  const file = getCsvFile(formData, fieldName);
  const rows = await parseSpreadsheet(file);
  if (rows.length < 2) {
    throw new Error("Spreadsheet must include a header row and at least one data row.");
  }
  return rows;
}

function createRowLookup(headers: string[], row: string[]) {
  const lookup = new Map<string, string>();
  headers.forEach((header, index) => {
    lookup.set(header, row[index]?.trim() ?? "");
  });
  return lookup;
}

function getCell(lookup: Map<string, string>, ...aliases: string[]) {
  for (const alias of aliases) {
    const value = lookup.get(alias);
    if (value !== undefined) {
      return value;
    }
  }

  return "";
}

function normalizeEnumValue(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  return parsed;
}

function parseRequiredNumber(value: string, label: string) {
  const parsed = parseOptionalNumber(value);
  if (parsed === null) {
    throw new Error(`${label} is required.`);
  }
  return parsed;
}

function parseRequiredDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed;
}

function parseBooleanish(value: string, defaultValue: boolean) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  if (["true", "1", "yes", "y", "active"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "inactive"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function normalizeFiProduct(value: string) {
  const normalized = normalizeEnumValue(value);
  const aliasMap: Record<string, string> = {
    GAP_INSURANCE: "GAP",
    GAP_COVERAGE: "GAP",
    VEHICLE_SERVICE_CONTRACT: "VSC",
    SERVICE_CONTRACT: "VSC",
    TIRE_AND_WHEEL: "TIRE_WHEEL",
    TIRE___WHEEL: "TIRE_WHEEL",
    KEY: "KEY_REPLACEMENT",
    KEY_FOB: "KEY_REPLACEMENT",
    WINDSHIELD_PROTECTION: "WINDSHIELD",
    DING_DENT: "DENT_DING",
    WEAR_AND_TEAR: "WEAR_TEAR"
  };

  return aliasMap[normalized] || normalized;
}

function serializeFiProducts(values: string[]) {
  const allowed = new Set<string>(FI_PRODUCT_OPTIONS.map((option) => option.value));
  const normalized = values
    .flatMap((value) => value.split(/[;,|]/))
    .map((value) => normalizeFiProduct(value))
    .filter((value) => allowed.has(value));

  return Array.from(new Set(normalized)).join(",");
}

function inferImportKind(headers: string[]) {
  const vendorHeaders = ["name", "contact_name", "email", "phone", "active"];
  const dealHeaders = ["customer", "customer_name", "deal_date", "amount_owed_to_vendor", "vehicle_model", "car_type"];

  const vendorScore = vendorHeaders.filter((header) => headers.includes(header)).length;
  const dealScore = dealHeaders.filter((header) => headers.includes(header)).length;

  if (dealScore > vendorScore) {
    return "deals";
  }

  if (vendorScore > 0) {
    return "vendors";
  }

  throw new Error("Unable to classify this file. Include vendor-style or deal-style column headers.");
}

function buildImportRedirect(kind: string, created: number, updated: number) {
  const search = new URLSearchParams({
    import: kind,
    created: String(created),
    updated: String(updated)
  });

  redirect(`/reports?${search.toString()}`);
}

export async function createVendorAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireAdminOrManager();
  const data = parseVendorForm(formData);
  const vendor = await prisma.vendor.create({ data });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "VENDOR_CREATED",
    success: true,
    details: { vendorId: vendor.id, name: vendor.name }
  });
  revalidatePath("/vendors");
  redirect("/vendors");
}

export async function createCustomerAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const data = parseCustomerForm(formData);
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      coBuyerName: data.coBuyerName
    }
  });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "CUSTOMER_CREATED",
    success: true,
    details: { customerId: customer.id, name: customer.name }
  });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateVendorAction(vendorId: string, formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireAdminOrManager();
  const data = parseVendorForm(formData);
  await prisma.vendor.update({ where: { id: vendorId }, data });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "VENDOR_UPDATED",
    success: true,
    details: { vendorId }
  });
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  redirect(`/vendors/${vendorId}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const data = parseCustomerForm(formData);
  const existing = await prisma.customer.findFirst({
    where: {
      id: customerId,
      ...customerAccessWhere(user)
    }
  });
  if (!existing) {
    throw new Error("Customer not found.");
  }
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      coBuyerName: data.coBuyerName
    }
  });
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "CUSTOMER_UPDATED",
    success: true,
    details: { customerId }
  });
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function createDealAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const data = parseDealForm(formData);
  const contractUpload = await handleContractUpload(formData);
  const vendorId = await resolveVendorForDeal(formData, data.vendorId, user);
  const customerData = await resolveCustomerForDeal(user, formData, data.customerId, data);

  const deal = await prisma.deal.create({
    data: {
      ...data,
      vendorId,
      ...customerData,
      assignedStaffId: assertCanAssignUser(user, data.assignedStaffId),
      fiProducts: serializeFiProducts(data.fiProducts),
      termMonths: data.termMonths ?? undefined,
      interestAmount: data.interestAmount ?? undefined,
      contractFilePath: contractUpload?.filename ?? null,
      contractFileName: contractUpload?.originalName ?? null,
      createdById: user.id,
      updatedById: user.id
    }
  });

  await appendAuditLog({
    dealId: deal.id,
    userId: user.id,
    action: "DEAL_CREATED",
    newValue: deal
  });

  revalidatePath("/dashboard");
  revalidatePath("/deals");
  revalidatePath("/vendors");
  redirect(`/deals/${deal.id}`);
}

export async function updateDealAction(dealId: string, formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const existing = await prisma.deal.findFirst({ where: { id: dealId, ...dealAccessWhere(user) } });
  if (!existing) {
    throw new Error("Deal not found");
  }

  const data = parseDealForm(formData);
  const contractUpload = await handleContractUpload(formData);
  const vendorId = await resolveVendorForDeal(formData, data.vendorId, user);
  const customerData = await resolveCustomerForDeal(user, formData, data.customerId, data);

  if (existing.status === DealStatus.CLOSED && data.status === DealStatus.CLOSED) {
    throw new Error("Closed deals are read-only. Reopen the deal as an Admin first.");
  }

  if (existing.status === DealStatus.CLOSED && data.status !== DealStatus.CLOSED && user.role !== UserRole.ADMIN) {
    throw new Error("Only an Admin can reopen a closed deal.");
  }

  const updated = await prisma.deal.update({
    where: { id: dealId },
      data: {
        ...data,
        vendorId,
        ...customerData,
        assignedStaffId: assertCanAssignUser(user, data.assignedStaffId),
        fiProducts: serializeFiProducts(data.fiProducts),
        termMonths: data.termMonths ?? undefined,
        interestAmount: data.interestAmount ?? undefined,
        contractFilePath: contractUpload ? contractUpload.filename : existing.contractFilePath,
        contractFileName: contractUpload ? contractUpload.originalName : existing.contractFileName,
        updatedById: user.id
      }
    });

  await appendAuditLog({
    dealId,
    userId: user.id,
    action: existing.status === DealStatus.CLOSED && updated.status !== DealStatus.CLOSED ? "DEAL_REOPENED" : "DEAL_UPDATED",
    oldValue: existing,
    newValue: updated
  });

  revalidatePath("/dashboard");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/vendors/${updated.vendorId}`);
  redirect(`/deals/${dealId}`);
}

export async function reopenDealAction(dealId: string) {
  await assertTrustedOrigin();
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    throw new Error("Only an Admin can reopen a closed deal.");
  }

  const existing = await prisma.deal.findFirst({ where: { id: dealId, ...dealAccessWhere(user) } });
  if (!existing) {
    throw new Error("Deal not found");
  }

  if (existing.status !== DealStatus.CLOSED) {
    redirect(`/deals/${dealId}`);
  }

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: {
      status: DealStatus.PENDING,
      updatedById: user.id
    }
  });

  await appendAuditLog({
    dealId,
    userId: user.id,
    action: "DEAL_REOPENED",
    oldValue: existing,
    newValue: updated
  });

  revalidatePath("/dashboard");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}/edit`);
}

export async function deleteDealAction(dealId: string) {
  await assertTrustedOrigin();
  const user = await requireAdminOrManager();
  const existing = await prisma.deal.findFirst({ where: { id: dealId, ...dealAccessWhere(user) } });
  if (!existing) {
    return;
  }

  await appendAuditLog({
    dealId,
    userId: user.id,
    action: "DEAL_DELETED",
    oldValue: existing
  });

  await prisma.deal.delete({ where: { id: dealId } });
  revalidatePath("/dashboard");
  revalidatePath("/deals");
  revalidatePath("/vendors");
  redirect("/deals");
}

export async function updateSettingsAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireAdminOrManager();
  const entries = [
    ["quickbooksCompany", String(formData.get("quickbooksCompany") || "")],
    ["quickbooksMode", String(formData.get("quickbooksMode") || "sandbox")],
    ["homePageHeadline", String(formData.get("homePageHeadline") || "Performance overview")],
    ["homeChartDefaultRange", String(formData.get("homeChartDefaultRange") || "month")],
    ["dealValueLabel", String(formData.get("dealValueLabel") || "Deal value")],
    ["homeProfitLabel", String(formData.get("homeProfitLabel") || "Profit")],
    ["dealBuyerSectionLabel", String(formData.get("dealBuyerSectionLabel") || "Buyer Info")],
    ["dealVendorSectionLabel", String(formData.get("dealVendorSectionLabel") || "Vendor Info")],
    ["dealFinancialSectionLabel", String(formData.get("dealFinancialSectionLabel") || "Financials")],
    ["dealVehicleSectionLabel", String(formData.get("dealVehicleSectionLabel") || "Vehicle Info")],
    ["dealFiSectionLabel", String(formData.get("dealFiSectionLabel") || "F&I Products")],
    ["dealAccountingSectionLabel", String(formData.get("dealAccountingSectionLabel") || "Accounting")],
    ["dealNotesSectionLabel", String(formData.get("dealNotesSectionLabel") || "Notes")],
    ["showQuickbooksFields", String(formData.get("showQuickbooksFields") === "on")],
    ["notesPanelOpenByDefault", String(formData.get("notesPanelOpenByDefault") === "on")],
    ["requireBuyerEmail", String(formData.get("requireBuyerEmail") === "on")],
    ["workspaceTitle", String(formData.get("workspaceTitle") || "Dealership CRM")],
    ["workspaceSubtitle", String(formData.get("workspaceSubtitle") || "Vendor deals, reporting, accounting sync, and outreach in one place.")],
    ["defaultFromName", String(formData.get("defaultFromName") || "Champion Auto Finance")],
    ["defaultFromEmail", String(formData.get("defaultFromEmail") || "partners@championautofinance.com")],
    ["defaultReplyToEmail", String(formData.get("defaultReplyToEmail") || "info@championautofinance.com")],
    ["unsubscribeBaseUrl", String(formData.get("unsubscribeBaseUrl") || "")],
    ["emailDeliveryMode", String(formData.get("emailDeliveryMode") || "smtp")],
    ["smtpHost", String(formData.get("smtpHost") || "127.0.0.1")],
    ["smtpPort", String(formData.get("smtpPort") || "2525")],
    ["smtpSecure", String(formData.get("smtpSecure") === "on")],
    ["smtpUsername", String(formData.get("smtpUsername") || "")],
    ["smtpPassword", String(formData.get("smtpPassword") || "")],
    ["awsRegion", String(formData.get("awsRegion") || "us-east-1")],
    ["sesConfigurationSet", String(formData.get("sesConfigurationSet") || "")],
    ["testSendDefaultEmail", String(formData.get("testSendDefaultEmail") || "")],
    ["showEmailContacts", String(formData.get("showEmailContacts") === "on")],
    ["showEmailTemplates", String(formData.get("showEmailTemplates") === "on")],
    ["showEmailCampaigns", String(formData.get("showEmailCampaigns") === "on")],
    ["showEmailSingle", String(formData.get("showEmailSingle") === "on")],
    ["showEmailMass", String(formData.get("showEmailMass") === "on")],
    ["showVendors", String(formData.get("showVendors") === "on")],
    ["showCustomers", String(formData.get("showCustomers") === "on")],
    ["showSecurity", String(formData.get("showSecurity") === "on")]
  ] as const;

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/home");
  revalidatePath("/deals/new");
  revalidatePath("/email");
  revalidatePath("/email/contacts");
  revalidatePath("/email/templates");
  revalidatePath("/email/campaigns");
  revalidatePath("/email/single");
  revalidatePath("/email/mass");
  revalidatePath("/settings");
  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "SETTINGS_UPDATED",
    success: true,
    details: { keys: entries.map(([key]) => key) }
  });
}

export async function createUserAction(formData: FormData) {
  await assertTrustedOrigin();
  const actor = await requireAdminOrManager();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "STAFF") as UserRole;
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required.");
  }
  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, role, passwordHash }
  });
  await appendSecurityEvent({
    userId: actor.id,
    email: actor.email,
    eventType: "USER_CREATED",
    success: true,
    details: { targetEmail: email, role }
  });

  revalidatePath("/settings");
}

export async function resetUserPasswordAction(userId: string, formData: FormData) {
  await assertTrustedOrigin();
  const actor = await requireAdminOrManager();
  const password = String(formData.get("password") || "");
  if (!password) {
    throw new Error("Temporary password is required.");
  }
  assertStrongPassword(password);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new Error("User not found.");
  }
  if (target.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
    throw new Error("Only an Admin can reset another Admin account.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, active: true, sessionVersion: { increment: 1 } }
  });
  await appendSecurityEvent({
    userId: actor.id,
    email: actor.email,
    eventType: "USER_PASSWORD_RESET",
    success: true,
    details: { targetUserId: userId, targetEmail: target.email }
  });

  revalidatePath("/settings");
}

export async function toggleUserAccessAction(userId: string) {
  await assertTrustedOrigin();
  const actor = await requireAdminOrManager();
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          createdDeals: true,
          assignedDeals: true,
          auditLogs: true
        }
      }
    }
  });

  if (!target) {
    throw new Error("User not found.");
  }
  if (target.id === actor.id && target.active) {
    throw new Error("You cannot remove your own access.");
  }
  if (target.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
    throw new Error("Only an Admin can change another Admin account.");
  }
  if (!target.active && target._count.createdDeals === 0 && target._count.assignedDeals === 0 && target._count.auditLogs === 0) {
    await prisma.user.delete({ where: { id: userId } });
    await appendSecurityEvent({
      userId: actor.id,
      email: actor.email,
      eventType: "USER_DELETED",
      success: true,
      details: { targetUserId: userId, targetEmail: target.email }
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { active: !target.active }
    });
    await appendSecurityEvent({
      userId: actor.id,
      email: actor.email,
      eventType: target.active ? "USER_ACCESS_REMOVED" : "USER_ACCESS_RESTORED",
      success: true,
      details: { targetUserId: userId, targetEmail: target.email }
    });
  }

  revalidatePath("/settings");
}

async function importVendorsRows(rows: string[][]) {
  const headers = rows[0].map(normalizeCsvHeader);
  let created = 0;
  let updated = 0;

  for (const row of rows.slice(1)) {
    const lookup = createRowLookup(headers, row);
    const name = getCell(lookup, "name", "vendor");
    if (!name) {
      continue;
    }

    const payload = {
      name,
      contactName: getCell(lookup, "contact_name") || undefined,
      email: getCell(lookup, "email") || undefined,
      phone: getCell(lookup, "phone") || undefined,
      active: parseBooleanish(getCell(lookup, "active"), true)
    };

    const existing = await prisma.vendor.findFirst({ where: { name } });
    if (existing) {
      await prisma.vendor.update({
        where: { id: existing.id },
        data: payload
      });
      updated += 1;
    } else {
      await prisma.vendor.create({ data: payload });
      created += 1;
    }
  }

  revalidatePath("/vendors");
  revalidatePath("/reports");
  return { created, updated };
}

async function upsertCustomerFromImport(row: {
  customerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  coBuyerName?: string;
}) {
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [{ name: row.customerName }, row.buyerEmail ? { email: row.buyerEmail } : undefined].filter(Boolean) as never
    }
  });

  if (existing) {
    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: row.customerName,
        phone: row.buyerPhone,
        email: row.buyerEmail,
        coBuyerName: row.coBuyerName
      }
    });
    return customer.id;
  }

  const customer = await prisma.customer.create({
    data: {
      name: row.customerName,
      phone: row.buyerPhone,
      email: row.buyerEmail,
      coBuyerName: row.coBuyerName
    }
  });
  return customer.id;
}

async function importDealsRows(rows: string[][], userId: string) {
  const headers = rows[0].map(normalizeCsvHeader);
  let created = 0;
  let updated = 0;

  for (const row of rows.slice(1)) {
    const lookup = createRowLookup(headers, row);
    const vendorName = getCell(lookup, "vendor", "vendor_name");
    const customerName = getCell(lookup, "customer", "customer_name");
    if (!vendorName || !customerName) {
      continue;
    }

    const vendor = await prisma.vendor.findFirst({ where: { name: vendorName } });
    if (!vendor) {
      throw new Error(`Vendor not found for deal import: ${vendorName}`);
    }

    const statusValue = normalizeEnumValue(getCell(lookup, "status") || DealStatus.NEW);
    const qbSyncValue = normalizeEnumValue(getCell(lookup, "quickbooks_status", "qb_sync_status") || QbSyncStatus.NOT_SYNCED);

    if (!(statusValue in DealStatus)) {
      throw new Error(`Invalid deal status: ${statusValue}`);
    }

    if (!(qbSyncValue in QbSyncStatus)) {
      throw new Error(`Invalid QuickBooks status: ${qbSyncValue}`);
    }

    const payload = {
      vendorId: vendor.id,
      customerName,
      buyerPhone: getCell(lookup, "buyer_phone", "customer_phone") || undefined,
      buyerEmail: getCell(lookup, "buyer_email", "customer_email") || undefined,
      coBuyerName: getCell(lookup, "co_buyer", "co_buyer_name") || undefined,
      dealDate: parseRequiredDate(getCell(lookup, "date", "deal_date")),
      amountOwedToVendor: parseRequiredNumber(getCell(lookup, "amount_owed_to_vendor", "amount", "amount_owed"), "Amount owed to vendor"),
      downPayment: parseOptionalNumber(getCell(lookup, "down_payment")),
      carType: getCell(lookup, "car_type", "vehicle_type"),
      vehicleYear: parseOptionalNumber(getCell(lookup, "vehicle_year", "year")),
      vehicleMake: getCell(lookup, "vehicle_make", "make") || undefined,
      vehicleModel: getCell(lookup, "vehicle_model", "model") || undefined,
      interestRate: parseRequiredNumber(getCell(lookup, "interest_rate"), "Interest rate"),
      yourProfit: parseRequiredNumber(getCell(lookup, "your_profit"), "Your profit"),
      fiProducts: serializeFiProducts([getCell(lookup, "fi_products", "f_i_products", "products")]),
      status: DealStatus[statusValue as keyof typeof DealStatus],
      assignedStaffId: getCell(lookup, "assigned_staff_id") || userId,
      lenderName: getCell(lookup, "lender_name") || undefined,
      notes: getCell(lookup, "notes") || undefined,
      qbSyncStatus: QbSyncStatus[qbSyncValue as keyof typeof QbSyncStatus],
      qbExternalId: getCell(lookup, "quickbooks_external_id", "qb_external_id") || undefined,
      updatedById: userId
    };
    const customerId = await upsertCustomerFromImport({
      customerName: payload.customerName,
      buyerPhone: payload.buyerPhone,
      buyerEmail: payload.buyerEmail,
      coBuyerName: payload.coBuyerName
    });
    const payloadWithCustomer = { ...payload, customerId };

    const dealId = getCell(lookup, "deal_id", "id");
    if (dealId) {
      const existing = await prisma.deal.findUnique({ where: { id: dealId } });
      if (existing) {
        const nextDeal = await prisma.deal.update({
          where: { id: dealId },
          data: payloadWithCustomer
        });
        await appendAuditLog({
          dealId,
          userId,
          action: "DEAL_IMPORTED_UPDATED",
          oldValue: existing,
          newValue: nextDeal
        });
        updated += 1;
        continue;
      }
    }

    const createdDeal = await prisma.deal.create({
      data: {
        ...payloadWithCustomer,
        createdById: userId
      }
    });
    await appendAuditLog({
      dealId: createdDeal.id,
      userId,
      action: "DEAL_IMPORTED_CREATED",
      newValue: createdDeal
    });
    created += 1;
  }

  revalidatePath("/dashboard");
  revalidatePath("/deals");
  revalidatePath("/reports");
  return { created, updated };
}

export async function importSpreadsheetAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireAdminOrManager();
  const rows = await getCsvRows(formData, "importFile");
  const headers = rows[0].map(normalizeCsvHeader);
  const kind = inferImportKind(headers);
  const result = kind === "vendors" ? await importVendorsRows(rows) : await importDealsRows(rows, user.id);

  buildImportRedirect(kind, result.created, result.updated);
}

export async function importVendorsAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireAdminOrManager();
  const rows = await getCsvRows(formData, "vendorsFile");
  const result = await importVendorsRows(rows);
  buildImportRedirect("vendors", result.created, result.updated);
}

export async function importDealsAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireAdminOrManager();
  const rows = await getCsvRows(formData, "dealsFile");
  const result = await importDealsRows(rows, user.id);
  buildImportRedirect("deals", result.created, result.updated);
}
