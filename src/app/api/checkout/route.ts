import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cartSubtotal, getCart, resolveCartId } from "@/lib/cart";
import { initializeTransaction } from "@/lib/paystack";
import type { CheckoutPayload, CheckoutResponse } from "@/lib/types";

/**
 * POST /api/checkout
 *
 * 1. Re-reads the cart server-side (never trusts client prices)
 * 2. Creates a `pending` order + order_items in Supabase
 * 3. Initializes a Paystack transaction and returns the authorization URL
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as CheckoutPayload | null;
    if (!body) {
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const address = body.address?.trim();

    if (!fullName || !email || !phone || !address) {
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "All shipping fields are required" },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    // --- Server-side cart ---
    const cartId = await resolveCartId();
    const cart = await getCart(cartId);
    const items = cart?.cart_items ?? [];

    if (items.length === 0) {
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Your cart is empty" },
        { status: 400 },
      );
    }

    // Validate stock before creating anything.
    for (const item of items) {
      const product = item.products;
      if (!product) {
        return NextResponse.json<CheckoutResponse>(
          { ok: false, error: "An item in your cart is no longer available" },
          { status: 409 },
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json<CheckoutResponse>(
          {
            ok: false,
            error: `Only ${product.stock} left of ${product.name}`,
          },
          { status: 409 },
        );
      }
    }

    const total = cartSubtotal(items);
    if (total <= 0) {
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Cart total must be greater than zero" },
        { status: 400 },
      );
    }

    // --- Attach the signed-in user if there is one ---
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not signed in — guest checkout is fine.
    }

    // --- Create the pending order ---
    const admin = createAdminClient();
    const reference = `bm_${randomUUID().replaceAll("-", "")}`;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: userId,
        email,
        full_name: fullName,
        phone,
        address,
        total,
        currency: "NGN",
        status: "pending",
        paystack_reference: reference,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[checkout] order insert failed:", orderError);
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Could not create your order" },
        { status: 500 },
      );
    }

    const { error: itemsError } = await admin.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        name: item.products!.name,
        price: item.products!.price,
        quantity: item.quantity,
      })),
    );

    if (itemsError) {
      console.error("[checkout] order_items insert failed:", itemsError);
      // Roll back the order so we don't leave an orphan.
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Could not save your order items" },
        { status: 500 },
      );
    }

    // --- Initialize Paystack ---
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      new URL(req.url).origin;

    const init = await initializeTransaction({
      email,
      amount: total,
      currency: "NGN",
      reference,
      callbackUrl: `${siteUrl}/checkout/success?reference=${reference}`,
      metadata: {
        order_id: order.id,
        cart_id: cartId,
        full_name: fullName,
        phone,
        address,
      },
    });

    return NextResponse.json<CheckoutResponse>({
      ok: true,
      authorizationUrl: init.data.authorization_url,
      reference: init.data.reference,
      orderId: order.id,
    });
  } catch (err) {
    console.error("[checkout] unexpected error:", err);
    return NextResponse.json<CheckoutResponse>(
      { ok: false, error: "Something went wrong starting checkout" },
      { status: 500 },
    );
  }
}
