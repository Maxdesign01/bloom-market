import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "My orders" };

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-leaf-100 text-leaf-800",
  pending: "bg-bloom-50 text-bloom-700",
  failed: "bg-bloom-100 text-bloom-800",
};

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/orders");
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const orders = (data as unknown as Order[]) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Signed in"
        title="My orders"
        copy={`Signed in as ${user.email}`}
      />

      <div className="bm-shell py-12 sm:py-16">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-sand-300 bg-surface px-8 py-20 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-leaf-50 text-leaf-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.5 7.5 12 12m0 0 8.5-4.5M12 12v9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h2 className="mt-6 font-display text-2xl font-medium">
              No orders yet
            </h2>
            <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-ink-soft">
              When you place an order it will appear here, with its payment
              status and confirmation email state.
            </p>
            <Link href="/#collection" className="bm-btn bm-btn-primary mt-8">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="max-w-3xl space-y-5">
            {orders.map((order) => (
              <li
                key={order.id}
                className="overflow-hidden rounded-lg bg-surface shadow-soft ring-1 ring-line"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sand-50 px-5 py-4 sm:px-6">
                  <div>
                    <p className="font-mono text-xs text-ink-soft">
                      {order.paystack_reference ?? order.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {new Date(order.created_at).toLocaleString("en-NG")}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6875rem] font-medium tracking-[0.04em] uppercase ${
                      STATUS_STYLES[order.status] ??
                      "bg-sand-200 text-sand-700"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-current opacity-70" />
                    {order.status}
                  </span>
                </div>

                <ul className="divide-y divide-line px-5 text-sm sm:px-6">
                  {(order.order_items ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-3 py-3.5"
                    >
                      <span>
                        {item.name}{" "}
                        <span className="text-ink-soft">× {item.quantity}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatNaira(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-baseline justify-between gap-4 border-t border-line px-5 py-4 sm:px-6">
                  <span className="font-display text-lg font-medium">Total</span>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {formatNaira(order.total)}
                  </span>
                </div>

                <p className="border-t border-line bg-sand-50 px-5 py-3.5 text-xs text-ink-soft sm:px-6">
                  {order.email_sent_at
                    ? "Confirmation email sent"
                    : order.status === "paid"
                      ? "Confirmation email being sent…"
                      : "No confirmation email yet"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
