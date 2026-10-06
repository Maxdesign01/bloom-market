import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleAuthEmailEvent } from "@/lib/auth-email";
import { resolveCartId } from "@/lib/cart";

function humanSignupError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("already registered") || lower.includes("unique violation")) {
    return "An account with this email already exists. Please log in instead.";
  }
  if (lower.includes("password should be at least") || lower.includes("weak_password")) {
    return "Password must be at least 6 characters long.";
  }
  if (lower.includes("unable to validate email")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Could not create account. Please check your information and try again.";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const fullName = (body?.fullName ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();
    const confirmPassword = (body?.confirmPassword ?? "").toString();

    if (!fullName) {
      return NextResponse.json(
        { error: "Please enter your full name." },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match. Please re-enter." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: humanSignupError(error?.message ?? "") },
        { status: 400 },
      );
    }

    const user = data.user;
    const userAgent = req.headers.get("user-agent");

    // 1. Transactional Welcome email
    await handleAuthEmailEvent({
      userId: user.id,
      email: user.email!,
      fullName,
      userAgent,
      isExplicitSignup: true,
    });

    // 2. If a session is established immediately, merge guest cart
    if (data.session) {
      try {
        await resolveCartId();
      } catch (cartErr) {
        console.error("[auth] Cart resolution during signup error:", cartErr);
      }
    }

    return NextResponse.json({
      success: true,
      hasSession: Boolean(data.session),
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName,
      },
    });
  } catch (err: any) {
    console.error("[auth] POST /api/auth/signup failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

