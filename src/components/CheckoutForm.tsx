"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutResponse } from "@/lib/types";

const FIELDS = [
  {
    name: "fullName",
    label: "Full name",
    type: "text",
    autoComplete: "name",
    placeholder: "Adaeze Okonkwo",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
    placeholder: "you@example.com",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    autoComplete: "tel",
    placeholder: "+234 800 000 0000",
  },
  {
    name: "address",
    label: "Delivery address",
    type: "text",
    autoComplete: "street-address",
    placeholder: "12B Admiralty Way, Lekki Phase 1, Lagos",
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
      <div className="rounded-lg border border-dashed border-sand-300 bg-sand-50 px-6 py-12 text-center">
        <p className="text-sm text-ink-soft">
          Your basket is empty, so there is nothing to check out yet.
        </p>
        <button
          type="button"
          onClick={() => router.push("/#collection")}
          className="bm-btn bm-btn-primary mt-6"
        >
          Browse the collection
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={field.name === "address" ? "sm:col-span-2" : undefined}
          >
            <label htmlFor={field.name} className="bm-label">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={(e) => update(field.name, e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              required
              className="bm-input"
            />
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-sm border border-bloom-200 bg-bloom-50 px-4 py-3.5 text-sm text-bloom-800"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bm-btn bm-btn-primary mt-8 w-full sm:w-auto"
      >
        {submitting ? "Redirecting to Paystack…" : "Continue to payment"}
      </button>

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <LockIcon />
        <span>
          You&apos;ll be taken to Paystack&apos;s secure page to pay. We email your
          confirmation the moment it clears.
        </span>
      </p>
    </form>
  );
}

function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="mt-0.5 shrink-0"
    >
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
