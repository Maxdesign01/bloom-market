import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { PageHeader } from "@/components/PageHeader";
import { BloomMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

const PERKS = [
  {
    title: "Conditioned at dawn",
    body: "Cut, hydrated and photographed before it is ever boxed.",
  },
  {
    title: "Same-day Lagos delivery",
    body: "Order before 2pm and it reaches you the same evening.",
  },
  {
    title: "Email confirmation",
    body: "A receipt lands the moment Paystack confirms your payment.",
  },
];

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const product = data as Product;
  const soldOut = product.stock === 0;

  const { data: others } = await supabase
    .from("products")
    .select("*")
    .neq("id", product.id)
    .limit(4);

  const related = (others as Product[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Fresh cut"
        title={product.name}
        crumbs={[
          { href: "/", label: "Shop" },
          { href: "/#collection", label: "Collection" },
        ]}
      />

      <div className="bm-shell py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
              <div className="bm-photo aspect-square">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    fetchPriority="high"
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sand-400">
                    <BloomMark className="h-20 w-auto" title={null} />
                  </div>
                )}
              </div>
            </div>

            <ul className="mt-6 grid gap-4 sm:grid-cols-3 lg:mt-8">
              {PERKS.map((perk) => (
                <li key={perk.title} className="px-1">
                  <h3 className="text-sm font-semibold text-ink">
                    {perk.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    {perk.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-display text-4xl font-semibold tracking-[-0.02em] tabular-nums sm:text-5xl">
              {formatNaira(product.price)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {soldOut ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-200 px-3.5 py-1.5 text-xs font-medium text-sand-700">
                  <span className="size-1.5 rounded-full bg-sand-500" />
                  Sold out
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-100 px-3.5 py-1.5 text-xs font-medium text-leaf-800">
                  <span className="size-1.5 rounded-full bg-leaf-500" />
                  {product.stock} available
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bloom-50 px-3.5 py-1.5 text-xs font-medium text-bloom-700">
                Cut to order
              </span>
            </div>

            <p className="mt-7 text-base leading-relaxed text-ink-soft">
              {product.description}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <AddToCartButton productId={product.id} disabled={soldOut} />
              <Link href="/cart" className="bm-btn bm-btn-outline">
                View cart
              </Link>
            </div>

            <div className="mt-10 rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line">
              <h2 className="font-display text-lg font-medium">Good to know</h2>
              <dl className="mt-5 space-y-4 text-sm">
                {[
                  ["Delivery", "Same day across Lagos, order before 2pm"],
                  ["Payment", "Card, bank transfer or USSD via Paystack"],
                  ["Confirmation", "Emailed to you as soon as payment clears"],
                ].map(([term, value]) => (
                  <div
                    key={term}
                    className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line pb-4 last:border-0 last:pb-0"
                  >
                    <dt className="text-ink-soft">{term}</dt>
                    <dd className="text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <div className="max-w-2xl">
              <p className="bm-eyebrow">You may also like</p>
              <h2 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
                More from the bench
              </h2>
            </div>
            <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
