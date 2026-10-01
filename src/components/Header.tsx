"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type CartBadgeState = { count: number };

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState<CartBadgeState>({ count: 0 });
  const [isPending, startTransition] = useTransition();

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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    startTransition(() => {
      router.refresh();
      router.push("/");
    });
  }

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white text-sm font-bold"
          >
            B
          </span>
          <span className="font-semibold tracking-tight">Bloom Market</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link
            href="/"
            className={`px-3 py-2 rounded-md transition-colors ${
              isActive("/")
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
            }`}
          >
            Shop
          </Link>

          <Link
            href="/cart"
            className={`relative px-3 py-2 rounded-md transition-colors ${
              isActive("/cart")
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
            }`}
          >
            Cart
            {cart.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 h-5 place-items-center rounded-full bg-emerald-600 px-1 text-[11px] font-semibold text-white">
                {cart.count > 99 ? "99+" : cart.count}
              </span>
            )}
          </Link>

          {authReady && user ? (
            <>
              <Link
                href="/orders"
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive("/orders")
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                Orders
              </Link>
              <button
                onClick={signOut}
                disabled={isPending}
                className="px-3 py-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {isPending ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex items-center rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
