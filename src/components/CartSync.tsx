"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps an open tab or installed app in step with the signed-in user's
 * cart while it is open.
 *
 * Carts are account-owned as of migration 0007, so a change made on a
 * phone should be reflected on a laptop and vice versa. Rather than
 * trusting the payload — which would only carry the changed row, not the
 * whole basket — we simply re-read the cart, letting the existing
 * `cart:updated` event drive both the header badge and the cart page.
 *
 * Renders nothing. Depends on migration 0007 for the `cart_items` Realtime
 * publication and its owner-scoped SELECT policy.
 */
export function CartSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout> | undefined;

    // Unique per mount so each subscription gets a channel that is guaranteed
    // not to collide with one left mid-teardown by an earlier `start()`.
    const instanceId = Math.random().toString(36).slice(2);

    const notify = () => {
      if (debounce) clearTimeout(debounce);
      // A merge can move several lines at once; collapse that burst into a
      // single refetch instead of hammering the API once per row.
      debounce = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("cart:updated"));
        router.refresh();
      }, 300);
    };

    // Subscriptions are created only for signed-in users: a guest cart is
    // cookie-scoped, has no `user_id`, and the RLS policy would match
    // nothing anyway.
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const stop = () => {
      if (!channel) return;
      // `removeChannel` — not `channel.unsubscribe()` — is required here.
      // `channel(topic)` returns the *existing* channel for that topic, and
      // the Realtime client only stops handing back a stale one after
      // `removeChannel` has fully torn it down. With plain `unsubscribe()` the
      // async teardown had not finished by the time the next `start()` ran,
      // `channel()` handed back the still-subscribed instance, and `on()`
      // threw "cannot add `postgres_changes` callbacks ... after `subscribe()`".
      void supabase.removeChannel(channel);
      channel = null;
    };

    const start = (signedIn: boolean) => {
      stop();
      if (!signedIn) return;

      // A unique topic per subscription guarantees a fresh channel rather
      // than a possibly still-joining leftover, so the `.on()` below is always
      // legal. It is scoped to this tab and instance only — nothing else
      // subscribes to it.
      channel = supabase
        .channel(`bm-cart-sync-${instanceId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cart_items" },
          notify,
        )
        .subscribe();
    };

    void supabase.auth.getUser().then(({ data }) => start(!!data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      start(!!session),
    );

    return () => {
      if (debounce) clearTimeout(debounce);
      sub.subscription.unsubscribe();
      stop();
    };
  }, [router]);

  return null;
}