"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Suspense } from "react";

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
      <div className="max-w-sm mx-auto py-16 text-center text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white text-lg font-bold">
            B
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {user ? "You're signed in" : "Sign in to Bloom Market"}
          </h1>
          <p className="text-sm text-zinc-500">
            {user
              ? "Signed in as"
              : "Use your Google account to track orders and check out faster."}
          </p>
          {user && (
            <p className="text-sm font-medium break-all">{user.email}</p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words"
          >
            {error}
          </div>
        )}

        {user ? (
          <div className="space-y-3">
            <button
              onClick={() => router.push("/orders")}
              className="w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              View my orders
            </button>
            <button
              onClick={signOut}
              disabled={isPending}
              className="w-full rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            {signingIn ? "Redirecting to Google…" : "Continue with Google"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-sm mx-auto py-16 text-center text-zinc-500 text-sm">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
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
