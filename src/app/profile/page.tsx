import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your account" };

/**
 * The account profile screen.
 *
 * Reflects the authenticated account:
 * - Full name
 * - Email address
 * - Account state (Active member)
 * - Joined date
 * - Links to order history and cross-device cart
 * - Clean sign-out
 *
 * For guests, renders an informative sign-in/registration hub
 * without forcing a bounce, keeping tab bar navigation pleasant.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    null;

  const joinDate = user?.created_at
    ? new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      }).format(new Date(user.created_at))
    : null;

  return (
    <>
      <PageHeader
        eyebrow={user ? "Account overview" : "Welcome"}
        title={user ? (fullName ? `Hello, ${fullName}` : "Your account") : "Sign in to Bloom Market"}
        copy={
          user
            ? `Signed in as ${user.email}. Your cart and orders are synced across all your devices.`
            : "Sign in with your email or Google account to track orders and sync your shopping bag."
        }
        crumbs={[{ href: "/", label: "Home" }]}
      />

      <div className="bm-shell py-12 sm:py-16">
        {user ? (
          /* Authenticated User View */
          <div className="space-y-8">
            {/* Account Info Card */}
            <div className="rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-2xl font-semibold">
                      {fullName || "Bloom Market Member"}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-800 ring-1 ring-leaf-200">
                      <span className="size-1.5 rounded-full bg-leaf-600" />
                      Active account
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
                  {joinDate && (
                    <p className="mt-1 text-xs text-sand-500">
                      Member since {joinDate}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <SignOutButton />
                </div>
              </div>
            </div>

            {/* Account Navigation Tiles */}
            <div className="grid gap-6 sm:grid-cols-2">
              <Link
                href="/orders"
                className="group flex items-center justify-between gap-4 rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line transition-all hover:bg-sand-50 hover:shadow-card"
              >
                <span>
                  <span className="block font-display text-lg font-medium">
                    My orders
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    Track bouquet deliveries and payment status
                  </span>
                </span>
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-sand-100 text-ink-soft transition-colors group-hover:bg-leaf-100 group-hover:text-leaf-800"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                className="group flex items-center justify-between gap-4 rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line transition-all hover:bg-sand-50 hover:shadow-card"
              >
                <span>
                  <span className="block font-display text-lg font-medium">
                    Your cart
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    Realtime cross-device synchronized shopping bag
                  </span>
                </span>
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-sand-100 text-ink-soft transition-colors group-hover:bg-leaf-100 group-hover:text-leaf-800"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
          </div>
        ) : (
          /* Guest View */
          <div className="mx-auto max-w-lg rounded-lg bg-surface p-8 text-center shadow-soft ring-1 ring-line sm:p-10">
            <h2 className="font-display text-2xl font-semibold">
              Sign in to Bloom Market
            </h2>
            <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-ink-soft">
              Access your saved cart across devices, track delivery status, and
              check out in seconds.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/login?next=/profile"
                className="bm-btn bm-btn-primary"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=signup&next=/profile"
                className="bm-btn bm-btn-outline"
              >
                Create an account
              </Link>
            </div>

            <p className="mt-8 text-xs text-ink-soft">
              You can also check out as a guest without creating an account.
            </p>
          </div>
        )}
      </div>
    </>
  );
}