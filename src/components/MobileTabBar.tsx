"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * The mobile-only tab bar.
 *
 * Desktop keeps the existing header navigation untouched — this bar renders
 * `lg:hidden` and nothing else in the layout changes for large screens.
 *
 * It reads the cart count from the same `/api/cart` endpoint and the same
 * `cart:updated` event the header badge already uses, so the two can never
 * disagree.
 */
const TABS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/cart", label: "Cart" },
  { href: "/profile", label: "Profile" },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { count: number };
      setCount(json.count);
    } catch {
      // The badge is non-critical; ignore network errors exactly as the
      // header badge does.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshCart(), 0);
    const onCartUpdated = () => void refreshCart();
    window.addEventListener("cart:updated", onCartUpdated);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("cart:updated", onCartUpdated);
    };
  }, [refreshCart, pathname]);

  const badge = count > 99 ? "99+" : count;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-line bg-sand-50/95 backdrop-blur-md lg:hidden"
      style={{
        // Reserved for the home indicator on notched phones. `layout.tsx`
        // deliberately does not opt into `viewport-fit=cover`, so this
        // resolves to 0 everywhere it isn't needed.
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = ICONS[tab.label];
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-2 pt-2.5 pb-2 text-[0.6875rem] font-medium transition-colors ${
                  active ? "text-leaf-900" : "text-ink-soft hover:text-leaf-800"
                }`}
              >
                <span className="relative">
                  <Icon active={active} />
                  {tab.label === "Cart" && count > 0 && (
                    <span className="absolute -top-1 -right-2 grid min-w-[1rem] place-items-center rounded-full bg-bloom-500 px-1 text-[0.5625rem] font-semibold text-white tabular-nums">
                      {badge}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/*
 * Icons follow the house style already used by `Header`: a 22px grid, `fill`
 * off, `currentColor` strokes and `aria-hidden`, since every one of them sits
 * next to a visible text label.
 */
type IconProps = { active: boolean };

function HomeIcon({ active }: IconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      strokeWidth={active ? 1.9 : 1.5}
      className={active ? "fill-leaf-100/60" : undefined}
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShopIcon({ active }: IconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      strokeWidth={active ? 1.9 : 1.5}
    >
      <path
        d="M5 8.5h14M7 8.5v11h10v-11M10 12v4M14 12v4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon({ active }: IconProps) {
  // The same shopping-bag shape as the header's `BagIcon`, so the two read
  // as one icon across the app.
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      strokeWidth={active ? 1.8 : 1.5}
    >
      <path
        d="M6.5 8h11l-.9 11.1a1.5 1.5 0 0 1-1.5 1.4H8.9a1.5 1.5 0 0 1-1.5-1.4L6.5 8Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10V6.8a2.5 2.5 0 0 1 5 0V10"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      strokeWidth={active ? 1.9 : 1.5}
    >
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" />
      <path
        d="M5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS = {
  Home: HomeIcon,
  Shop: ShopIcon,
  Cart: CartIcon,
  Profile: ProfileIcon,
} as const;