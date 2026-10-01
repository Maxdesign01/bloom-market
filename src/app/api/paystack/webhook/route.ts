import { NextResponse, type NextRequest } from "next/server";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/paystack";

/**
 * POST /api/paystack/webhook
 *
 * Paystack calls this on payment events. We verify the
 * `x-paystack-signature` header (HMAC-SHA512 of the raw body) before
 * trusting the payload, then mark the order paid (idempotent) which
 * triggers the Mailgun confirmation email.
 *
 * Local testing: set the webhook URL in Paystack dashboard once the site
 * is deployed, e.g. https://your-domain/api/paystack/webhook
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-paystack-signature");
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { status: false, message: "Invalid signature" },
      { status: 401 },
    );
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { status: false, message: "Malformed JSON" },
      { status: 400 },
    );
  }

  const reference = event.data?.reference;
  const eventType = event.event ?? "";

  // Only care about successful charges (and the generic success event).
  const isSuccess =
    eventType === "charge.success" || eventType === "subscription.create";

  if (!isSuccess || !reference) {
    return NextResponse.json({ status: true, received: true });
  }

  try {
    const result = await markOrderPaid(reference);
    return NextResponse.json({
      status: true,
      received: true,
      marked: result.won,
    });
  } catch (err) {
    console.error("[paystack] webhook processing failed:", err);
    // 500 makes Paystack retry, which is what we want on transient errors.
    return NextResponse.json(
      { status: false, message: "Processing error" },
      { status: 500 },
    );
  }
}
