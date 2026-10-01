import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * The catalogue card. One component so the grid on the homepage, the related
 * rows and any future listing all share identical proportions, spacing and
 * photo treatment.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= 5;

  return (
    <li className="h-full">
      <Link
        href={`/products/${product.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-1 ring-line transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
      >
        <div className="bm-photo aspect-4/5">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-sand-400">
              <FlowerGlyph />
            </div>
          )}

          {soldOut && (
            <span className="absolute top-3 left-3 rounded-full bg-sand-900/85 px-3 py-1 text-[0.6875rem] font-medium tracking-[0.08em] text-sand-50 uppercase backdrop-blur-sm">
              Sold out
            </span>
          )}
          {!soldOut && lowStock && (
            <span className="absolute top-3 left-3 rounded-full bg-bloom-500/95 px-3 py-1 text-[0.6875rem] font-medium tracking-[0.08em] text-white uppercase backdrop-blur-sm">
              Only {product.stock} left
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="font-display text-lg leading-snug font-medium text-balance">
            {product.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {product.description}
          </p>

          <div className="mt-5 flex items-end justify-between gap-3 pt-1">
            <span className="font-display text-xl font-semibold tabular-nums">
              {formatNaira(product.price)}
            </span>
            <span
              className="mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors group-hover:text-leaf-700"
              aria-hidden
            >
              View
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h13m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function FlowerGlyph({
  className = "size-10",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <circle cx="12" cy="9" r="3.2" />
      <path d="M12 12.2V21m0 0c-2.6 0-4.2-1.4-4.6-3.2M12 21c2.6 0 4.2-1.4 4.6-3.2" />
      <path d="M12 9c0-2.4-1.3-4-3-4M12 9c0-2.4 1.3-4 3-4" />
    </svg>
  );
}
