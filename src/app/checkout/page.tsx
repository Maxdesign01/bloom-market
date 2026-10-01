import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCart, getOrCreateCartId } from "@/lib/cart";
import { formatNaira } from "@/lib/format";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  // Prefill details for signed-in customers.
  let initialEmail = "";
  let initialName = "";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      initialEmail = user.email ?? "";
      initialName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
    }
  } catch {
    // Not signed in — guest checkout is fine.
  }

  // Load the cart for the summary panel.
  const cart = await getCart(await getOrCreateCartId());
  const items = cart?.cart_items ?? [];
  const subtotal = items.reduce(
    (sum, i) => sum + (i.products?.price ?? 0) * i.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-zinc-500">
          You&apos;ll be redirected to Paystack to complete payment securely.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium mb-4">Shipping details</h2>
          <CheckoutForm
            initialEmail={initialEmail}
            initialName={initialName}
            isEmpty={items.length === 0}
          />
        </section>

        <aside className="rounded-xl border border-zinc-200 bg-white p-6 h-fit">
          <h2 className="text-lg font-medium mb-4">Order summary</h2>

          {items.length === 0 ? (
            <div className="text-sm text-zinc-500">
              Your cart is empty.{" "}
              <Link href="/" className="text-emerald-700 underline">
                Browse products
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.products?.name}</p>
                      <p className="text-zinc-500">Qty {item.quantity}</p>
                    </div>
                    <span className="whitespace-nowrap">
                      {formatNaira(
                        (item.products?.price ?? 0) * item.quantity,
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-1 border-t border-zinc-200 pt-4 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>

                <div className="flex justify-between font-semibold text-base pt-2">
                  <span>Total</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Test mode: use card <strong>4242 4242 4242 4242</strong>, any
                future expiry, any CVV.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

