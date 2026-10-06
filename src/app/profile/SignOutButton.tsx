"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-out for the profile page.
 * Clears the server session, removes the cart cookie for account isolation,
 * dispatches the cart update event, and navigates home cleanly.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function signOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Best-effort server cookie clear
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    window.dispatchEvent(new CustomEvent("cart:updated"));

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