import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

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

  return (
    <div className="space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900">
          Shop
        </Link>{" "}
        / <span className="text-zinc-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 aspect-square">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-7xl">
              🌸
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-semibold">
            {formatNaira(product.price)}
          </p>
          <p className="mt-4 text-zinc-600 leading-relaxed">
            {product.description}
          </p>

          <p className="mt-4 text-sm">
            {product.stock > 0 ? (
              <span className="text-emerald-600">
                ✓ {product.stock} available
              </span>
            ) : (
              <span className="text-red-600">✗ Out of stock</span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton productId={product.id} disabled={product.stock === 0} />
            <Link
              href="/cart"
              className="inline-flex items-center rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 transition-colors"
            >
              View cart
            </Link>
          </div>

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 space-y-1">
            <p>🚚 Same-day delivery in Lagos</p>
            <p>📧 Email confirmation sent instantly after payment</p>
            <p>🔒 Secure checkout powered by Paystack</p>
          </div>
        </div>
      </div>
    </div>
  );
}
