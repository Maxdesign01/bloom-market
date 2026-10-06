import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleAuthEmailEvent } from "@/lib/auth-email";
import { resolveCartId } from "@/lib/cart";

function humanAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Invalid email or password. Please verify your details.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  return "Could not log in. Please check your credentials and try again.";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both your email address and password." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: humanAuthError(error?.message ?? "") },
        { status: 401 },
      );
    }

    const user = data.user;
    const userAgent = req.headers.get("user-agent");

    // 1. Transactional login notification email (guarded against duplicate sends)
    await handleAuthEmailEvent({
      userId: user.id,
      email: user.email!,
      fullName: user.user_metadata?.full_name,
      userAgent,
      isExplicitSignup: false,
    });

    // 2. Resolve & merge guest cart into the account cart
    try {
      await resolveCartId();
    } catch (cartErr) {
      console.error("[auth] Cart resolution during login error:", cartErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
      },
    });
  } catch (err: any) {
    console.error("[auth] POST /api/auth/login failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

