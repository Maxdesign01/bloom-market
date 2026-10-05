import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile" };

/**
 * The account screen behind the mobile tab bar.
 *
 * Unlike `/orders` this does not redirect when signed out: it is a top-level
 * destination in the tab bar, so a guest gets a useful sign-in prompt instead
 * of being bounced. Google sign-in itself is unchanged — the button simply
 * links to the existing `/login` route.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader
        eyebrow={user ? "Signed in" : "Welcome"}
        title="Your account"
        copy={user ? `Signed in as ${user.email}` : "Sign in to see your orders."}
        crumbs={[{ href: "/", label: "Home" }]}
      />

      <div className="bm-shell py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href={user ? "/orders" : "/login?next=/orders"}
            className="group flex items-center justify-between gap-4 rounded-lg bg-surface px-6 py-6 shadow-soft ring-1 ring-line transition-colors hover:bg-sand-50"
          >
            <span>
              <span className="block font-display text-lg font-medium">
                My orders
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                Track past and upcoming deliveries
              </span>
            </span>
            <span
              aria-hidden
              className="text-sand-400 transition-colors group-hover:text-leaf-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h13m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          <Link
            href="/cart"
            className="group flex items-center justify-between gap-4 rounded-lg bg-surface px-6 py-6 shadow-soft ring-1 ring-line transition-colors hover:bg-sand-50"
          >
            <span>
              <span className="block font-display text-lg font-medium">
                Your cart
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                Saved to your account when you&apos;re signed in
              </span>
            </span>
            <span
              aria-hidden
              className="text-sand-400 transition-colors group-hover:text-leaf-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h13m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>

        <div className="mt-10 border-t border-line pt-10">
          {user ? (
            <div className="flex flex-wrap items-center gap-4">
              <SignOutButton />
              <p className="text-sm text-ink-soft">
                Your cart and orders follow you to every device.
              </p>
            </div>
          ) : (
            <Link
              href="/login?next=/profile"
              className="bm-btn bm-btn-primary"
            >
              Sign in with Google
            </Link>
          )}
        </div>
      </div>
    </>
  );
}