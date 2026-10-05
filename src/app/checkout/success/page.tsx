import Link from "next/link";
import { getOrderByReference, markOrderPaid } from "@/lib/orders";
import { verifyTransaction } from "@/lib/paystack";
import { clearCart, resolveCartId } from "@/lib/cart";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payment result" };

/**
 * Paystack redirects back here after the customer completes (or abandons)
 * payment. We verify the transaction server-side rather than trusting the
 * redirect, then mark the order paid — the same idempotent path the webhook
 * uses, so whichever arrives first wins and the email is sent exactly once.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reference =
    typeof params.reference === "string" ? params.reference : null;

  if (!reference) {
    return (
      <StatusPanel
        tone="sand"
        title="Missing payment reference"
        body="We couldn’t find a transaction to verify. If you were charged, email us and we’ll sort it out."
        action={{ href: "/", label: "Back to the shop" }}
      />
    );
  }

  // Verify with Paystack (throws on API failure).
  let verified = false;
  let verifyError: string | null = null;
  let amount = 0;
  let channel = "";

  try {
    const result = await verifyTransaction(reference);
    verified = result.data.status === "success";
    amount = result.data.amount;
    channel = result.data.channel;
    if (!verified) {
      verifyError = `Payment status: ${result.data.status}`;
    }
  } catch (err) {
    verifyError = err instanceof Error ? err.message : "Verification failed";
  }

  if (!verified) {
    return (
      <StatusPanel
        tone="bloom"
        title="Payment not completed"
        body={`${verifyError ?? "Your payment was not successful."} No charge was made, and your cart is still waiting for you.`}
        action={{ href: "/checkout", label: "Back to checkout" }}
      />
    );
  }

  // Payment verified — mark paid + send confirmation email (idempotent).
  const { won } = await markOrderPaid(reference);
  const order = await getOrderByReference(reference);

  // Empty the cart now that payment succeeded.
  await clearCart(await resolveCartId());

  if (!order) {
    return (
      <StatusPanel
        tone="leaf"
        title="Payment received"
        body={`We couldn’t find the matching order, but your payment of ${formatNaira(amount)} went through. Support will be in touch.`}
        action={{ href: "/", label: "Back to the shop" }}
      />
    );
  }

  // If the webhook got here first, `won` is false and the email already went
  // out; otherwise this call sent it.
  void won;

  return (
    <div className="bm-shell py-16 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-leaf-100 text-leaf-700">
            <CheckIcon />
          </span>
          <p className="bm-eyebrow mt-7">Payment successful</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
            Thank you — your flowers are reserved
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-ink-soft sm:text-base">
            Order{" "}
            <span className="font-mono text-ink">
              {order.paystack_reference}
            </span>{" "}
            is confirmed.{" "}
            {order.email_sent_at
              ? "A confirmation email is on its way to your inbox."
              : "We’re sending your confirmation email now."}
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-lg bg-surface shadow-soft ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand-50 px-6 py-4 text-xs text-ink-soft">
            <span>Paid via {channel || "card"}</span>
            <span>{new Date(order.created_at).toLocaleString("en-NG")}</span>
          </div>

          <ul className="divide-y divide-line px-6">
            {(order.order_items ?? []).map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 py-4 text-sm"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-0.5 text-ink-soft">Qty {item.quantity}</p>
                </div>
                <span className="shrink-0 tabular-nums">
                  {formatNaira(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-baseline justify-between gap-4 border-t border-line px-6 py-5">
            <span className="font-display text-lg font-medium">Total paid</span>
            <span className="font-display text-2xl font-semibold tabular-nums">
              {formatNaira(order.total)}
            </span>
          </div>

          <div className="border-t border-line bg-sand-50 px-6 py-5 text-sm">
            <p className="text-ink-soft">Delivering to</p>
            <address className="mt-2 space-y-0.5 not-italic leading-relaxed text-ink">
              <p className="font-medium">{order.full_name}</p>
              <p>{order.address}</p>
              <p>{order.phone}</p>
            </address>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders" className="bm-btn bm-btn-primary">
            View my orders
          </Link>
          <Link href="/#collection" className="bm-btn bm-btn-outline">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({
  tone,
  title,
  body,
  action,
}: {
  tone: "sand" | "leaf" | "bloom";
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  const toneClass =
    tone === "leaf"
      ? "bg-leaf-100 text-leaf-700"
      : tone === "bloom"
        ? "bg-bloom-50 text-bloom-600"
        : "bg-sand-200 text-sand-600";

  return (
    <div className="bm-shell py-20 sm:py-28">
      <div className="mx-auto max-w-lg text-center">
        <span
          className={`mx-auto grid size-16 place-items-center rounded-full ${toneClass}`}
        >
          <span className="font-display text-2xl font-semibold">BM</span>
        </span>
        <h1 className="mt-8 font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{body}</p>
        <Link href={action.href} className="bm-btn bm-btn-primary mt-9">
          {action.label}
        </Link>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m5 13 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

