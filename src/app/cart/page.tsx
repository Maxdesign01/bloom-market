import { CartView } from "@/components/CartView";
import { getCart, getOrCreateCartId } from "@/lib/cart";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your cart" };

export default async function CartPage() {
  const cart = await getCart(await getOrCreateCartId());
  const items = cart?.cart_items ?? [];
  const subtotal = items.reduce(
    (sum, i) => sum + (i.products?.price ?? 0) * i.quantity,
    0,
  );
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <PageHeader
        eyebrow="Step 1 of 2"
        title="Your cart"
        copy={
          count > 0
            ? `${count} item${count === 1 ? "" : "s"} ready to go. Check the details, then pay securely.`
            : "Review what you have picked before paying."
        }
        crumbs={[{ href: "/", label: "Shop" }]}
      />

      <div className="bm-shell py-12 sm:py-16">
        <CartView initialItems={items} initialSubtotal={subtotal} />
      </div>
    </>
  );
}
