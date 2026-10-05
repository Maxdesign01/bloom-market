import { CartItem, Product } from "@/types";
import { safeStorage, supabase } from "@/lib/supabase";
import {
  clearRemoteUserCart,
  fetchRemoteUserCart,
  mergeGuestItemsToRemote,
  syncRemoteCartItem,
} from "@/lib/cartApi";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalKobo: number;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "@bloom_market_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Keep a ref to items for async merges
  const itemsRef = useRef<CartItem[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // 1. Initial load from local storage & current auth session
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await safeStorage.getItem(STORAGE_KEY);
        let initialLocalItems: CartItem[] = [];
        if (stored) {
          try {
            initialLocalItems = JSON.parse(stored);
            if (isMounted) setItems(initialLocalItems);
          } catch {
            // Safe JSON parse fallback
          }
        }

        // Check if there is an existing authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (user) {
          setUserId(user.id);
          // Set auth token on Realtime client
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            await supabase.realtime.setAuth(session.access_token);
          }

          // Merge any local guest items into remote cart
          const merged = await mergeGuestItemsToRemote(
            user.id,
            initialLocalItems
          );
          if (isMounted) {
            setItems(merged);
          }
        }
      } catch (err) {
        console.warn("[CartContext] Init error:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    })();

    // 2. Auth state listener (Login / Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      if (nextUserId) {
        // User just logged in: merge guest items into remote cart
        const currentItems = itemsRef.current;
        const remote = await mergeGuestItemsToRemote(nextUserId, currentItems);
        if (isMounted) setItems(remote);
      } else if (event === "SIGNED_OUT") {
        // User logged out: clear cart
        if (isMounted) setItems([]);
        await safeStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 3. Save cart to safeStorage whenever items change
  useEffect(() => {
    if (!isLoaded) return;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
      // Safe fallback
    });
  }, [items, isLoaded]);

  // 4. Realtime subscription to cart_items for signed-in user
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Refresh cart from server initially for this user
    fetchRemoteUserCart(userId).then((remoteItems: CartItem[]) => {
      if (isMounted) {
        setItems(remoteItems);
      }
    });

    const instanceId = Math.random().toString(36).slice(2, 8);
    const channelName = `mobile-cart-sync-${userId}-${instanceId}`;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }

        if (!isMounted) return;

        channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "cart_items",
            },
            (payload) => {
              console.log(
                "[CartContext] Realtime cart change detected:",
                payload.eventType
              );
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(async () => {
                const updated = await fetchRemoteUserCart(userId);
                if (isMounted) {
                  setItems(updated);
                }
              }, 200);
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log(
                `[CartContext] Realtime cart sync active on ${channelName}`
              );
            }
          });
      } catch (err) {
        console.warn("[CartContext] Subscription error:", err);
      }
    })();

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const refreshCart = useCallback(async () => {
    if (userId) {
      const remote = await fetchRemoteUserCart(userId);
      setItems(remote);
    }
  }, [userId]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      setItems((current) => {
        const existingIndex = current.findIndex(
          (item) => item.product.id === product.id
        );
        let finalQty = quantity;
        let next: CartItem[];

        if (existingIndex > -1) {
          next = [...current];
          const nextQty = next[existingIndex].quantity + quantity;
          finalQty =
            product.stock > 0 ? Math.min(nextQty, product.stock) : nextQty;
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: finalQty,
          };
        } else {
          finalQty =
            product.stock > 0 ? Math.min(quantity, product.stock) : quantity;
          next = [
            ...current,
            {
              product,
              quantity: finalQty,
            },
          ];
        }

        // Sync to remote if signed in
        if (userId) {
          syncRemoteCartItem(userId, product.id, finalQty);
        }

        return next;
      });
    },
    [userId]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setItems((current) =>
        current.filter((item) => item.product.id !== productId)
      );
      if (userId) {
        syncRemoteCartItem(userId, productId, 0);
      }
    },
    [userId]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      setItems((current) =>
        current.map((item) => {
          if (item.product.id === productId) {
            const validQty =
              item.product.stock > 0
                ? Math.min(quantity, item.product.stock)
                : quantity;
            if (userId) {
              syncRemoteCartItem(userId, productId, validQty);
            }
            return { ...item, quantity: validQty };
          }
          return item;
        })
      );
    },
    [userId, removeFromCart]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (userId) {
      clearRemoteUserCart(userId);
    }
  }, [userId]);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalKobo = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        totalItems,
        totalKobo,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
