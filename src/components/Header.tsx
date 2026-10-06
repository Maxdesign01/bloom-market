"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Logo } from "@/components/Logo";

type CartBadgeState = { count: number };

// `/` and `/shop` are distinct routes, so the home link reads "Home" here
// to keep the two labels unambiguous now that both appear in the nav.
const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/#occasions", label: "Occasions" },
  { href: "/#about", label: "Our story" },
  { href: "/orders", label: "Orders", requiresAuth: true },
  { href: "/profile", label: "Account" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState<CartBadgeState>({ count: 0 });
  const [isPending, startTransition] = useTransition();
  // Storing the route the sheet was opened on means it closes itself on
  // navigation (including browser back/forward) without a state-setting effect.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === pathname;

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { count: number };
      setCart({ count: json.count });
    } catch {
      // Cart badge is non-critical; ignore network errors.
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Defer the initial fetch out of the effect body so the cart badge
    // update doesn't trigger a synchronous cascading render.
    const initial = window.setTimeout(() => void refreshCart(), 0);
    const onCartUpdated = () => void refreshCart();
    window.addEventListener("cart:updated", onCartUpdated);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("cart:updated", onCartUpdated);
    };
  }, [refreshCart, pathname]);

  // Close the mobile sheet on navigation, and lock scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function signOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Best-effort server cookie clear
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpenedAt(null);
    window.dispatchEvent(new CustomEvent("cart:updated"));
    startTransition(() => {
      router.refresh();
      router.push("/");
    });
  }

  const closeMenu = () => setMenuOpenedAt(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const visibleNav = NAV.filter((item) => !item.requiresAuth || user);
  const badge = cart.count > 99 ? "99+" : cart.count;

  return (
    <>
      <div className="bg-leaf-900 text-leaf-100">
        <div className="bm-shell flex h-9 items-center justify-center gap-x-6 text-[0.6875rem] tracking-[0.06em] uppercase">
          <span className="hidden sm:inline">Same-day delivery in Lagos</span>
          <span className="text-leaf-400" aria-hidden>
            &bull;
          </span>
          <span className="text-center">
            Fresh stems, hand-tied every morning
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-sand-50/85 backdrop-blur-md">
        <div className="bm-shell flex h-[4.5rem] items-center justify-between gap-4">
          <Logo href="/" size={22} />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-leaf-100 text-leaf-900"
                    : "text-ink-soft hover:bg-sand-200 hover:text-leaf-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/cart"
              aria-label={`Cart${cart.count > 0 ? `, ${cart.count} items` : ""}`}
              className="relative grid size-10 place-items-center rounded-full text-leaf-900 transition-colors hover:bg-leaf-100"
            >
              <BagIcon />
              {cart.count > 0 && (
                // Below `lg` the fixed tab bar already carries the count, so the
                // badge is suppressed here to avoid showing it twice on one
                // screen. `aria-label` above still announces the item count.
                <span className="absolute -top-0.5 -right-0.5 hidden min-w-[1.25rem] place-items-center rounded-full bg-bloom-500 px-1 text-[0.625rem] font-semibold text-white tabular-nums lg:grid">
                  {badge}
                </span>
              )}
            </Link>

            {authReady && user ? (
              <button
                onClick={signOut}
                disabled={isPending}
                className="bm-btn bm-btn-outline bm-btn-sm hidden lg:inline-flex"
              >
                {isPending ? "Signing out…" : "Sign out"}
              </button>
            ) : (
              <Link
                href="/login"
                className="bm-btn bm-btn-primary bm-btn-sm hidden lg:inline-flex"
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpenedAt(menuOpen ? null : pathname)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center rounded-full text-leaf-900 transition-colors hover:bg-leaf-100 lg:hidden"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>


      {menuOpen && (
        // Ends above the mobile tab bar (`h-16`) so the sheet can never sit
        // on top of it — `design.md`: page content must not overlap the
        // bottom navigation. Both are mobile-only, so they share the `lg`
        // cutoff rather than being reconciled at each breakpoint.
        <div className="fixed inset-x-0 top-[6.75rem] bottom-16 z-30 lg:hidden">
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={closeMenu}
            className="absolute inset-0 bg-leaf-950/25 backdrop-blur-[2px]"
          />
          <div
            id="mobile-menu"
            className="relative mt-2 border-y border-line bg-sand-50 px-5 pt-6 pb-8 shadow-lift"
          >
            <nav className="bm-shell flex flex-col gap-1" aria-label="Mobile">
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={`rounded-lg px-3 py-3 font-display text-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-leaf-100 text-leaf-900"
                      : "text-ink hover:bg-sand-200"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-4 h-px bg-line" />

              {authReady && user ? (
                <>
                  <button
                    onClick={signOut}
                    disabled={isPending}
                    className="w-full rounded-full border border-sand-300 px-4 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-200 disabled:opacity-50"
                  >
                    {isPending ? "Signing out…" : "Sign out"}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="bm-btn bm-btn-primary mt-2 w-full"
                >
                  Sign in with Google
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 8h11l-.9 11.1a1.5 1.5 0 0 1-1.5 1.4H8.9a1.5 1.5 0 0 1-1.5-1.4L6.5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10V6.8a2.5 2.5 0 0 1 5 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

