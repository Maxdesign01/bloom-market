import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Supabase redirects back here with a one-time `code` after Google
 * approves the sign-in. We exchange it for a session and send the user
 * on to their original destination.
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
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      console.error("[auth] code exchange failed:", error.message);
    } catch (err) {
      console.error("[auth] callback failed:", err);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Sign-in failed, please try again.")}`,
  );
}
