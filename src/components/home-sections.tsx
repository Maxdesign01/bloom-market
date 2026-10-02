import Link from "next/link";
import type { Product } from "@/lib/types";

export function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-2xl" data-bm-reveal="">
      <p className="bm-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
        {copy}
      </p>
    </div>
  );
}

export function EditorialCard({
  product,
  eyebrow,
  title,
  cta,
  tone,
}: {
  product: Product;
  eyebrow: string;
  title: string;
  cta: string;
  tone: "bloom" | "leaf";
}) {
  return (
    <article
      data-bm-reveal=""
      className={`group relative overflow-hidden rounded-2xl p-8 sm:p-10 ${
        tone === "bloom" ? "bg-bloom-50" : "bg-leaf-50"
      }`}
    >
      {/*
        The circular product shot bleeds off the bottom-right corner, so the text
        column is capped to a percentage that always stops short of it. Sizing in %
        rather than rem is what keeps this correct from 320px to 1280px, where the
        card itself changes width considerably.
      */}
      <div className="relative z-10 max-w-[60%] sm:max-w-[70%] lg:max-w-[60%] xl:max-w-[70%]">
        <p
          className={`text-[0.6875rem] font-semibold tracking-[0.18em] uppercase ${
            tone === "bloom" ? "text-bloom-600" : "text-leaf-600"
          }`}
        >
          {eyebrow}
        </p>
        <h3 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-3xl">
          {title}
        </h3>
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-soft sm:line-clamp-2">
          {product.description}
        </p>
        <Link
          href={`/products/${product.id}`}
          className={`bm-btn bm-btn-sm mt-7 ${
            tone === "bloom" ? "bm-btn-bloom" : "bm-btn-primary"
          }`}
        >
          {cta}
        </Link>
      </div>

      <div
        className="pointer-events-none absolute -right-4 -bottom-6 h-28 w-28 overflow-hidden rounded-full shadow-card transition-transform duration-500 group-hover:scale-105 sm:-right-8 sm:-bottom-10 sm:h-48 sm:w-48"
        aria-hidden
      >
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        )}
      </div>
    </article>
  );
}

export function EmptyCatalogue() {
  return (
    <div className="mt-12 rounded-lg border border-dashed border-sand-300 bg-surface px-8 py-20 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-leaf-50 text-leaf-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <p className="mt-6 font-display text-xl font-medium">
        The bench is empty for now
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Our stems are still being conditioned. Run the catalogue seed in Supabase
        to load the collection, then refresh this page.
      </p>
    </div>
  );
}
