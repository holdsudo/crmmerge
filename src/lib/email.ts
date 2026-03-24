import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";
import { getAppSettings } from "@/lib/app-settings";

type SendEmailInput = {
  region?: string | null;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  replyToEmail?: string | null;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  configurationSetName?: string | null;
  unsubscribeUrl?: string | null;
  tags?: Array<{ name: string; value: string }>;
};

const sesClientCache = new Map<string, SESv2Client>();

function getRegion(preferred?: string | null) {
  return preferred || process.env.AWS_REGION || process.env.SES_REGION || "us-east-1";
}

function getSesClient(region?: string | null) {
  const resolvedRegion = getRegion(region);
  const existing = sesClientCache.get(resolvedRegion);
  if (existing) {
    return existing;
  }

  const client = new SESv2Client({ region: resolvedRegion });
  sesClientCache.set(resolvedRegion, client);
  return client;
}

function buildFromAddress(fromName: string, fromEmail: string) {
  return fromName.trim() ? `${fromName} <${fromEmail}>` : fromEmail;
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|table|section|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function appendUnsubscribeCopy(text: string, unsubscribeUrl?: string | null) {
  if (!unsubscribeUrl) {
    return text;
  }
  return `${text}\n\nUnsubscribe: ${unsubscribeUrl}`;
}

function parseBoolean(value: string | null | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }
  return value === "true";
}

function resolveEmailMode(settings: Record<string, string>) {
  const explicit = settings.emailDeliveryMode?.trim().toLowerCase();
  if (explicit === "smtp" || explicit === "ses") {
    return explicit;
  }

  return settings.smtpHost?.trim() ? "smtp" : "ses";
}

async function sendViaSes(input: SendEmailInput) {
  const client = getSesClient(input.region);
  const textBody = appendUnsubscribeCopy(input.textContent?.trim() || stripHtmlToText(input.htmlContent), input.unsubscribeUrl);

  const response = await client.send(
    new SendEmailCommand({
      FromEmailAddress: buildFromAddress(input.fromName, input.fromEmail),
      Destination: {
        ToAddresses: [input.toEmail]
      },
      ReplyToAddresses: input.replyToEmail ? [input.replyToEmail] : undefined,
      ConfigurationSetName: input.configurationSetName || undefined,
      EmailTags: input.tags?.map((tag) => ({ Name: tag.name, Value: tag.value })),
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: input.htmlContent, Charset: "UTF-8" },
            Text: { Data: textBody, Charset: "UTF-8" }
          }
        }
      }
    })
  );

  return response.MessageId || null;
}

async function sendViaSmtp(input: SendEmailInput, settings: Record<string, string>) {
  const host = settings.smtpHost?.trim() || process.env.SMTP_HOST;
  const portValue = settings.smtpPort?.trim() || process.env.SMTP_PORT || "25";
  const port = Number(portValue);

  if (!host || Number.isNaN(port)) {
    throw new Error("SMTP host and port must be configured.");
  }

  const secure = parseBoolean(settings.smtpSecure || process.env.SMTP_SECURE, port === 465);
  const user = settings.smtpUsername?.trim() || process.env.SMTP_USERNAME || "";
  const pass = settings.smtpPassword || process.env.SMTP_PASSWORD || "";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined
  });

  const textBody = appendUnsubscribeCopy(input.textContent?.trim() || stripHtmlToText(input.htmlContent), input.unsubscribeUrl);
  const response = await transporter.sendMail({
    from: buildFromAddress(input.fromName, input.fromEmail),
    to: input.toEmail,
    replyTo: input.replyToEmail || undefined,
    subject: input.subject,
    html: input.htmlContent,
    text: textBody,
    headers: input.unsubscribeUrl ? { "List-Unsubscribe": `<${input.unsubscribeUrl}>` } : undefined
  });

  return response.messageId || null;
}

export async function sendEmail(input: SendEmailInput) {
  const settings = await getAppSettings();
  const mode = resolveEmailMode(settings);

  if (mode === "smtp") {
    return sendViaSmtp(input, settings);
  }

  return sendViaSes(input);
}
