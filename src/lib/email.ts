import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

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

const clientCache = new Map<string, SESv2Client>();

function getRegion(preferred?: string | null) {
  return preferred || process.env.AWS_REGION || process.env.SES_REGION || "us-east-1";
}

export function getSesClient(region?: string | null) {
  const resolvedRegion = getRegion(region);
  const existing = clientCache.get(resolvedRegion);
  if (existing) {
    return existing;
  }

  const client = new SESv2Client({ region: resolvedRegion });
  clientCache.set(resolvedRegion, client);
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

export async function sendSesEmail(input: SendEmailInput) {
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
