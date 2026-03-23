"use server";

import { CampaignStatus, ContactSource, ContactStatus, Prisma, RecipientStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { parseCsv, normalizeCsvHeader } from "@/lib/csv";
import { requireAdminOrManager, requireUser } from "@/lib/auth";
import { appendSecurityEvent, assertTrustedOrigin } from "@/lib/security";
import { sendSesEmail } from "@/lib/email";

const manualContactSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional()
});

const templateSchema = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  previewText: z.string().optional(),
  htmlContent: z.string().min(1),
  textContent: z.string().optional()
});

const campaignSchema = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  previewText: z.string().optional(),
  fromName: z.string().min(2),
  fromEmail: z.string().email(),
  replyToEmail: z.union([z.string().email(), z.literal("")]).optional(),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  templateId: z.string().optional(),
  includeVendors: z.boolean(),
  includeCustomers: z.boolean(),
  includeManual: z.boolean(),
  manualRecipients: z.string().optional(),
  notes: z.string().optional()
});

const testSendSchema = z.object({
  toEmail: z.string().email(),
  subject: z.string().min(2),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  fromName: z.string().min(2),
  fromEmail: z.string().email(),
  replyToEmail: z.union([z.string().email(), z.literal("")]).optional()
});

const singleSendSchema = z.object({
  toEmail: z.string().email(),
  toName: z.string().optional(),
  subject: z.string().min(2),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  fromName: z.string().min(2),
  fromEmail: z.string().email(),
  replyToEmail: z.union([z.string().email(), z.literal("")]).optional()
});

function cleanOptional(value: FormDataEntryValue | null | string | undefined) {
  const raw = String(value || "").trim();
  return raw || undefined;
}

function dedupeEmails(values: Array<{ email: string; name?: string | null; sourceLabel?: string; contactId?: string | null }>) {
  const map = new Map<string, { email: string; name?: string | null; sourceLabel?: string; contactId?: string | null }>();

  for (const entry of values) {
    const normalized = entry.email.trim().toLowerCase();
    if (!normalized) {
      continue;
    }

    if (!map.has(normalized)) {
      map.set(normalized, {
        email: normalized,
        name: entry.name?.trim() || undefined,
        sourceLabel: entry.sourceLabel,
        contactId: entry.contactId ?? undefined
      });
    }
  }

  return Array.from(map.values());
}

async function syncVendorAndCustomerContacts() {
  const [vendors, customers] = await Promise.all([
    prisma.vendor.findMany({ where: { email: { not: null }, active: true } }),
    prisma.customer.findMany({ where: { email: { not: null } } })
  ]);

  for (const vendor of vendors) {
    const email = vendor.email?.trim().toLowerCase();
    if (!email) {
      continue;
    }

    await prisma.emailContact.upsert({
      where: { email },
      update: {
        name: vendor.contactName || vendor.name,
        phone: vendor.phone || undefined,
        company: vendor.name,
        source: ContactSource.VENDOR,
        vendorId: vendor.id,
        status: ContactStatus.ACTIVE
      },
      create: {
        email,
        name: vendor.contactName || vendor.name,
        phone: vendor.phone || undefined,
        company: vendor.name,
        source: ContactSource.VENDOR,
        vendorId: vendor.id
      }
    });
  }

  for (const customer of customers) {
    const email = customer.email?.trim().toLowerCase();
    if (!email) {
      continue;
    }

    await prisma.emailContact.upsert({
      where: { email },
      update: {
        name: customer.name,
        phone: customer.phone || undefined,
        company: "Customer",
        source: ContactSource.CUSTOMER,
        customerId: customer.id,
        status: ContactStatus.ACTIVE
      },
      create: {
        email,
        name: customer.name,
        phone: customer.phone || undefined,
        company: "Customer",
        source: ContactSource.CUSTOMER,
        customerId: customer.id
      }
    });
  }
}

function parseManualRecipients(value: string | undefined) {
  if (!value) {
    return [];
  }

  return dedupeEmails(
    value
      .split(/[\n,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((email) => ({ email, sourceLabel: "Campaign manual recipients" }))
  );
}

async function resolveCampaignRecipients(input: {
  includeVendors: boolean;
  includeCustomers: boolean;
  includeManual: boolean;
  manualRecipients?: string;
}) {
  await syncVendorAndCustomerContacts();

  const filters: ContactSource[] = [];
  if (input.includeVendors) {
    filters.push(ContactSource.VENDOR);
  }
  if (input.includeCustomers) {
    filters.push(ContactSource.CUSTOMER);
  }
  if (input.includeManual) {
    filters.push(ContactSource.MANUAL, ContactSource.CSV);
  }

  const dbContacts = filters.length
    ? await prisma.emailContact.findMany({
        where: {
          source: { in: filters },
          status: ContactStatus.ACTIVE
        },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return dedupeEmails([
    ...dbContacts.map((contact) => ({
      email: contact.email,
      name: contact.name,
      sourceLabel: contact.source,
      contactId: contact.id
    })),
    ...parseManualRecipients(input.manualRecipients)
  ]);
}

async function createCampaignRecipientSnapshot(
  campaignId: string,
  input: {
    includeVendors: boolean;
    includeCustomers: boolean;
    includeManual: boolean;
    manualRecipients?: string;
  }
) {
  const recipients = await resolveCampaignRecipients(input);

  await prisma.campaignRecipient.deleteMany({ where: { campaignId } });

  if (!recipients.length) {
    return 0;
  }

  await prisma.campaignRecipient.createMany({
    data: recipients.map((recipient) => ({
      campaignId,
      contactId: recipient.contactId || null,
      email: recipient.email,
      name: recipient.name || null,
      sourceLabel: recipient.sourceLabel || null,
      status: RecipientStatus.PENDING
    }))
  });

  return recipients.length;
}

function buildRecipientUnsubscribeUrl(baseUrl: string | undefined, email: string) {
  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("email", email);
    return url.toString();
  } catch {
    return null;
  }
}

async function sendCampaignRecipient(
  campaign: {
    id: string;
    subject: string;
    htmlContent: string;
    textContent?: string | null;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string | null;
  },
  recipient: {
    id: string;
    email: string;
    name?: string | null;
  }
) {
  const settings = await getAppSettings();
  const unsubscribeUrl = buildRecipientUnsubscribeUrl(settings.unsubscribeBaseUrl, recipient.email);

  const messageId = await sendSesEmail({
    region: settings.awsRegion || undefined,
    fromEmail: campaign.fromEmail,
    fromName: campaign.fromName,
    toEmail: recipient.email,
    replyToEmail: campaign.replyToEmail || undefined,
    subject: campaign.subject,
    htmlContent: campaign.htmlContent,
    textContent: campaign.textContent || undefined,
    configurationSetName: settings.sesConfigurationSet || undefined,
    unsubscribeUrl,
    tags: [
      { name: "campaign_id", value: campaign.id },
      { name: "recipient_id", value: recipient.id }
    ]
  });

  return { messageId };
}

function revalidateEmailWorkspace() {
  revalidatePath("/vendors");
  revalidatePath("/customers");
  revalidatePath("/settings");
  revalidatePath("/email");
  revalidatePath("/email/contacts");
  revalidatePath("/email/templates");
  revalidatePath("/email/campaigns");
  revalidatePath("/email/single");
  revalidatePath("/email/mass");
}

export async function syncAudienceContactsAction() {
  await assertTrustedOrigin();
  await requireUser();
  await syncVendorAndCustomerContacts();
  revalidateEmailWorkspace();
}

export async function createManualContactAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const parsed = manualContactSchema.parse({
    email: String(formData.get("email") || "").trim().toLowerCase(),
    name: cleanOptional(formData.get("name")),
    phone: cleanOptional(formData.get("phone")),
    company: cleanOptional(formData.get("company")),
    notes: cleanOptional(formData.get("notes"))
  });

  await prisma.emailContact.upsert({
    where: { email: parsed.email },
    update: {
      name: parsed.name,
      phone: parsed.phone,
      company: parsed.company,
      notes: parsed.notes,
      source: ContactSource.MANUAL,
      status: ContactStatus.ACTIVE
    },
    create: {
      email: parsed.email,
      name: parsed.name,
      phone: parsed.phone,
      company: parsed.company,
      notes: parsed.notes,
      source: ContactSource.MANUAL
    }
  });

  revalidateEmailWorkspace();
}

export async function importContactsCsvAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const upload = formData.get("csvFile");
  const rawText = cleanOptional(formData.get("csvText"));

  let csv = rawText || "";
  if (upload instanceof File && upload.size > 0) {
    csv = await upload.text();
  }

  if (!csv.trim()) {
    throw new Error("Upload a CSV file or paste CSV text.");
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  let imported = 0;

  for (const row of rows.slice(1)) {
    const lookup = new Map(headers.map((header, index) => [header, row[index] || ""]));
    const email = String(lookup.get("email") || lookup.get("email_address") || lookup.get("recipient_email") || "")
      .trim()
      .toLowerCase();

    if (!email) {
      continue;
    }

    await prisma.emailContact.upsert({
      where: { email },
      update: {
        name: cleanOptional(lookup.get("name") || lookup.get("contact_name") || ""),
        phone: cleanOptional(lookup.get("phone") || ""),
        company: cleanOptional(lookup.get("company") || lookup.get("vendor") || lookup.get("customer") || ""),
        notes: cleanOptional(lookup.get("notes") || ""),
        source: ContactSource.CSV,
        status: ContactStatus.ACTIVE
      },
      create: {
        email,
        name: cleanOptional(lookup.get("name") || lookup.get("contact_name") || ""),
        phone: cleanOptional(lookup.get("phone") || ""),
        company: cleanOptional(lookup.get("company") || lookup.get("vendor") || lookup.get("customer") || ""),
        notes: cleanOptional(lookup.get("notes") || ""),
        source: ContactSource.CSV
      }
    });

    imported += 1;
  }

  await appendSecurityEvent({
    eventType: "CSV_CONTACT_IMPORT",
    success: true,
    details: { imported }
  });

  revalidateEmailWorkspace();
}

export async function updateContactStatusAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const contactId = String(formData.get("contactId") || "");
  const status = String(formData.get("status") || "") as ContactStatus;
  if (!contactId || !Object.values(ContactStatus).includes(status)) {
    throw new Error("Invalid contact status update.");
  }

  await prisma.emailContact.update({
    where: { id: contactId },
    data: {
      status,
      unsubscribedAt: status === ContactStatus.UNSUBSCRIBED ? new Date() : null,
      bouncedAt: status === ContactStatus.BOUNCED ? new Date() : null,
      complainedAt: status === ContactStatus.COMPLAINED ? new Date() : null
    }
  });

  revalidateEmailWorkspace();
}

export async function deleteContactAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const contactId = String(formData.get("contactId") || "");
  if (!contactId) {
    throw new Error("Contact is required.");
  }

  await prisma.emailContact.delete({ where: { id: contactId } });
  revalidateEmailWorkspace();
}

export async function saveTemplateAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();

  const htmlFile = formData.get("htmlFile");
  let htmlContent = cleanOptional(formData.get("htmlContent")) || "";
  if (htmlFile instanceof File && htmlFile.size > 0) {
    htmlContent = await htmlFile.text();
  }

  const parsed = templateSchema.parse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    previewText: cleanOptional(formData.get("previewText")),
    htmlContent,
    textContent: cleanOptional(formData.get("textContent"))
  });

  await prisma.emailTemplate.create({
    data: {
      name: parsed.name,
      subject: parsed.subject,
      previewText: parsed.previewText,
      htmlContent: parsed.htmlContent,
      textContent: parsed.textContent,
      createdById: user.id,
      updatedById: user.id
    }
  });

  revalidateEmailWorkspace();
}

export async function deleteTemplateAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const templateId = String(formData.get("templateId") || "");
  if (!templateId) {
    throw new Error("Template is required.");
  }

  await prisma.emailTemplate.delete({ where: { id: templateId } });
  revalidateEmailWorkspace();
}

export async function createCampaignAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const settings = await getAppSettings();
  const templateId = cleanOptional(formData.get("templateId"));

  let template = null;
  if (templateId) {
    template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  }

  const parsed = campaignSchema.parse({
    name: formData.get("name"),
    subject: formData.get("subject") || template?.subject || "",
    previewText: cleanOptional(formData.get("previewText")) || template?.previewText || undefined,
    fromName: formData.get("fromName") || settings.defaultFromName,
    fromEmail: formData.get("fromEmail") || settings.defaultFromEmail,
    replyToEmail: cleanOptional(formData.get("replyToEmail")) || settings.defaultReplyToEmail,
    htmlContent: cleanOptional(formData.get("htmlContent")) || template?.htmlContent || "",
    textContent: cleanOptional(formData.get("textContent")) || template?.textContent || undefined,
    templateId: template?.id,
    includeVendors: formData.get("includeVendors") === "on",
    includeCustomers: formData.get("includeCustomers") === "on",
    includeManual: formData.get("includeManual") === "on",
    manualRecipients: cleanOptional(formData.get("manualRecipients")),
    notes: cleanOptional(formData.get("notes"))
  });

  const campaign = await prisma.emailCampaign.create({
    data: {
      name: parsed.name,
      subject: parsed.subject,
      previewText: parsed.previewText,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      replyToEmail: parsed.replyToEmail || undefined,
      htmlContent: parsed.htmlContent,
      textContent: parsed.textContent,
      templateId: parsed.templateId,
      includeVendors: parsed.includeVendors,
      includeCustomers: parsed.includeCustomers,
      includeManual: parsed.includeManual,
      manualRecipients: parsed.manualRecipients,
      notes: parsed.notes,
      createdById: user.id,
      updatedById: user.id
    }
  });

  await createCampaignRecipientSnapshot(campaign.id, parsed);
  revalidateEmailWorkspace();
}

export async function queueCampaignAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const campaignId = String(formData.get("campaignId") || "");
  if (!campaignId) {
    throw new Error("Campaign is required.");
  }

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const recipientCount = await createCampaignRecipientSnapshot(campaign.id, {
    includeVendors: campaign.includeVendors,
    includeCustomers: campaign.includeCustomers,
    includeManual: campaign.includeManual,
    manualRecipients: campaign.manualRecipients || undefined
  });

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: recipientCount > 0 ? CampaignStatus.READY : CampaignStatus.FAILED
    }
  });

  if (recipientCount === 0) {
    throw new Error("No active recipients were available for this campaign.");
  }

  revalidateEmailWorkspace();
}

export async function sendCampaignAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();

  const campaignId = String(formData.get("campaignId") || "");
  if (!campaignId) {
    throw new Error("Campaign is required.");
  }

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        where: { status: RecipientStatus.PENDING },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (!campaign.recipients.length) {
    throw new Error("This campaign has no pending recipients. Queue the audience first.");
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.SENDING }
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of campaign.recipients) {
    try {
      const { messageId } = await sendCampaignRecipient(campaign, recipient);
      const now = new Date();
      const operations: Prisma.PrismaPromise<unknown>[] = [
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: RecipientStatus.SENT,
            sentAt: now,
            errorMessage: null
          }
        }),
        prisma.emailEvent.create({
          data: {
            campaignId: campaign.id,
            campaignRecipientId: recipient.id,
            eventType: "SEND_ACCEPTED",
            providerMessageId: messageId,
            payloadJson: JSON.stringify({ email: recipient.email })
          }
        })
      ];

      if (recipient.contactId) {
        operations.splice(
          1,
          0,
          prisma.emailContact.update({
            where: { id: recipient.contactId },
            data: { lastContactedAt: now }
          })
        );
      }

      await prisma.$transaction(operations);
      sentCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SES send error.";
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: RecipientStatus.FAILED,
            errorMessage: message
          }
        }),
        prisma.emailEvent.create({
          data: {
            campaignId: campaign.id,
            campaignRecipientId: recipient.id,
            eventType: "SEND_FAILED",
            payloadJson: JSON.stringify({ email: recipient.email, error: message })
          }
        })
      ]);
      failedCount += 1;
    }
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: failedCount && !sentCount ? CampaignStatus.FAILED : CampaignStatus.SENT,
      sentAt: sentCount ? new Date() : null
    }
  });

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "CAMPAIGN_SEND_EXECUTED",
    success: failedCount === 0,
    details: { campaignId: campaign.id, sentCount, failedCount }
  });

  revalidateEmailWorkspace();
}

export async function markCampaignSentAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const campaignId = String(formData.get("campaignId") || "");
  if (!campaignId) {
    throw new Error("Campaign is required.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SENT, sentAt: now }
    }),
    prisma.campaignRecipient.updateMany({
      where: { campaignId, status: RecipientStatus.PENDING },
      data: { status: RecipientStatus.SENT, sentAt: now }
    })
  ]);

  revalidateEmailWorkspace();
}

export async function deleteCampaignAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireUser();

  const campaignId = String(formData.get("campaignId") || "");
  if (!campaignId) {
    throw new Error("Campaign is required.");
  }

  await prisma.emailCampaign.delete({ where: { id: campaignId } });
  revalidateEmailWorkspace();
}

export async function sendTestEmailAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const settings = await getAppSettings();

  const campaignId = cleanOptional(formData.get("campaignId"));
  const campaign = campaignId ? await prisma.emailCampaign.findUnique({ where: { id: campaignId } }) : null;

  const parsed = testSendSchema.parse({
    toEmail: String(formData.get("toEmail") || "").trim().toLowerCase(),
    subject: String(formData.get("subject") || campaign?.subject || "").trim(),
    htmlContent: cleanOptional(formData.get("htmlContent")) || campaign?.htmlContent || "",
    textContent: cleanOptional(formData.get("textContent")) || campaign?.textContent || undefined,
    fromName: String(formData.get("fromName") || campaign?.fromName || settings.defaultFromName).trim(),
    fromEmail: String(formData.get("fromEmail") || campaign?.fromEmail || settings.defaultFromEmail).trim(),
    replyToEmail: cleanOptional(formData.get("replyToEmail")) || campaign?.replyToEmail || settings.defaultReplyToEmail
  });

  const unsubscribeUrl = buildRecipientUnsubscribeUrl(settings.unsubscribeBaseUrl, parsed.toEmail);
  const messageId = await sendSesEmail({
    region: settings.awsRegion || undefined,
    fromEmail: parsed.fromEmail,
    fromName: parsed.fromName,
    toEmail: parsed.toEmail,
    replyToEmail: parsed.replyToEmail || undefined,
    subject: `[TEST] ${parsed.subject}`,
    htmlContent: parsed.htmlContent,
    textContent: parsed.textContent,
    configurationSetName: settings.sesConfigurationSet || undefined,
    unsubscribeUrl,
    tags: campaign?.id
      ? [
          { name: "campaign_id", value: campaign.id },
          { name: "test_send", value: "true" }
        ]
      : [{ name: "test_send", value: "true" }]
  });

  if (campaign?.id) {
    await prisma.emailEvent.create({
      data: {
        campaignId: campaign.id,
        eventType: "TEST_SEND_ACCEPTED",
        providerMessageId: messageId,
        payloadJson: JSON.stringify({ toEmail: parsed.toEmail })
      }
    });
  }

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "TEST_EMAIL_SENT",
    success: true,
    details: { toEmail: parsed.toEmail, campaignId: campaign?.id || null, messageId }
  });

  revalidateEmailWorkspace();
}

export async function sendSingleEmailAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const settings = await getAppSettings();

  const parsed = singleSendSchema.parse({
    toEmail: String(formData.get("toEmail") || "").trim().toLowerCase(),
    toName: cleanOptional(formData.get("toName")),
    subject: String(formData.get("subject") || "").trim(),
    htmlContent: cleanOptional(formData.get("htmlContent")) || "",
    textContent: cleanOptional(formData.get("textContent")),
    fromName: String(formData.get("fromName") || settings.defaultFromName).trim(),
    fromEmail: String(formData.get("fromEmail") || settings.defaultFromEmail).trim(),
    replyToEmail: cleanOptional(formData.get("replyToEmail")) || settings.defaultReplyToEmail
  });

  const unsubscribeUrl = buildRecipientUnsubscribeUrl(settings.unsubscribeBaseUrl, parsed.toEmail);
  const messageId = await sendSesEmail({
    region: settings.awsRegion || undefined,
    fromEmail: parsed.fromEmail,
    fromName: parsed.fromName,
    toEmail: parsed.toEmail,
    replyToEmail: parsed.replyToEmail || undefined,
    subject: parsed.subject,
    htmlContent: parsed.htmlContent,
    textContent: parsed.textContent,
    configurationSetName: settings.sesConfigurationSet || undefined,
    unsubscribeUrl,
    tags: [{ name: "single_send", value: "true" }]
  });

  await prisma.emailContact.upsert({
    where: { email: parsed.toEmail },
    update: {
      name: parsed.toName,
      source: ContactSource.MANUAL,
      status: ContactStatus.ACTIVE,
      lastContactedAt: new Date()
    },
    create: {
      email: parsed.toEmail,
      name: parsed.toName,
      source: ContactSource.MANUAL,
      status: ContactStatus.ACTIVE,
      lastContactedAt: new Date()
    }
  });

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "SINGLE_EMAIL_SENT",
    success: true,
    details: { toEmail: parsed.toEmail, messageId }
  });

  revalidateEmailWorkspace();
}

export async function resendRecipientAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();

  const recipientId = String(formData.get("recipientId") || "");
  if (!recipientId) {
    throw new Error("Recipient is required.");
  }

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    include: { campaign: true }
  });
  if (!recipient?.campaign) {
    throw new Error("Recipient or campaign not found.");
  }

  const { messageId } = await sendCampaignRecipient(recipient.campaign, recipient);
  const now = new Date();

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: RecipientStatus.SENT,
        sentAt: now,
        errorMessage: null
      }
    }),
    prisma.emailEvent.create({
      data: {
        campaignId: recipient.campaign.id,
        campaignRecipientId: recipient.id,
        eventType: "RESEND_ACCEPTED",
        providerMessageId: messageId,
        payloadJson: JSON.stringify({ email: recipient.email })
      }
    })
  ];

  if (recipient.contactId) {
    operations.push(
      prisma.emailContact.update({
        where: { id: recipient.contactId },
        data: { lastContactedAt: now }
      })
    );
  }

  await prisma.$transaction(operations);

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "RECIPIENT_RESENT",
    success: true,
    details: { recipientId: recipient.id, campaignId: recipient.campaign.id, email: recipient.email }
  });

  revalidateEmailWorkspace();
}

export async function updateEmailSettingsAction(formData: FormData) {
  await assertTrustedOrigin();
  await requireAdminOrManager();

  const entries = [
    ["workspaceTitle", String(formData.get("workspaceTitle") || "")],
    ["workspaceSubtitle", String(formData.get("workspaceSubtitle") || "")],
    ["defaultFromName", String(formData.get("defaultFromName") || "")],
    ["defaultFromEmail", String(formData.get("defaultFromEmail") || "")],
    ["defaultReplyToEmail", String(formData.get("defaultReplyToEmail") || "")],
    ["unsubscribeBaseUrl", String(formData.get("unsubscribeBaseUrl") || "")],
    ["awsRegion", String(formData.get("awsRegion") || "")],
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

  revalidateEmailWorkspace();
}
