"use client";

import { useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export function CartView({
  initialItems,
  initialSubtotal,
}: {
  initialItems: CartItem[];
  initialSubtotal: number;
}) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [subtotal, setSubtotal] = useState(initialSubtotal);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(productId: string, quantity: number) {
    setBusyId(productId);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        cart: { cart_items: CartItem[] } | null;
      };
      const next = json.cart?.cart_items ?? [];
      setItems(next);
      setSubtotal(
        next.reduce((sum, i) => sum + (i.products?.price ?? 0) * i.quantity, 0),
      );
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch {
      setError("Could not update the cart — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function clear() {
    setBusyId("__all__");
    setError(null);
    try {
      const res = await fetch("/api/cart", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems([]);
      setSubtotal(0);
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch {
      setError("Could not clear the cart — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sand-300 bg-surface px-8 py-20 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-leaf-50 text-leaf-600">
          <BagIcon />
        </span>
        <h2 className="mt-6 font-display text-2xl font-medium">
          Nothing in the basket yet
        </h2>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-ink-soft">
          Pick something from the collection and it will show up here. Guest
          checkout is fine — no account needed.
        </p>
        <Link href="/#collection" className="bm-btn bm-btn-primary mt-8">
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
      <section className="overflow-hidden rounded-lg bg-surface shadow-soft ring-1 ring-line">
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const product = item.products;
            if (!product) return null;
            const lineTotal = product.price * item.quantity;
            const busy = busyId === product.id;

            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-4 p-4 sm:flex-nowrap sm:p-5"
              >
                <Link
                  href={`/products/${product.id}`}
                  className="shrink-0"
                  aria-label={product.name}
                >
                  <span className="bm-photo block h-20 w-20 rounded-md sm:h-24 sm:w-24">
                    {product.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-display text-base leading-snug font-medium transition-colors hover:text-leaf-700"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft tabular-nums">
                    {formatNaira(product.price)} each
                  </p>
                </div>

                <div className="flex items-center rounded-full ring-1 ring-sand-300">
                  <StepperButton
                    label={`Decrease quantity of ${product.name}`}
                    onClick={() => patch(product.id, item.quantity - 1)}
                    disabled={busy}
                  >
                    &minus;
                  </StepperButton>
                  <span
                    aria-live="polite"
                    className="w-8 text-center text-sm font-medium tabular-nums"
                  >
                    {item.quantity}
                  </span>
                  <StepperButton
                    label={`Increase quantity of ${product.name}`}
                    onClick={() => patch(product.id, item.quantity + 1)}
                    disabled={busy || item.quantity >= product.stock}
                  >
                    +
                  </StepperButton>
                </div>

                <p className="w-24 shrink-0 text-right font-display text-base font-semibold tabular-nums sm:w-28">
                  {formatNaira(lineTotal)}
                </p>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch(product.id, 0)}
                  className="shrink-0 text-sm text-ink-soft transition-colors hover:text-bloom-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="h-fit rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-medium">Order summary</h2>

        <dl className="mt-6 space-y-3.5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">
              Items ({items.reduce((sum, i) => sum + i.quantity, 0)})
            </dt>
            <dd className="tabular-nums">{formatNaira(subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Delivery</dt>
            <dd className="font-medium text-leaf-700">Free</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <span className="font-display text-lg font-medium">Total</span>
          <span className="font-display text-2xl font-semibold tabular-nums">
            {formatNaira(subtotal)}
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-sm border border-bloom-200 bg-bloom-50 px-4 py-3 text-sm text-bloom-800"
          >
            {error}
          </p>
        )}

        <Link href="/checkout" className="bm-btn bm-btn-primary mt-7 w-full">
          Proceed to checkout
        </Link>

        <button
          type="button"
          onClick={clear}
          disabled={busyId === "__all__"}
          className="mt-4 w-full text-sm text-ink-soft transition-colors hover:text-bloom-600 disabled:opacity-50"
        >
          {busyId === "__all__" ? "Clearing…" : "Clear cart"}
        </button>

        <p className="mt-6 flex items-center justify-center gap-2 border-t border-line pt-5 text-xs text-ink-soft">
          <LockIcon />
          Secure checkout powered by Paystack
        </p>
      </aside>
    </div>
  );
}

function StepperButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-full text-lg leading-none text-ink-soft transition-colors hover:bg-sand-100 hover:text-leaf-800 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function BagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 8h11l-.9 11.1a1.5 1.5 0 0 1-1.5 1.4H8.9a1.5 1.5 0 0 1-1.5-1.4L6.5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10V6.8a2.5 2.5 0 0 1 5 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8.5 10.5V7.8a3.5 3.5 0 1 1 7 0v2.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

