import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { CartSync } from "@/components/CartSync";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * Fraunces carries the editorial voice — headings, prices and the wordmark.
 * Inter handles all interface copy so it stays quiet and legible.
 * Both are variable fonts, so weights come from the weight axis.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bloom Market — Fresh flowers, delivered",
    template: "%s | Bloom Market",
  },
  description:
    "Bloom Market is an online flower shop. Browse bouquets and plants, check out securely, and get an email confirmation for every order.",
  applicationName: "Bloom Market",
  // Serves /manifest.webmanifest, which makes the app installable on Android
  // Chrome, iOS Safari and desktop.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    // Hides the Safari address bar so the installed app opens without browser
    // chrome, matching the Android standalone experience.
    title: "Bloom Market",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [
      // iOS ignores the SVG icon and requires a raster `apple-touch-icon`.
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "Bloom Market — Fresh flowers, delivered",
    description:
      "Hand-tied bouquets and healthy houseplants, delivered across Lagos.",
    type: "website",
    siteName: "Bloom Market",
  },
  other: {
    /*
     * iOS reads `apple-mobile-web-app-capable` and ignores
     * `mobile-web-app-capable`, which is what `appleWebApp.capable` emits for
     * Chrome/Android. Both are needed: without the Apple one, iOS still opens
     * the installed app in a Safari-style tab bar.
     */
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Tints the Android status bar and the installed app's title bar to the brand
  // green. Matches `theme_color` in the manifest.
  themeColor: "#1f3b26",
  // Deliberately no `viewport-fit=cover`: the layout has no
  // `env(safe-area-inset-*)` padding, so opting into a notched display would
  // slide content underneath the status bar and home indicator.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline script below adds `bm-motion` to <html> before React
      // hydrates, so the client class list is intentionally one class longer
      // than the server-rendered one. Opting out of that single comparison is
      // what keeps the console clean.
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        {/*
          Runs while the browser parses the opening body, so it lands before
          the first paint. Only visitors who have not asked for reduced motion
          get `bm-motion`, which is what unlocks the hidden start state of the
          scroll reveals. Without it — and without JavaScript — every reveal
          renders already visible.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('bm-motion')}}catch(e){}",
          }}
        />
        <RevealOnScroll />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-leaf-800 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <CartSync />
        <ServiceWorkerRegistrar />
        {/*
          `pb-20` reserves the height of the mobile tab bar so the footer's last
          row is never trapped underneath it. `lg:pb-0` hands that space back on
          desktop, where the bar does not render at all — so the desktop layout
          is byte-for-byte the same as before.
        */}
        <main id="main" className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}

