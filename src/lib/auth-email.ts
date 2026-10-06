import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail, sendLoginNotification } from "@/lib/mailgun";

/**
 * Handle a successful authentication event (signup or login).
 *
 * Requirements fulfilled:
 * - Form signup -> sends Welcome email.
 * - Google signup (first-time Google user) -> sends Welcome email.
 * - Form login -> sends Login Notification email.
 * - Google login (returning user) -> sends Login Notification email.
 * - Accurately distinguishes NEW Google account from EXISTING Google login.
 * - Prevents duplicate emails across OAuth redirects or page reloads within 60 seconds.
 * - Graceful failure: Mailgun errors are logged and never disrupt authentication.
 */
export async function handleAuthEmailEvent({
  userId,
  email,
  fullName,
  userAgent,
  isExplicitSignup = false,
}: {
  userId: string;
  email: string;
  fullName?: string | null;
  userAgent?: string | null;
  isExplicitSignup?: boolean;
}): Promise<void> {
  if (!userId || !email) return;

  try {
    const admin = createAdminClient();
    const { data: userRecord, error: userError } =
      await admin.auth.admin.getUserById(userId);

    if (userError || !userRecord?.user) {
      console.warn("[auth-email] User record not found for auth email event:", userId);
      return;
    }

    const metadata = (userRecord.user.user_metadata || {}) as Record<string, any>;
    const resolvedName =
      fullName?.trim() ||
      metadata.full_name?.trim() ||
      metadata.name?.trim() ||
      null;

    const welcomeSentAt = metadata.welcome_email_sent_at;
    const lastNotifiedAt = metadata.last_login_notified_at
      ? new Date(metadata.last_login_notified_at).getTime()
      : 0;
    const now = Date.now();

    // Determine if this is a first-time account creation:
    // It is a new account if:
    // 1) explicitly registered via signup form (isExplicitSignup = true), OR
    // 2) welcome_email_sent_at is NOT set AND user was created within the last 15 minutes.
    const isNewAccount =
      !welcomeSentAt &&
      (isExplicitSignup ||
        (userRecord.user.created_at &&
          now - new Date(userRecord.user.created_at).getTime() < 15 * 60 * 1000));

    if (isNewAccount) {
      console.log(`[auth-email] Processing NEW account creation email for ${email}`);
      await sendWelcomeEmail({
        email,
        name: resolvedName,
      });

      const updatedMetadata = {
        ...metadata,
        welcome_email_sent_at: new Date().toISOString(),
        // Also stamp last_login_notified_at so an immediate callback doesn't send a redundant login email
        last_login_notified_at: new Date().toISOString(),
      };

      await admin.auth.admin.updateUserById(userId, {
        user_metadata: updatedMetadata,
      });

      // Best-effort write to profiles
      try {
        await admin
          .from("profiles")
          .update({
            welcome_email_sent_at: updatedMetadata.welcome_email_sent_at,
            last_login_notified_at: updatedMetadata.last_login_notified_at,
          })
          .eq("id", userId);
      } catch {
        // Ignored if column does not exist yet
      }

      return;
    }

    // Existing user login:
    // Deduplication guard: ignore if a login notification was already sent in the last 60 seconds
    // (prevents duplicate emails from multiple OAuth callbacks or rapid navigation)
    if (now - lastNotifiedAt < 60 * 1000) {
      console.log(
        `[auth-email] Suppressing duplicate login email for ${email} (last sent ${Math.round(
          (now - lastNotifiedAt) / 1000,
        )}s ago)`,
      );
      return;
    }

    console.log(`[auth-email] Processing LOGIN notification email for ${email}`);
    await sendLoginNotification({
      email,
      name: resolvedName,
      userAgent: userAgent ?? null,
      timestamp: new Date(),
    });

    const updatedMetadata = {
      ...metadata,
      last_login_notified_at: new Date().toISOString(),
    };

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    });

    // Best-effort write to profiles
    try {
      await admin
        .from("profiles")
        .update({
          last_login_notified_at: updatedMetadata.last_login_notified_at,
        })
        .eq("id", userId);
    } catch {
      // Ignored if column does not exist yet
    }
  } catch (err: any) {
    console.error("[auth-email] Non-fatal auth email event error:", err?.message || err);
  }
}

