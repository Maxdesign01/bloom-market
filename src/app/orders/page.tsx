import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "My orders" };

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {user.email}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center space-y-4">
          <div className="text-5xl">📦</div>
          <p className="text-zinc-600">You haven&apos;t placed an order yet.</p>
          <Link
            href="/"
            className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-zinc-500">
                    {order.paystack_reference ?? order.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleString("en-NG")}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    STATUS_STYLES[order.status] ?? "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <ul className="mt-4 divide-y divide-zinc-100 text-sm">
                {(order.order_items ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 py-2"
                  >
                    <span>
                      {item.name} <span className="text-zinc-500">× {item.quantity}</span>
                    </span>
                    <span>{formatNaira(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatNaira(order.total)}</span>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                {order.email_sent_at
                  ? "✓ Confirmation email sent"
                  : order.status === "paid"
                    ? "Confirmation email being sent…"
                    : "No confirmation email yet"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
