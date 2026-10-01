import { CartView } from "@/components/CartView";
import { getCart, getOrCreateCartId } from "@/lib/cart";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const cart = await getCart(await getOrCreateCartId());
  const items = cart?.cart_items ?? [];
  const subtotal = items.reduce(
    (sum, i) => sum + (i.products?.price ?? 0) * i.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
      <CartView initialItems={items} initialSubtotal={subtotal} />
    </div>
  );
}
