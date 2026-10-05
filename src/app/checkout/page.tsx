import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCart, resolveCartId } from "@/lib/cart";
import { formatNaira } from "@/lib/format";
import { CheckoutForm } from "@/components/CheckoutForm";
import { PageHeader } from "@/components/PageHeader";
import { Logo } from "@/components/Logo";

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
  const cart = await getCart(await resolveCartId());
  const items = cart?.cart_items ?? [];
  const subtotal = items.reduce(
    (sum, i) => sum + (i.products?.price ?? 0) * i.quantity,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Step 2 of 2"
        title="Checkout"
        copy="Tell us where the flowers are going, then pay on Paystack's secure page."
        crumbs={[
          { href: "/", label: "Shop" },
          { href: "/cart", label: "Your cart" },
        ]}
      />

      <div className="bm-shell py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
          <section className="rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line sm:p-8">
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <Logo href="/" variant="mark" size={20} />
              <h2 className="font-display text-xl font-medium">
                Delivery details
              </h2>
            </div>
            <div className="mt-7">
              <CheckoutForm
                initialEmail={initialEmail}
                initialName={initialName}
                isEmpty={items.length === 0}
              />
            </div>
          </section>

          <aside className="h-fit rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line lg:sticky lg:top-28">
            <h2 className="font-display text-lg font-medium">Order summary</h2>

            {items.length === 0 ? (
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                Your cart is empty.{" "}
                <Link
                  href="/#collection"
                  className="text-leaf-700 underline underline-offset-4"
                >
                  Browse the collection
                </Link>{" "}
                to add something first.
              </p>
            ) : (
              <>
                <ul className="mt-6 space-y-4">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.products?.name}</p>
                        <p className="mt-0.5 text-ink-soft">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {formatNaira(
                          (item.products?.price ?? 0) * item.quantity,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-3.5 border-t border-line pt-5 text-sm">
                  <div className="flex justify-between gap-4 text-ink-soft">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatNaira(subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-ink-soft">
                    <span>Delivery</span>
                    <span className="font-medium text-leaf-700">Free</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 border-t border-line pt-5">
                    <span className="font-display text-lg font-medium">
                      Total
                    </span>
                    <span className="font-display text-2xl font-semibold tabular-nums">
                      {formatNaira(subtotal)}
                    </span>
                  </div>
                </div>

                <p className="mt-6 rounded-sm bg-sand-100 px-4 py-3 text-xs leading-relaxed text-ink-soft">
                  <strong className="font-semibold text-ink">Test mode.</strong>{" "}
                  On Paystack use card{" "}
                  <strong className="font-semibold text-ink">
                    4242 4242 4242 4242
                  </strong>{" "}
                  with any future expiry and any CVV.
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

