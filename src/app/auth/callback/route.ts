import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleAuthEmailEvent } from "@/lib/auth-email";
import { resolveCartId } from "@/lib/cart";

/**
 * GET /auth/callback
 *
 * Supabase redirects back here with a one-time `code` after Google
 * approves the sign-in. We exchange it for a session, trigger the appropriate
 * transactional email (welcome if new Google user, login notice if returning),
 * merge any pre-login guest cart, and send the user on to their destination.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next") ?? "/";

  // Only allow relative redirect targets to prevent open-redirect abuse.
  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/";

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // 1. Transactional email notification (distinguishes new Google signup vs returning login)
        const userAgent = req.headers.get("user-agent");
        await handleAuthEmailEvent({
          userId: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name,
          userAgent,
          isExplicitSignup: false,
        });

        // 2. Resolve & merge guest cart into account cart
        try {
          await resolveCartId();
        } catch (cartErr) {
          console.error("[auth] Cart resolution during callback error:", cartErr);
        }

        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      if (error) {
        console.error("[auth] code exchange failed:", error.message);
      }
    } catch (err) {
      console.error("[auth] callback failed:", err);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Sign-in failed, please try again.")}`,
  );
}
