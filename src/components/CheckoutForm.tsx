"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutResponse } from "@/lib/types";

const FIELDS = [
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
  {
    name: "address",
    label: "Delivery address",
    type: "text",
    autoComplete: "street-address",
  },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

export function CheckoutForm({
  initialEmail,
  initialName,
  isEmpty,
}: {
  initialEmail: string;
  initialName: string;
  isEmpty: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({
    fullName: initialName,
    email: initialEmail,
    phone: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    for (const field of FIELDS) {
      if (!values[field.name].trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          address: values.address,
        }),
      });

      const json = (await res.json()) as CheckoutResponse;

      if (!json.ok) {
        setError(json.error);
        setSubmitting(false);
        return;
      }

      // Full redirect to Paystack's hosted checkout.
      window.location.assign(json.authorizationUrl);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
        Add something to your cart before checking out.
        <button
          type="button"
          onClick={() => router.push("/")}
          className="ml-2 text-emerald-700 underline"
        >
          Browse products
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={field.name === "address" ? "sm:col-span-2" : undefined}
          >
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(e) => update(field.name, e.target.value)}
              disabled={submitting}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-50"
            />
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
      >
        {submitting ? "Redirecting to Paystack…" : "Pay with Paystack →"}
      </button>

      <p className="text-xs text-zinc-500">
        You&apos;ll be taken to Paystack&apos;s secure page to complete payment.
        We&apos;ll email your confirmation as soon as it clears.
      </p>
    </form>
  );
}
