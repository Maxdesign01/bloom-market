"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps an open tab or installed app in step with the signed-in user's
 * cart while it is open.
 *
 * Carts are account-owned as of migration 0007, so a change made on a
 * phone is automatically reflected on a laptop and vice versa.
 *
 * Realtime architecture:
 * 1. Authenticate Realtime with user JWT so owner-scoped RLS policies apply.
 * 2. Subscribe to postgres_changes on cart_items.
 * 3. Treat payload purely as a signal: re-fetch the complete authoritative cart.
 * 4. Dispatch `cart:updated` event to update all client UI and call router.refresh().
 * 5. Handle reconnections and clean teardown on sign out or unmount.
 */
export function CartSync() {
  const router = useRouter();
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const notify = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!isMounted) return;
        window.dispatchEvent(new CustomEvent("cart:updated"));
        router.refresh();
      }, 250);
    };

    const stop = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const start = async (token: string | null, userId: string | null) => {
      stop();
      if (!isMounted || !userId || !token) {
        currentUserIdRef.current = null;
        return;
      }

      currentUserIdRef.current = userId;

      try {
        await supabase.realtime.setAuth(token);
      } catch (err) {
        console.warn("[CartSync] setAuth error:", err);
      }

      if (!isMounted) return;

      const instanceId = Math.random().toString(36).slice(2, 8);
      const topic = `bm-cart-${userId}-${instanceId}`;

      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cart_items" },
          () => {
            notify();
          },
        )
        .subscribe((status, err) => {
          if (!isMounted) return;
          if (status === "SUBSCRIBED") {
            // Subscription active
          } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            console.warn(`[CartSync] Channel ${status}, scheduling reconnect:`, err);
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              if (isMounted && currentUserIdRef.current) {
                void supabase.auth.getSession().then(({ data }) => {
                  if (data.session) {
                    void start(data.session.access_token, data.session.user.id);
                  }
                });
              }
            }, 3000);
          }
        });
    };

    // Initial session check
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void start(data.session.access_token, data.session.user.id);
      }
    });

    // Listen to auth changes (sign-in, sign-out, token refresh)
    const { data: authSub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUserId = session?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;

        // If user changed or signed out
        if (nextUserId !== previousUserId) {
          window.dispatchEvent(new CustomEvent("cart:updated"));
          router.refresh();
        }

        if (session?.user && session.access_token) {
          void start(session.access_token, session.user.id);
        } else {
          stop();
          currentUserIdRef.current = null;
        }
      },
    );

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      authSub.subscription.unsubscribe();
      stop();
    };
  }, [router]);

  return null;
}