import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleAuthEmailEvent } from "@/lib/auth-email";
import { resolveCartId } from "@/lib/cart";

/**
 * POST /api/auth/notify
 *
 * Secure server endpoint for handling auth notifications (e.g. from client actions
 * or mobile app sessions).
 * Verifies the authenticated user from the session cookie or Authorization header.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let user = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const admin = createAdminClient();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const event = body?.event === "signup" ? "signup" : "login";
    const fullName = body?.fullName ?? user.user_metadata?.full_name;
    const userAgent = req.headers.get("user-agent");

    await handleAuthEmailEvent({
      userId: user.id,
      email: user.email!,
      fullName,
      userAgent,
      isExplicitSignup: event === "signup",
    });

    try {
      await resolveCartId();
    } catch (cartErr) {
      console.error("[auth] Cart resolution during notify error:", cartErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[auth] POST /api/auth/notify failed:", err);
    return NextResponse.json(
      { error: "Notification processing failed" },
      { status: 500 },
    );
  }
}

