import Link from "next/link";
import { Logo } from "@/components/Logo";

const SHOP_LINKS = [
  { href: "/", label: "All flowers" },
  { href: "/cart", label: "Your cart" },
  { href: "/checkout", label: "Checkout" },
];

const ACCOUNT_LINKS = [
  { href: "/orders", label: "Track an order" },
  { href: "/login", label: "Sign in" },
  { href: "/login", label: "My account" },
];

const BLOOM_LINKS = [
  { href: "/#about", label: "Our story" },
  { href: "/#delivery", label: "Delivery & care" },
  { href: "/#occasions", label: "Occasions" },
];

const PROMISES = [
  {
    title: "Same-day delivery",
    body: "Hand-tied and delivered across Lagos, cut this morning.",
  },
  {
    title: "Freshness, guaranteed",
    body: "Every stem is inspected twice before it leaves the bench.",
  },
  {
    title: "Secure checkout",
    body: "Card, bank transfer and USSD payments via Paystack.",
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sand-100">
      {/* Service promises */}
      <div className="bm-shell">
        <ul className="grid gap-x-10 gap-y-8 border-b border-line py-12 sm:grid-cols-3">
          {PROMISES.map((promise) => (
            <li key={promise.title} className="flex gap-4">
              <span
                aria-hidden
                className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-leaf-100 text-leaf-700"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M12 13V7m0 0 2.2 2.2M12 7l-2.2 2.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{promise.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {promise.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Link columns */}
      <div className="bm-shell grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo href="/" size={26} />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-soft">
            A small Lagos florist making generous, seasonal arrangements for the
            people and moments that matter.
          </p>
          <p className="mt-5 text-sm text-ink-soft">
            <a
              href="tel:+2348000000000"
              className="transition-colors hover:text-leaf-800"
            >
              +234 800 000 0000
            </a>
            <br />
            <a
              href="mailto:hello@bloommarket.ng"
              className="transition-colors hover:text-leaf-800"
            >
              hello@bloommarket.ng
            </a>
          </p>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2
            id="footer-shop"
            className="text-xs font-semibold tracking-[0.16em] text-ink uppercase"
          >
            Shop
          </h2>
          <ul className="mt-5 space-y-3">
            {SHOP_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-account">
          <h2
            id="footer-account"
            className="text-xs font-semibold tracking-[0.16em] text-ink uppercase"
          >
            Your account
          </h2>
          <ul className="mt-5 space-y-3">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-bloom">
          <h2
            id="footer-bloom"
            className="text-xs font-semibold tracking-[0.16em] text-ink uppercase"
          >
            Bloom Market
          </h2>
          <ul className="mt-5 space-y-3">
            {BLOOM_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line bg-leaf-900">
        <div className="bm-shell flex flex-col items-center justify-between gap-3 py-6 text-xs text-leaf-200 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Bloom Market. All rights reserved.
          </p>
          <p className="text-leaf-300">
            Payments secured by Paystack · Confirmations sent via Mailgun
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isHash = href.startsWith("/#");
  const className =
    "text-sm text-ink-soft transition-colors hover:text-leaf-800";

  if (isHash) {
    return (
      <Link href={href} className={className} scroll>
        {children}
      </Link>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
