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
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center space-y-4">
        <div className="text-5xl">🛒</div>
        <p className="text-zinc-600">Your cart is empty.</p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        {items.map((item) => {
          const product = item.products;
          if (!product) return null;
          const lineTotal = product.price * item.quantity;
          const busy = busyId === product.id;

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-4 p-4 sm:p-5"
            >
              <Link
                href={`/products/${product.id}`}
                className="h-16 w-16 shrink-0 rounded-lg bg-zinc-100 overflow-hidden"
              >
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-2xl">
                    🌸
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-[140px]">
                <Link
                  href={`/products/${product.id}`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
                <p className="text-sm text-zinc-500">
                  {formatNaira(product.price)} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${product.name}`}
                  disabled={busy}
                  onClick={() => patch(product.id, item.quantity - 1)}
                  className="h-8 w-8 rounded-md border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${product.name}`}
                  disabled={busy || item.quantity >= product.stock}
                  onClick={() => patch(product.id, item.quantity + 1)}
                  className="h-8 w-8 rounded-md border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <div className="w-24 text-right font-medium tabular-nums">
                {formatNaira(lineTotal)}
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => patch(product.id, 0)}
                className="text-sm text-red-600 hover:underline disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          );
        })}
      </section>

      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatNaira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>Delivery</span>
          <span>Free</span>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Link
          href="/checkout"
          className="block w-full text-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Proceed to checkout →
        </Link>

        <button
          type="button"
          onClick={clear}
          disabled={busyId === "__all__"}
          className="w-full text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
        >
          {busyId === "__all__" ? "Clearing…" : "Clear cart"}
        </button>
      </aside>
    </div>
  );
}

