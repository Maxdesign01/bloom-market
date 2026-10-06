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
  const apiUrl = region.startsWith("http")
    ? region
    : `https://${region.replace(/\/+$/, "")}`;

  const from =
    process.env.MAILGUN_FROM ?? `Bloom Market <postmaster@${domain}>`;

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

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://bloom-market.vercel.app").replace(/\/+$/, "");
}

/** Basic HTML wrapper used by every outgoing email matching Bloom Market branding. */
function shell(title: string, inner: string, footerNote?: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fcfaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16211a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fcfaf7;">
      <tr><td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7dfd2;box-shadow:0 4px 16px rgba(22,33,26,0.06);">
          <tr><td style="background:#1f3b26;padding:28px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.02em;">Bloom Market</h1>
                  <p style="margin:4px 0 0;color:#c2d7c5;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Fresh flowers, delivered across Lagos</p>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:36px;">
            ${inner}
          </td></tr>
          <tr><td style="padding:20px 36px 36px;border-top:1px solid #efe8dd;background:#faf7f2;color:#6b6153;font-size:12px;line-height:1.6;">
            ${footerNote ?? "This transactional notification was sent from Bloom Market."}
            <br/>&copy; ${new Date().getFullYear()} Bloom Market. Lagos, Nigeria.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Parses user-agent strings into friendly OS & browser descriptions.
 */
export function parseDevice(userAgent: string | null): string {
  if (!userAgent) return "Web Browser";
  const ua = userAgent.toLowerCase();

  let os = "Desktop";
  if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS Device";
  else if (ua.includes("android")) os = "Android Device";
  else if (ua.includes("windows")) os = "Windows PC";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "Mac";
  else if (ua.includes("linux")) os = "Linux";

  let client = "Browser";
  if (ua.includes("bloommarket") || ua.includes("expo")) client = "Mobile App";
  else if (ua.includes("edg/")) client = "Edge";
  else if (ua.includes("chrome") && !ua.includes("chromium")) client = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) client = "Safari";
  else if (ua.includes("firefox")) client = "Firefox";

  return `${os} · ${client}`;
}

/**
 * Send the order confirmation email for a paid order.
 * Returns true when Mailgun accepted the message.
 */
export async function sendOrderConfirmation(order: Order): Promise<boolean> {
  try {
    const { domain, from } = getConfig();
    const client = getClient();

    const items = order.order_items ?? [];
    const rows = items
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #efe8dd;color:#16211a;">${escapeHtml(
            item.name,
          )} &times; ${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #efe8dd;text-align:right;color:#16211a;font-weight:500;">${formatNaira(
            item.price * item.quantity,
          )}</td>
        </tr>`,
      )
      .join("");

    const html = shell(
      `Order ${order.id.slice(0, 8)} confirmed`,
      `
      <h2 style="margin:0 0 10px;font-size:22px;color:#16211a;font-weight:600;">Thanks, ${escapeHtml(
        order.full_name || "friend",
      )}! 🎉</h2>
      <p style="margin:0 0 24px;color:#55635a;font-size:15px;line-height:1.6;">
        Your payment was successful and we're preparing your flowers for delivery.
      </p>

      <div style="background:#f7f3ec;padding:16px 20px;border-radius:10px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#8a7d6b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Order reference</p>
        <p style="margin:0;font-family:monospace;font-size:14px;color:#16211a;font-weight:600;">
          ${escapeHtml(order.paystack_reference ?? order.id)}
        </p>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
        <thead>
          <tr>
            <th style="padding:8px 0;text-align:left;font-size:12px;color:#8a7d6b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #efe8dd;">Item</th>
            <th style="padding:8px 0;text-align:right;font-size:12px;color:#8a7d6b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #efe8dd;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <td style="padding:16px 0 0;font-weight:700;font-size:16px;color:#16211a;">Total paid</td>
            <td style="padding:16px 0 0;font-weight:700;font-size:16px;text-align:right;color:#1f3b26;">${formatNaira(
              order.total,
            )}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #efe8dd;">
        <p style="margin:0 0 6px;font-size:12px;color:#8a7d6b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Delivering to</p>
        <p style="margin:0;color:#16211a;font-size:14px;line-height:1.6;">
          ${escapeHtml(order.full_name)}<br/>
          ${escapeHtml(order.address)}<br/>
          ${escapeHtml(order.phone)}<br/>
          ${escapeHtml(order.email)}
        </p>
      </div>
      `,
      "This is an official order confirmation from Bloom Market.",
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
  } catch (err: any) {
    console.error("[mailgun] sendOrderConfirmation failed:", err?.message || err);
    return false;
  }
}

/**
 * Send the Welcome / Account Created email.
 * Sent on initial form registration or first-time Google sign-in.
 * Does not expose passwords. Safe error handling.
 */
export async function sendWelcomeEmail({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}): Promise<boolean> {
  try {
    const { domain, from } = getConfig();
    const client = getClient();
    const siteUrl = getSiteUrl();
    const recipientName = name?.trim() ? name.trim() : "Friend";

    const html = shell(
      "Welcome to Bloom Market",
      `
      <h2 style="margin:0 0 12px;font-size:22px;color:#16211a;font-weight:600;">Welcome to Bloom Market, ${escapeHtml(
        recipientName,
      )}! 🌸</h2>
      <p style="margin:0 0 16px;color:#55635a;font-size:15px;line-height:1.6;">
        Your account has been successfully created with <strong style="color:#16211a;">${escapeHtml(
          email,
        )}</strong>.
      </p>
      <p style="margin:0 0 24px;color:#55635a;font-size:15px;line-height:1.6;">
        You can now enjoy a seamless flower shopping experience:
      </p>

      <div style="background:#f7f3ec;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <ul style="margin:0;padding:0 0 0 20px;color:#2a4e32;font-size:14px;line-height:1.8;">
          <li><strong>Cross-device cart:</strong> Your shopping bag automatically stays synchronized across your phone and computer.</li>
          <li><strong>Order tracking:</strong> View past and upcoming bouquet deliveries anytime.</li>
          <li><strong>Faster checkout:</strong> Your details are prefilled for quick ordering.</li>
        </ul>
      </div>

      <div style="text-align:center;margin:32px 0 24px;">
        <a href="${siteUrl}/shop" style="display:inline-block;background:#1f3b26;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;box-shadow:0 2px 6px rgba(31,59,38,0.2);">
          Explore the flower collection &rarr;
        </a>
      </div>
      `,
      `You received this email because an account was created on Bloom Market using ${escapeHtml(email)}.`,
    );

    const text = [
      `Welcome to Bloom Market, ${recipientName}!`,
      "",
      `Your account has been created with: ${email}`,
      "",
      "What you can do now:",
      "- Cross-device cart sync across your phone and computer",
      "- Follow your flower orders and delivery status",
      "- Faster checkout with saved preferences",
      "",
      `Browse the collection: ${siteUrl}/shop`,
    ].join("\n");

    const result = await client.messages.create(domain, {
      from,
      to: [email],
      subject: "Welcome to Bloom Market — Your account has been created",
      text,
      html,
    });

    console.log(`[mailgun] Welcome email delivered to ${email} (message id: ${result?.id})`);
    return Boolean(result?.id);
  } catch (err: any) {
    console.error("[mailgun] sendWelcomeEmail failed (non-fatal):", err?.message || err);
    return false;
  }
}

/**
 * Send the Login Notification email when an existing account logs in.
 * Includes email, timestamp, and device/platform without sensitive tokens.
 */
export async function sendLoginNotification({
  email,
  name,
  userAgent,
  timestamp = new Date(),
}: {
  email: string;
  name?: string | null;
  userAgent?: string | null;
  timestamp?: Date;
}): Promise<boolean> {
  try {
    const { domain, from } = getConfig();
    const client = getClient();
    const siteUrl = getSiteUrl();
    const recipientName = name?.trim() ? name.trim() : "there";
    const device = parseDevice(userAgent ?? null);

    const formattedTime = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Africa/Lagos",
    }).format(timestamp);

    const html = shell(
      "New login to your Bloom Market account",
      `
      <h2 style="margin:0 0 12px;font-size:20px;color:#16211a;font-weight:600;">New login detected</h2>
      <p style="margin:0 0 20px;color:#55635a;font-size:15px;line-height:1.6;">
        Hello ${escapeHtml(recipientName)}, we noticed a new sign-in to your Bloom Market account.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8a7d6b;font-weight:600;width:120px;">Account:</td>
          <td style="padding:6px 0;font-size:14px;color:#16211a;font-weight:500;">${escapeHtml(email)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8a7d6b;font-weight:600;">Time:</td>
          <td style="padding:6px 0;font-size:14px;color:#16211a;">${escapeHtml(formattedTime)} (WAT)</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8a7d6b;font-weight:600;">Device:</td>
          <td style="padding:6px 0;font-size:14px;color:#16211a;">${escapeHtml(device)}</td>
        </tr>
      </table>

      <div style="background:#fdf2f5;border-left:4px solid #d24c72;padding:16px 20px;border-radius:4px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#7d2239;">
          <strong>Security notice:</strong> If you initiated this sign-in, no further action is needed. If you do not recognize this activity, please reset your password or contact our support team immediately at <strong>support@bloommarket.ng</strong>.
        </p>
      </div>

      <div style="text-align:center;margin:24px 0 12px;">
        <a href="${siteUrl}" style="display:inline-block;background:#1f3b26;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:999px;">
          Go to Bloom Market
        </a>
      </div>
      `,
      "This is a security notification from Bloom Market.",
    );

    const text = [
      "Bloom Market — New login notification",
      "",
      `Hello ${recipientName},`,
      `A new sign-in was detected for your account (${email}).`,
      "",
      `Time: ${formattedTime} (WAT)`,
      `Device: ${device}`,
      "",
      "If you did this, you can safely ignore this email.",
      "If you did NOT sign in, please secure your account immediately or email support@bloommarket.ng.",
      "",
      `Site: ${siteUrl}`,
    ].join("\n");

    const result = await client.messages.create(domain, {
      from,
      to: [email],
      subject: "New login to your Bloom Market account",
      text,
      html,
    });

    console.log(`[mailgun] Login notification email sent to ${email} (message id: ${result?.id})`);
    return Boolean(result?.id);
  } catch (err: any) {
    console.error("[mailgun] sendLoginNotification failed (non-fatal):", err?.message || err);
    return false;
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
