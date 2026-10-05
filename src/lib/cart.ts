import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Cart, CartItem, Product } from "@/lib/types";

const CART_COOKIE = "bm_cart_id";

/** Read the guest cart id cookie (does not create anything). */
export async function getCartCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/**
 * Best-effort cookie write. Server Components cannot set cookies — the
 * error is thrown by `cookies()` itself in that context — so callers get
 * the cart they asked for either way and a Route Handler fixes it later.
 */
async function setCartCookie(cartId: string): Promise<void> {
  try {
    const store = await cookies();
    store.set(CART_COOKIE, cartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } catch {
    // Server Components cannot set cookies; the next Route Handler will.
  }
}

/**
 * The signed-in user id, or null for guests. Cached per request so a
 * page that reads the cart several times only makes one Auth round trip.
 *
 * Guarded by a cheap cookie-presence check: with no Supabase auth cookie
 * there is definitively no session, which keeps guest loads as fast as
 * they were before this change.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  try {
    const store = await cookies();
    // Supabase splits an oversized session across `...-auth-token.0`, `.1`
    // cookies, so match the stem rather than the full name. Missing this
    // would silently treat a signed-in user as a guest.
    const hasAuthCookie = store
      .getAll()
      .some(
        (c) =>
          c.name.startsWith("sb-") &&
          /^sb-.+-auth-token(\.\d+)?$/.test(c.name),
      );
    if (!hasAuthCookie) return null;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    // Treat any failure as "guest" — the cart stays cookie-scoped.
    return null;
  }
});

/** The cart row owned by this user, if one exists. */
async function findUserCart(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

/** Create a cart row, optionally already attached to a user. */
async function createCart(userId: string | null): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/**
 * Fold an unclaimed guest cart into the signed-in user's cart, then drop
 * the guest row. Quantities are summed and clamped to live stock, so a
 * merge can never push a basket past what is actually available.
 *
 * Refuses to merge a cart that is missing, already claimed, or owned by
 * a different user — a stale or forged cookie must never move one
 * account's items into another's basket.
 */
async function mergeGuestCart(
  guestCartId: string,
  targetCartId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: guestCart } = await admin
    .from("carts")
    .select("id, user_id")
    .eq("id", guestCartId)
    .maybeSingle();

  if (!guestCart || guestCart.user_id !== null) return;

  // `products(stock)` comes back typed as an array because the generated
  // types don't resolve cart_items -> products as many-to-one here. Read it
  // defensively so a shape change can't silently clamp everything to zero.
  type GuestItem = {
    product_id: string;
    quantity: number;
    products: { stock: number } | { stock: number }[] | null;
  };

  const { data: rawGuestItems } = await admin
    .from("cart_items")
    .select("product_id, quantity, products(stock)")
    .eq("cart_id", guestCartId);

  const guestItems = (rawGuestItems ?? []) as unknown as GuestItem[];

  if (guestItems.length) {
    const { data: targetItems } = await admin
      .from("cart_items")
      .select("product_id, quantity")
      .eq("cart_id", targetCartId);

    const existing = new Map(
      (targetItems ?? []).map((i) => [i.product_id, i.quantity]),
    );

    for (const item of guestItems) {
      const related = item.products;
      const stock = Array.isArray(related)
        ? (related[0]?.stock ?? 0)
        : (related?.stock ?? 0);
      const combined = Math.min(
        (existing.get(item.product_id) ?? 0) + item.quantity,
        stock,
      );
      if (combined <= 0) continue;

      if (existing.has(item.product_id)) {
        await admin
          .from("cart_items")
          .update({ quantity: combined })
          .eq("cart_id", targetCartId)
          .eq("product_id", item.product_id);
      } else {
        await admin.from("cart_items").insert({
          cart_id: targetCartId,
          product_id: item.product_id,
          quantity: combined,
        });
      }
    }
  }

  // Drop the emptied guest cart so its cookie cannot resurrect it.
  await admin.from("cart_items").delete().eq("cart_id", guestCartId);
  await admin.from("carts").delete().eq("id", guestCartId);
}

/**
 * Resolve the cart id for this request.
 *
 * Signed-in visitors always resolve to their single account cart, which
 * is what lets the basket follow them across devices and between the
 * website and the installed app. Guests keep the original cookie-scoped
 * behaviour.
 */
export async function resolveCartId(): Promise<string | null> {
  const userId = await getCurrentUserId();
  const cookieCartId = await getCartCookie();

  if (!userId) {
    if (cookieCartId) return cookieCartId;
    const created = await createCart(null);
    if (created) await setCartCookie(created);
    return created;
  }

  const userCartId = await findUserCart(userId);

  if (userCartId) {
    // Anything still in the cookie is pre-login guest stock — fold it in.
    if (cookieCartId && cookieCartId !== userCartId) {
      await mergeGuestCart(cookieCartId, userCartId);
      await setCartCookie(userCartId);
    }
    return userCartId;
  }

  // First sign-in on this account: adopt the guest cart if we can claim it.
  if (cookieCartId) {
    const admin = createAdminClient();
    const { data: claimed } = await admin
      .from("carts")
      .update({ user_id: userId })
      .eq("id", cookieCartId)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (claimed?.id) {
      await setCartCookie(claimed.id);
      return claimed.id;
    }
  }

  const created = await createCart(userId);
  if (created) await setCartCookie(created);
  return created;
}

/**
 * Get the current cart id, creating one if needed.
 * Returns null when no cart could be resolved (callers should fall back
 * to an empty cart).
 */
export async function getOrCreateCartId(): Promise<string | null> {
  return resolveCartId();
}

/** Fetch the full cart (items + product join) for a cart id. */
export async function getCart(cartId: string | null): Promise<Cart | null> {
  if (!cartId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("carts")
    .select("id, user_id, cart_items(*, products(*))")
    .eq("id", cartId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load cart: ${error.message}`);
  return (data as unknown as Cart) ?? null;
}

/** Total item count in a cart. */
export function cartCount(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.cart_items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Subtotal in kobo, using live product prices. */
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.products?.price ?? 0) * item.quantity,
    0,
  );
}

/** Add a product to the cart (increments quantity if already present). */
export async function addToCart(
  productId: string,
  quantity = 1,
): Promise<Cart | null> {
  const cartId = await getOrCreateCartId();
  if (!cartId) return null;

  const admin = createAdminClient();

  // Guard: product must exist and have enough stock.
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product) return getCart(cartId);

  const { data: existing } = await admin
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  const nextQty = Math.min(
    (existing?.quantity ?? 0) + quantity,
    product.stock,
  );
  if (nextQty <= 0) return getCart(cartId);

  if (existing) {
    await admin
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", existing.id);
  } else {
    await admin
      .from("cart_items")
      .insert({ cart_id: cartId, product_id: productId, quantity: nextQty });
  }

  return getCart(cartId);
}

/** Set an explicit quantity for a cart line (0 removes it). */
export async function setCartQuantity(
  productId: string,
  quantity: number,
): Promise<Cart | null> {
  // Resolve rather than trust the cookie, or a signed-in user editing on a
  // second device would write to the wrong basket.
  const cartId = await resolveCartId();
  if (!cartId) return null;

  const admin = createAdminClient();

  if (quantity <= 0) {
    await admin
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId)
      .eq("product_id", productId);
    return getCart(cartId);
  }

  const { data: product } = await admin
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();

  const clamped = Math.min(quantity, product?.stock ?? quantity);

  const { data: existing } = await admin
    .from("cart_items")
    .select("id")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("cart_items")
      .update({ quantity: clamped })
      .eq("id", existing.id);
  } else {
    await admin
      .from("cart_items")
      .insert({ cart_id: cartId, product_id: productId, quantity: clamped });
  }

  return getCart(cartId);
}

/** Empty the cart (used after a successful payment). */
export async function clearCart(cartId: string | null): Promise<void> {
  if (!cartId) return;
  const admin = createAdminClient();
  await admin.from("cart_items").delete().eq("cart_id", cartId);
}

export type { Product };
