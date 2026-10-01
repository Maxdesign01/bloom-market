import Mailgun from "mailgun.js";
import FormData from "form-data";
import type { Order } from "@/lib/types";
import { formatNaira } from "@/lib/format";

type MailgunConfig = {
  apiKey: string;
  domain: string;
  from: string;
  apiUrl: string;
};

function getConfig(): MailgunConfig {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey) throw new Error("MAILGUN_API_KEY is not set");
  if (!domain) throw new Error("MAILGUN_DOMAIN is not set");

  const region = (process.env.MAILGUN_REGION ?? "api.mailgun.net").trim();
  // Accept either a bare host ("api.eu.mailgun.net") or a full URL.
  const apiUrl = region.startsWith("http")
    ? region
    : `https://${region.replace(/\/+$/, "")}`;

  const from =
    process.env.MAILGUN_FROM ?? `Mailgun Sandbox <postmaster@${domain}>`;

  return { apiKey, domain, from, apiUrl };
}

function getClient() {
  const { apiKey, apiUrl } = getConfig();
  const mailgun = new Mailgun(FormData);
  return mailgun.client({
    username: "api",
    key: apiKey,
    url: apiUrl,
  });
}

/** Basic HTML wrapper used by every outgoing email. */
function shell(title: string, inner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr><td style="background:#16a34a;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;">Bloom Market</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            ${inner}
          </td></tr>
          <tr><td style="padding:16px 32px 32px;color:#71717a;font-size:12px;">
            This is an order confirmation from Bloom Market.
          </td></tr>
        </table>
      </td></tr>
    </table>
    <title>${title}</title>
  </body>
</html>`;
}

/**
 * Send the order confirmation email for a paid order.
 * Returns true when Mailgun accepted the message.
 */
export async function sendOrderConfirmation(order: Order): Promise<boolean> {
  const { domain, from } = getConfig();
  const client = getClient();

  const items = order.order_items ?? [];
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">${escapeHtml(
          item.name,
        )} &times; ${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;text-align:right;">${formatNaira(
          item.price * item.quantity,
        )}</td>
      </tr>`,
    )
    .join("");

  const html = shell(
    `Order ${order.id.slice(0, 8)} confirmed`,
    `
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Thanks, ${escapeHtml(
      order.full_name || "friend",
    )}! 🎉</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
      Your payment was successful and we're preparing your flowers for delivery.
    </p>

    <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Order reference</p>
    <p style="margin:0 0 16px;font-family:monospace;font-size:13px;color:#18181b;">
      ${escapeHtml(order.paystack_reference ?? order.id)}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <th style="padding:8px 0;text-align:left;font-size:13px;color:#71717a;border-bottom:2px solid #e4e4e7;">Item</th>
        <th style="padding:8px 0;text-align:right;font-size:13px;color:#71717a;border-bottom:2px solid #e4e4e7;">Amount</th>
      </tr>
      ${rows}
      <tr>
        <td style="padding:12px 0 0;font-weight:bold;">Total paid</td>
        <td style="padding:12px 0 0;font-weight:bold;text-align:right;">${formatNaira(
          order.total,
        )}</td>
      </tr>
    </table>

    <p style="margin:24px 0 4px;font-size:13px;color:#71717a;">Delivering to</p>
    <p style="margin:0;color:#18181b;font-size:14px;line-height:1.6;">
      ${escapeHtml(order.full_name)}<br/>
      ${escapeHtml(order.address)}<br/>
      ${escapeHtml(order.phone)}<br/>
      ${escapeHtml(order.email)}
    </p>
    `,
  );

  const text = [
    "Bloom Market — order confirmation",
    `Reference: ${order.paystack_reference ?? order.id}`,
    "",
    ...items.map(
      (i) => `${i.name} x ${i.quantity} — ${formatNaira(i.price * i.quantity)}`,
    ),
    "",
    `Total paid: ${formatNaira(order.total)}`,
    "",
    "Delivering to:",
    order.full_name,
    order.address,
    order.phone,
    order.email,
  ].join("\n");

  const result = await client.messages.create(domain, {
    from,
    to: [order.email],
    subject: `Your Bloom Market order is confirmed — ${formatNaira(order.total)}`,
    text,
    html,
  });

  return Boolean(result?.id);
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
