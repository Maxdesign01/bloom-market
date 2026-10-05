import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyCatalogue } from "@/components/home-sections";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop" };

/**
 * The full catalogue.
 *
 * This deliberately reuses the homepage's query, `ProductCard` and empty state
 * so the shop reads as the same store — only the surrounding editorial
 * sections and hero are left behind.
 */
export default async function ShopPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  const products = (data as Product[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="The collection"
        title="Everything in bloom"
        copy="Fresh stems, hand-tied every morning and delivered across Lagos."
        crumbs={[{ href: "/", label: "Home" }]}
      />

      <div className="bm-shell py-12 sm:py-16">
        <p className="text-sm text-ink-soft">
          {products.length} item{products.length === 1 ? "" : "s"}
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-10 rounded-lg border border-bloom-200 bg-bloom-50 p-6 text-sm text-bloom-800"
          >
            <p className="font-medium">We couldn&apos;t load the catalogue.</p>
            <p className="mt-1 break-all opacity-80">{error.message}</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyCatalogue />
        ) : (
          <ul
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            data-bm-stagger=""
          >
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}