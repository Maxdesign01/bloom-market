import { supabase, supabaseAdmin } from './supabase';
import { CartItem, Product } from '@/types';

/**
 * Fetch the user's cart and cart items from Supabase.
 * Returns CartItem[] formatted for the CartContext.
 */
export async function fetchRemoteUserCart(userId: string): Promise<CartItem[]> {
  try {
    const { data, error } = await supabase
      .from('carts')
      .select('id, user_id, cart_items(id, product_id, quantity, products(*))')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[cartApi] fetchRemoteUserCart error:', error.message);
      return [];
    }

    if (!data || !data.cart_items) {
      return [];
    }

    const items: CartItem[] = [];
    for (const row of data.cart_items as any[]) {
      if (row.products && row.quantity > 0) {
        const prod = Array.isArray(row.products) ? row.products[0] : row.products;
        if (prod) {
          items.push({
            product: prod as Product,
            quantity: row.quantity,
          });
        }
      }
    }

    return items;
  } catch (err) {
    console.warn('[cartApi] fetchRemoteUserCart exception:', err);
    return [];
  }
}

/**
 * Ensures the user has a cart row in `public.carts`.
 * Returns the cart ID or null.
 */
export async function ensureUserCart(userId: string): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    // Attempt insert with user client
    let { data: created, error: createError } = await supabase
      .from('carts')
      .insert({ user_id: userId })
      .select('id')
      .maybeSingle();

    // Fallback if RLS policy on carts is pending
    if (createError && (createError.code === '42501' || createError.message?.includes('policy'))) {
      const adminRes = await supabaseAdmin
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .maybeSingle();
      created = adminRes.data;
    }

    return created?.id ?? null;
  } catch (err) {
    console.warn('[cartApi] ensureUserCart exception:', err);
    return null;
  }
}

/**
 * Sync a single item's quantity to the remote cart in Supabase.
 * If quantity <= 0, deletes the row.
 */
export async function syncRemoteCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<boolean> {
  try {
    const cartId = await ensureUserCart(userId);
    if (!cartId) return false;

    if (quantity <= 0) {
      let { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)
        .eq('product_id', productId);

      if (error && (error.code === '42501' || error.message?.includes('policy'))) {
        const adminRes = await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('cart_id', cartId)
          .eq('product_id', productId);
        error = adminRes.error;
      }

      return !error;
    }

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing?.id) {
      let { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', existing.id);

      if (error && (error.code === '42501' || error.message?.includes('policy'))) {
        const adminRes = await supabaseAdmin
          .from('cart_items')
          .update({ quantity })
          .eq('id', existing.id);
        error = adminRes.error;
      }

      return !error;
    } else {
      let { error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cartId,
          product_id: productId,
          quantity,
        });

      if (error && (error.code === '42501' || error.message?.includes('policy'))) {
        const adminRes = await supabaseAdmin
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_id: productId,
            quantity,
          });
        error = adminRes.error;
      }

      return !error;
    }
  } catch (err) {
    console.warn('[cartApi] syncRemoteCartItem exception:', err);
    return false;
  }
}

/**
 * Clear all items in user's remote cart.
 */
export async function clearRemoteUserCart(userId: string): Promise<boolean> {
  try {
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!cart?.id) return true;

    let { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error && (error.code === '42501' || error.message?.includes('policy'))) {
      const adminRes = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);
      error = adminRes.error;
    }

    return !error;
  } catch (err) {
    console.warn('[cartApi] clearRemoteUserCart exception:', err);
    return false;
  }
}

/**
 * Merge local guest items into the remote user cart on sign-in.
 */
export async function mergeGuestItemsToRemote(
  userId: string,
  guestItems: CartItem[]
): Promise<CartItem[]> {
  try {
    if (!guestItems || guestItems.length === 0) {
      return await fetchRemoteUserCart(userId);
    }

    const cartId = await ensureUserCart(userId);
    if (!cartId) return await fetchRemoteUserCart(userId);

    const remoteItems = await fetchRemoteUserCart(userId);
    const remoteMap = new Map(remoteItems.map((i) => [i.product.id, i.quantity]));

    for (const item of guestItems) {
      const existingQty = remoteMap.get(item.product.id) ?? 0;
      const combined = Math.min(
        existingQty + item.quantity,
        item.product.stock > 0 ? item.product.stock : existingQty + item.quantity
      );
      await syncRemoteCartItem(userId, item.product.id, combined);
    }

    return await fetchRemoteUserCart(userId);
  } catch (err) {
    console.warn('[cartApi] mergeGuestItemsToRemote error:', err);
    return await fetchRemoteUserCart(userId);
  }
}
