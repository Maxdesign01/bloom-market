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
        className="bm-btn cursor-not-allowed bg-sand-200 text-sand-600 shadow-none"
      >
        Out of stock
      </button>
    );
  }

  const styles =
    status === "added"
      ? "bg-leaf-600 text-white"
      : status === "error"
        ? "bg-bloom-600 text-white"
        : "bm-btn-primary";

  return (
    <button
      onClick={add}
      disabled={status === "adding"}
      className={`bm-btn ${styles}`}
    >
      {status === "adding" ? (
        <>
          <Spinner />
          Adding…
        </>
      ) : status === "added" ? (
        <>
          <CheckIcon />
          Added to cart
        </>
      ) : status === "error" ? (
        "Try again"
      ) : (
        "Add to cart"
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
