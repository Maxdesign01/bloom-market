import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bloom Market — Fresh flowers, delivered",
    template: "%s | Bloom Market",
  },
  description:
    "Bloom Market is an online flower shop. Browse bouquets and plants, check out securely, and get an email confirmation for every order.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-zinc-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-sm text-zinc-500 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Bloom Market</p>
            <p>Payments secured by Paystack · Emails by Mailgun</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

