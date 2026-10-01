"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddToCartButton({
  productId,
  disabled = false,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">(
    "idle",
  );

  async function add() {
    setStatus("adding");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!res.ok) throw new Error("Failed to add to cart");
      setStatus("added");
      // Tell the header badge to re-read the cart.
      window.dispatchEvent(new CustomEvent("cart:updated"));
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  if (disabled) {
    return (
      <button
        disabled
        className="inline-flex items-center rounded-lg bg-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-500 cursor-not-allowed"
      >
        Out of stock
      </button>
    );
  }

  return (
    <button
      onClick={add}
      disabled={status === "adding"}
      className={`inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
        status === "added"
          ? "bg-emerald-600 text-white"
          : status === "error"
            ? "bg-red-600 text-white"
            : "bg-zinc-900 text-white hover:bg-zinc-700"
      }`}
    >
      {status === "adding"
        ? "Adding…"
        : status === "added"
          ? "✓ Added"
          : status === "error"
            ? "Try again"
            : "Add to cart"}
    </button>
  );
}
