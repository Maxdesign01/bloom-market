import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase Auth session on every matched request.
 * Next.js 16 renamed middleware -> proxy.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser() —
  // it can cause random logouts.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes: require a signed-in user.
    // Note: /checkout stays public so guests can buy; only order history
    // requires auth (the orders API/page enforce this too).
    const { pathname } = request.nextUrl;
    const isProtected = pathname.startsWith("/orders");
    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    // getUser() throws when the session is invalid — continue, page-level
    // checks will handle it.
  }

  return supabaseResponse;
}
