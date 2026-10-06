"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Logo } from "@/components/Logo";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [error, setError] = useState<string | null>(
    () => searchParams.get("error"),
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const nextPath = searchParams.get("next") ?? "/";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update mode if query param changes
  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  async function signInWithGoogle() {
    setError(null);
    setSuccessMessage(null);
    setSigningInGoogle(true);
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
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
      setSigningInGoogle(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid email or password.");
      }

      // Sync browser client state
      const supabase = createClient();
      await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      window.dispatchEvent(new CustomEvent("cart:updated"));
      startTransition(() => {
        router.refresh();
        router.push(nextPath);
      });
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not create account.");
      }

      // If immediate session was created, sync client session
      if (data.hasSession) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        window.dispatchEvent(new CustomEvent("cart:updated"));
        startTransition(() => {
          router.refresh();
          router.push(nextPath);
        });
      } else {
        setSuccessMessage(
          "Your account has been created! Please check your email to verify your address, then sign in.",
        );
        setMode("login");
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || "Could not create account. Please try again.");
      setSubmitting(false);
    }
  }

  async function signOut() {
    setError(null);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      startTransition(() => {
        router.refresh();
        router.push("/");
      });
    } catch {
      setError("Failed to sign out cleanly.");
    }
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

      <div className="bm-shell relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-2 lg:gap-20 lg:py-20">
        {/* Editorial side */}
        <div className="max-w-lg">
          <Logo href="/" size={30} />
          <h1 className="mt-8 font-display text-4xl leading-[1.08] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
            One account, every bouquet you send
          </h1>
          <p className="mt-5 text-base leading-relaxed text-ink-soft">
            Sign in to keep your shopping bag in sync across your phone and
            computer, follow flower deliveries, and check out with ease.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              "Cross-device cart: items added on your phone appear here instantly",
              "Track every bouquet delivery and payment status",
              "Your name and delivery details saved for faster orders",
              "Guest checkout always works, account or not",
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-leaf-100 text-leaf-700">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
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
          <div className="rounded-lg bg-surface p-7 shadow-lift ring-1 ring-line sm:p-9">
            {user ? (
              /* Signed-in View */
              <div className="text-center">
                <Logo href={null} size={24} className="justify-center" />
                <h2 className="mt-6 font-display text-2xl font-medium">
                  You’re signed in
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Active account session
                </p>
                <div className="mt-4 rounded-md bg-sand-50 p-4 ring-1 ring-sand-200">
                  <p className="text-sm font-semibold text-leaf-900 break-all">
                    {user.user_metadata?.full_name || "Valued Member"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft break-all">
                    {user.email}
                  </p>
                </div>

                <div className="mt-7 space-y-3">
                  <button
                    type="button"
                    onClick={() => router.push("/orders")}
                    className="bm-btn bm-btn-primary w-full"
                  >
                    View my orders
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/shop")}
                    className="bm-btn bm-btn-outline w-full"
                  >
                    Continue shopping
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={isPending}
                    className="bm-btn w-full bg-sand-100 text-ink-soft hover:bg-sand-200"
                  >
                    {isPending ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            ) : (
              /* Authentication Forms View */
              <div>
                <div className="text-center">
                  <Logo href={null} size={24} className="justify-center" />
                  <h2 className="mt-5 font-display text-2xl font-medium">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    {mode === "login"
                      ? "Sign in to follow orders and access your saved cart."
                      : "Join Bloom Market for seamless flower deliveries."}
                  </p>
                </div>

                {/* Segmented Mode Toggle */}
                <div className="mt-6 grid grid-cols-2 rounded-full bg-sand-100 p-1 ring-1 ring-sand-200">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className={`rounded-full py-1.5 text-xs font-semibold transition-all ${
                      mode === "login"
                        ? "bg-surface text-leaf-900 shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                    className={`rounded-full py-1.5 text-xs font-semibold transition-all ${
                      mode === "signup"
                        ? "bg-surface text-leaf-900 shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-md border border-bloom-200 bg-bloom-50 px-4 py-3 text-sm leading-relaxed text-bloom-800"
                  >
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div
                    role="status"
                    className="mt-5 rounded-md border border-leaf-200 bg-leaf-50 px-4 py-3 text-sm leading-relaxed text-leaf-800"
                  >
                    {successMessage}
                  </div>
                )}

                {mode === "login" ? (
                  /* Form: Log in */
                  <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="login-email" className="bm-label">
                        Email address
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bm-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="login-password" className="bm-label">
                        Password
                      </label>
                      <input
                        id="login-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bm-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="bm-btn bm-btn-primary mt-2 w-full"
                    >
                      {submitting ? (
                        <>
                          <Spinner />
                          Signing in…
                        </>
                      ) : (
                        "Log in"
                      )}
                    </button>
                  </form>
                ) : (
                  /* Form: Create account */
                  <form onSubmit={handleSignupSubmit} className="mt-6 space-y-3.5">
                    <div>
                      <label htmlFor="signup-name" className="bm-label">
                        Full name
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="e.g. Amara Okafor"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bm-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="bm-label">
                        Email address
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bm-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="bm-label">
                        Password
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        required
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bm-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="signup-confirm" className="bm-label">
                        Confirm password
                      </label>
                      <input
                        id="signup-confirm"
                        type="password"
                        required
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bm-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="bm-btn bm-btn-primary mt-2 w-full"
                    >
                      {submitting ? (
                        <>
                          <Spinner />
                          Creating account…
                        </>
                      ) : (
                        "Create account"
                      )}
                    </button>
                  </form>
                )}

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div
                    aria-hidden
                    className="absolute inset-0 flex items-center"
                  >
                    <div className="w-full border-t border-line" />
                  </div>
                  <span className="relative bg-surface px-3 text-xs uppercase tracking-wider text-sand-400">
                    or
                  </span>
                </div>

                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={signingInGoogle || submitting}
                  className="bm-btn w-full bg-surface text-ink shadow-soft ring-1 ring-sand-300 hover:bg-sand-50"
                >
                  <GoogleIcon />
                  {signingInGoogle
                    ? "Redirecting to Google…"
                    : "Continue with Google"}
                </button>

                {/* Switcher Footer */}
                <div className="mt-6 border-t border-line pt-4 text-center">
                  {mode === "login" ? (
                    <p className="text-xs text-ink-soft">
                      Don’t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setError(null);
                        }}
                        className="font-semibold text-leaf-800 underline underline-offset-2 hover:text-leaf-950"
                      >
                        Create account
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-ink-soft">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                        }}
                        className="font-semibold text-leaf-800 underline underline-offset-2 hover:text-leaf-950"
                      >
                        Log in
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="mt-5 flex items-center justify-center gap-2 pt-3 text-xs text-ink-soft">
              <LockIcon />
              Your data and credentials are kept secure.
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
