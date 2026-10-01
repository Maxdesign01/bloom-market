/**
 * Paystack REST API helpers (test mode).
 * Docs: https://paystack.com/docs/api
 */

import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";


function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function paystackFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Paystack data is never stale enough to cache.
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.status) {
    throw new Error(
      `Paystack ${path} failed: ${body?.message ?? res.statusText}`,
    );
  }
  return body as T;
}

export type InitializeTransactionResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type VerifyTransactionResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number; // kobo
    currency: string;
    status: string; // success | failed | abandoned ...
    channel: string;
    paid_at: string | null;
    customer: { email: string; first_name?: string; last_name?: string };
    metadata: Record<string, unknown>;
  };
};

/**
 * Initialize a transaction. `amount` is in kobo.
 * `callbackUrl` is where Paystack redirects the customer after payment.
 */
export async function initializeTransaction(params: {
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeTransactionResponse> {
  return paystackFetch<InitializeTransactionResponse>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        currency: params.currency ?? "NGN",
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    },
  );
}

/** Verify a transaction by its reference. */
export async function verifyTransaction(
  reference: string,
): Promise<VerifyTransactionResponse> {
  return paystackFetch<VerifyTransactionResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

/**
 * Verify the `x-paystack-signature` webhook header.
 * signature = HMAC-SHA512(body, secret)
 */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const expected = createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

