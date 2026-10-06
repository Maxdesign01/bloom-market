import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearCartCookie } from "@/lib/cart";

/**
 * POST /api/auth/signout
 *
 * Terminates the Supabase session and clears the cart cookie to guarantee
 * strict account isolation and prevent any cart data leakage into subsequent
 * sessions or guest visits.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    await clearCartCookie();

    const response = NextResponse.json({ success: true });
    // Also explicitly expire the cookie on the response
    response.cookies.set("bm_cart_id", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("[auth] POST /api/auth/signout failed:", err);
    return NextResponse.json(
      { error: "Failed to sign out cleanly" },
      { status: 500 },
    );
  }
}

