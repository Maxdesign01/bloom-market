import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "Bloom Market — Fresh flowers, delivered",
    description:
      "Hand-tied bouquets and healthy houseplants, delivered across Lagos.",
    type: "website",
    siteName: "Bloom Market",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-leaf-800 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

