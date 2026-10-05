import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { OfflineRetry } from "./OfflineRetry";

export const metadata: Metadata = {
  title: "Offline — Bloom Market",
  description: "You are offline. Reconnect to keep shopping at Bloom Market.",
  // Kept out of search results; it only exists as the service worker's
  // fallback for a failed navigation.
  robots: { index: false, follow: false },
};

/**
 * Shown by the service worker when a navigation cannot reach the network.
 *
 * It deliberately offers no cart or checkout affordances: the basket lives on
 * the server and payment needs the network, so the honest message is to
 * reconnect rather than to imply an order can be placed.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24 text-center">
      <PageHeader
        eyebrow="No connection"
        title="You&rsquo;re offline"
        copy="Bloom Market needs a connection to show the latest flowers and take payment. Reconnect and your cart will be right where you left it."
      />
      <div className="mt-8">
        <OfflineRetry />
      </div>
      <noscript>
        <p className="mt-6 text-sm text-ink-soft">
          JavaScript is required to retry automatically. Please refresh the page.
        </p>
      </noscript>
    </div>
  );
}