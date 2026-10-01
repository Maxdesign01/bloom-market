"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(
    () => searchParams.get("error"),
  );
  const [isPending, startTransition] = useTransition();

  const nextPath = searchParams.get("next") ?? "/";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  async function signInWithGoogle() {
    setError(null);
    setSigningIn(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (oauthError) throw oauthError;
      // The browser is being redirected to Google — no further code runs.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setSigningIn(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    startTransition(() => router.refresh());
  }

  if (loading) {
    return (
      <div className="bm-shell py-24">
        <div className="mx-auto max-w-md">
          <div className="rounded-lg bg-surface p-8 text-center shadow-soft ring-1 ring-line">
            <p className="text-sm text-ink-soft">Checking your session…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-sand-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-[24rem] rounded-full bg-bloom-100/60 blur-3xl"
      />

      <div className="bm-shell relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:py-24">
        {/* Editorial side */}
        <div className="max-w-lg">
          <Logo href="/" size={30} />
          <h1 className="mt-9 font-display text-4xl leading-[1.08] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
            One account, every bouquet you send
          </h1>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Sign in with Google to follow your orders, reorder something you loved
            last month, and check out a little faster. Your details are prefilled
            at checkout.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              "Track every order and its payment status",
              "Your email and name filled in at checkout",
              "Guest checkout still works, account or not",
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-leaf-100 text-leaf-700">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="m5 13 4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm leading-relaxed text-ink-soft">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-lg bg-surface p-8 shadow-lift ring-1 ring-line sm:p-9">
            <div className="text-center">
              <Logo href={null} size={24} className="justify-center" />
              <h2 className="mt-6 font-display text-2xl font-medium">
                {user ? "You’re signed in" : "Sign in to Bloom Market"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {user
                  ? "Signed in as"
                  : "Use your Google account to check out faster and track orders."}
              </p>
              {user && (
                <p className="mt-2 text-sm font-medium break-all">{user.email}</p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-sm border border-bloom-200 bg-bloom-50 px-4 py-3.5 text-sm leading-relaxed text-bloom-800"
              >
                {error}
              </div>
            )}

            {user ? (
              <div className="mt-7 space-y-3">
                <button
                  onClick={() => router.push("/orders")}
                  className="bm-btn bm-btn-primary w-full"
                >
                  View my orders
                </button>
                <button
                  onClick={signOut}
                  disabled={isPending}
                  className="bm-btn bm-btn-outline w-full"
                >
                  {isPending ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="bm-btn mt-7 w-full bg-surface text-ink shadow-soft ring-1 ring-sand-300 hover:bg-sand-50"
              >
                <GoogleIcon />
                {signingIn ? "Redirecting to Google…" : "Continue with Google"}
              </button>
            )}

            <p className="mt-6 flex items-center justify-center gap-2 border-t border-line pt-5 text-xs text-ink-soft">
              <LockIcon />
              We never see or store your Google password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bm-shell py-24">
          <div className="mx-auto max-w-md rounded-lg bg-surface p-8 text-center text-sm text-ink-soft shadow-soft ring-1 ring-line">
            Loading…
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
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
      className="shrink-0"
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

function GoogleIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
