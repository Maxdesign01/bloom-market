import Link from "next/link";
import { getOrderByReference, markOrderPaid } from "@/lib/orders";
import { verifyTransaction } from "@/lib/paystack";
import { clearCart, getCartCookie } from "@/lib/cart";
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
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <div className="text-5xl">🤔</div>
        <h1 className="text-2xl font-semibold">Missing payment reference</h1>
        <p className="text-zinc-500 text-sm">
          We couldn&apos;t find a transaction to verify.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to shop
        </Link>
      </div>
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
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <div className="text-5xl">😞</div>
        <h1 className="text-2xl font-semibold">Payment not completed</h1>
        <p className="text-zinc-500 text-sm">
          {verifyError ?? "Your payment was not successful."}
        </p>
        <p className="text-zinc-500 text-sm">
          No charge was made, and your cart is still waiting for you.
        </p>
        <Link
          href="/checkout"
          className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to checkout
        </Link>
      </div>
    );
  }

  // Payment verified — mark paid + send confirmation email (idempotent).
  const { won } = await markOrderPaid(reference);
  const order = await getOrderByReference(reference);

  // Empty the cart now that payment succeeded.
  await clearCart(await getCartCookie());

  if (!order) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-semibold">Payment received</h1>
        <p className="text-zinc-500 text-sm">
          We couldn&apos;t find the matching order, but your payment of{" "}
          {formatNaira(amount)} went through. Support will be in touch.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  // If the webhook got here first, `won` is false and the email already went
  // out; otherwise this call sent it.
  void won;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3 py-8">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Payment successful!
        </h1>
        <p className="text-zinc-500">
          Order <span className="font-mono">{order.paystack_reference}</span> is
          confirmed.
          {order.email_sent_at
            ? " A confirmation email is on its way to your inbox."
            : " We're sending your confirmation email now."}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between text-sm text-zinc-500 mb-4">
          <span>Paid via {channel || "card"}</span>
          <span>{new Date(order.created_at).toLocaleString("en-NG")}</span>
        </div>

        <ul className="divide-y divide-zinc-100">
          {(order.order_items ?? []).map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-zinc-500">Qty {item.quantity}</p>
              </div>
              <span>{formatNaira(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 font-semibold">
          <span>Total paid</span>
          <span>{formatNaira(order.total)}</span>
        </div>

        <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 space-y-1">
          <p className="font-medium text-zinc-800">Delivering to</p>
          <p>{order.full_name}</p>
          <p>{order.address}</p>
          <p>{order.phone}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/orders"
          className="inline-flex justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          View my orders
        </Link>
        <Link
          href="/"
          className="inline-flex justify-center rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

