import { NextResponse, type NextRequest } from "next/server";
import {
  addToCart,
  cartCount,
  clearCart,
  getCart,
  getCartCookie,
  getOrCreateCartId,
  setCartQuantity,
} from "@/lib/cart";

/** GET /api/cart — current cart + item count for the badge. */
export async function GET() {
  try {
    const cartId = await getOrCreateCartId();
    const cart = await getCart(cartId);
    return NextResponse.json({
      cart,
      count: cartCount(cart),
    });
  } catch (err) {
    console.error("[cart] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to load cart" },
      { status: 500 },
    );
  }
}

/** POST /api/cart — add an item. Body: { productId, quantity? } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const productId = body?.productId as string | undefined;
    const quantity = Number(body?.quantity ?? 1);

    if (!productId || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "productId and a positive quantity are required" },
        { status: 400 },
      );
    }

    const cart = await addToCart(productId, Math.floor(quantity));
    return NextResponse.json({ cart, count: cartCount(cart) });
  } catch (err) {
    console.error("[cart] POST failed:", err);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/cart — set a line quantity.
 * Body: { productId, quantity } (quantity 0 removes the line)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const productId = body?.productId as string | undefined;
    const quantity = Number(body?.quantity);

    if (!productId || !Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "productId and a non-negative quantity are required" },
        { status: 400 },
      );
    }

    const cart = await setCartQuantity(productId, Math.floor(quantity));
    return NextResponse.json({ cart, count: cartCount(cart) });
  } catch (err) {
    console.error("[cart] PATCH failed:", err);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 },
    );
  }
}

/** DELETE /api/cart — empty the cart. */
export async function DELETE() {
  try {
    const cartId = await getCartCookie();
    await clearCart(cartId);
    const cart = await getCart(cartId);
    return NextResponse.json({ cart, count: cartCount(cart) });
  } catch (err) {
    console.error("[cart] DELETE failed:", err);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 },
    );
  }
}
