"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-out for the profile page. Kept client-side because Supabase auth is a
 * browser concern; it reuses the same `createClient()` helper and the same
 * sign-out call the header sheet already performs.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.refresh();
      router.push("/");
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isPending}
      className="bm-btn bm-btn-outline"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}