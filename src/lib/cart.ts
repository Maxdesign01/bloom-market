import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cart, CartItem, Product } from "@/lib/types";

const CART_COOKIE = "bm_cart_id";

/** Read the guest cart id cookie (does not create anything). */
export async function getCartCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Create a fresh cart row and return its id. */
export async function createCartId(): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("carts")
    .insert({})
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create cart: ${error?.message}`);
  }
  const store = await cookies();
  store.set(CART_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return data.id;
}

/**
 * Get the current cart id from the cookie, creating one if needed.
 * Returns null when called during a render where cookies cannot be set
 * (callers should fall back to an in-memory/empty cart).
 */
export async function getOrCreateCartId(): Promise<string | null> {
  const existing = await getCartCookie();
  if (existing) return existing;
  try {
    return await createCartId();
  } catch {
    return null;
  }
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
  const cartId = await getCartCookie();
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
