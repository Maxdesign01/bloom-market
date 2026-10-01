import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  const products = (data as Product[] | null) ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-emerald-700 text-white px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-emerald-200 text-sm font-medium uppercase tracking-wider">
          Fresh from the florist
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
          Flowers that say it better.
        </h1>
        <p className="mt-3 max-w-xl text-emerald-100">
          Hand-tied bouquets and healthy houseplants, delivered across Lagos.
          Every order gets an email confirmation the moment payment lands.
        </p>
        <Link
          href="#products"
          className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
        >
          Shop the collection
        </Link>
      </section>

      <section id="products">
        <div className="flex items-end justify-between gap-4 mb-5">
          <h2 className="text-xl font-semibold tracking-tight">All products</h2>
          <p className="text-sm text-zinc-500">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-medium">Could not load products.</p>
            <p className="mt-1 break-all">{error.message}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
            No products yet. Run the seed migration in Supabase to populate the
            catalogue.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.id}`}
                  className="group flex flex-col h-full rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all"
                >
                  <div className="aspect-[4/3] bg-zinc-100 overflow-hidden">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-4xl">
                        🌸
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-medium leading-snug">{product.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {formatNaira(product.price)}
                      </span>
                      <span
                        className={`text-xs ${
                          product.stock > 0
                            ? "text-emerald-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {product.stock > 0
                          ? `${product.stock} in stock`
                          : "Sold out"}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
