import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

/**
 * Mark an order as paid exactly once and send the confirmation email.
 *
 * The conditional update (`status = pending`) makes this idempotent: the
 * webhook and the browser callback can both fire, but only the first one
 * wins the transition and sends the email.
 *
 * Returns true if this call performed the transition.
 */
export async function markOrderPaid(
  reference: string,
): Promise<{ won: boolean; order: Order | null }> {
  const admin = createAdminClient();

  // Claim the transition atomically.
  const { data: claimed, error: claimError } = await admin
    .from("orders")
    .update({ status: "paid" })
    .eq("paystack_reference", reference)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) {
    throw new Error(`Failed to update order: ${claimError.message}`);
  }

  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  const typedOrder = order as unknown as Order | null;

  if (!claimed || !typedOrder) {
    // Either already paid or the reference is unknown.
    return { won: false, order: typedOrder };
  }

  // Send confirmation email; failure must not fail the payment.
  try {
    const { sendOrderConfirmation } = await import("@/lib/mailgun");
    await sendOrderConfirmation(typedOrder);
    await admin
      .from("orders")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", typedOrder.id);
  } catch (err) {
    console.error("[mailgun] confirmation email failed:", err);
  }

  // Decrement stock now that payment is confirmed.
  try {
    for (const item of typedOrder.order_items ?? []) {
      if (!item.product_id) continue;
      await admin.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_qty: item.quantity,
      });
    }
  } catch (err) {
    console.error("[stock] decrement failed:", err);
  }

  return { won: true, order: typedOrder };
}

/** Look up a single order by its Paystack reference. */
export async function getOrderByReference(
  reference: string,
): Promise<Order | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Order) ?? null;
}
