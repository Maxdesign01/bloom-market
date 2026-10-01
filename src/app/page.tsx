import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { BloomMark } from "@/components/Logo";
import {
  EditorialCard,
  EmptyCatalogue,
  SectionHeading,
} from "@/components/home-sections";

export const dynamic = "force-dynamic";

/** Occasion shortcuts, each anchored to a real product in the catalogue. */
const OCCASIONS = [
  { label: "Romance", note: "Roses & peonies", match: /rose|hydrangea/i },
  { label: "Birthday", note: "Bright & cheerful", match: /tulip|sunflower/i },
  { label: "Sympathy", note: "Quiet whites", match: /orchid|lily/i },
  { label: "Homewarming", note: "Living plants", match: /succulent|lily/i },
  { label: "Just because", note: "Dainty fillers", match: /baby/i },
];

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  const products = (data as Product[] | null) ?? [];
  const hero = products[0];

  const occasions = OCCASIONS.flatMap((occasion) => {
    const product = products.find((item) => occasion.match.test(item.name));
    return product ? [{ label: occasion.label, note: occasion.note, product }] : [];
  });

  return (
    <>
      <Hero hero={hero} />
      <Occasions occasions={occasions} />
      <Collection
        products={products}
        errorMessage={error?.message ?? null}
      />
      <EditorialPair products={products} />
      <OurStory products={products} />
      <DeliveryCare />
    </>
  );
}

function Hero({ hero }: { hero: Product | undefined }) {
  return (
    <section className="relative overflow-hidden bg-sand-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-[26rem] rounded-full bg-bloom-100/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 size-[24rem] rounded-full bg-leaf-100/80 blur-3xl"
      />

      <div className="bm-shell relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-leaf-200 bg-leaf-50/80 py-1.5 pr-4 pl-1.5 text-xs font-medium text-leaf-800">
            <span className="grid size-6 place-items-center rounded-full bg-leaf-800 text-sand-50">
              <BloomMark className="h-3.5 w-auto" title={null} />
            </span>
            Lagos&apos;s freshest stems
          </span>

          <h1 className="mt-7 font-display text-5xl leading-[1.03] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
            Flowers that say
            <span className="relative ml-3 inline-block text-bloom-600 italic">
              it better
              <svg
                aria-hidden
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-2.5 w-full text-bloom-300"
              >
                <path
                  d="M2 8.5C46 3 154 3 198 8.5"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
            Hand-tied bouquets and healthy houseplants, conditioned at dawn and
            delivered across Lagos the same day. Pay securely, then watch for
            your confirmation email.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="#collection" className="bm-btn bm-btn-primary">
              Shop the collection
            </Link>
            <Link href="#about" className="bm-btn bm-btn-outline">
              Our story
            </Link>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
            {[
              ["8", "Seasonal designs"],
              ["Same day", "Lagos delivery"],
              ["4.9", "Customer rating"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">
                  {value}
                </dt>
                <dd className="mt-1 text-[0.6875rem] tracking-[0.06em] text-ink-soft uppercase">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl bg-surface shadow-lift">
            <div className="bm-photo aspect-4/5 sm:aspect-square lg:aspect-4/5">
              {hero?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.image_url}
                  alt={hero.name}
                  fetchPriority="high"
                  decoding="async"
                />
              )}
            </div>
          </div>

          {hero && (
            <div className="absolute -bottom-6 -left-4 w-[15rem] rounded-xl bg-surface p-5 shadow-lift sm:-left-8 sm:w-[17rem]">
              <p className="bm-eyebrow">This week&apos;s favourite</p>
              <p className="mt-2 font-display text-lg leading-snug font-medium">
                {hero.name}
              </p>
              <Link
                href={`/products/${hero.id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 transition-colors hover:text-leaf-900"
              >
                Shop this bouquet
                <ArrowIcon />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Occasions({
  occasions,
}: {
  occasions: { label: string; note: string; product: Product }[];
}) {
  if (occasions.length === 0) return null;

  return (
    <section id="occasions" className="scroll-mt-28 py-20 sm:py-24">
      <div className="bm-shell">
        <SectionHeading
          eyebrow="Occasions"
          title="Shop by feeling"
          copy="Every bouquet starts with a reason to send it."
        />

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
          {occasions.map((occasion) => (
            <li key={occasion.label}>
              <Link
                href={`/products/${occasion.product.id}`}
                className="group flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-5 text-center shadow-xs transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <span className="grid size-14 place-items-center rounded-full bg-leaf-50 text-leaf-700 ring-1 ring-leaf-100 transition-colors group-hover:bg-leaf-100">
                  <BloomMark className="h-6 w-auto" title={null} />
                </span>
                <span>
                  <span className="block font-display text-base font-medium">
                    {occasion.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {occasion.note}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Collection({
  products,
  errorMessage,
}: {
  products: Product[];
  errorMessage: string | null;
}) {
  return (
    <section id="collection" className="scroll-mt-28 py-20 sm:py-24">
      <div className="bm-shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="The collection"
            title="Everything in bloom"
            copy="Eight designs, conditioned daily and photographed as they arrive."
          />
          <p className="text-sm text-ink-soft">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-10 rounded-lg border border-bloom-200 bg-bloom-50 p-6 text-sm text-bloom-800"
          >
            <p className="font-medium">We couldn&apos;t load the catalogue.</p>
            <p className="mt-1 break-all opacity-80">{errorMessage}</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyCatalogue />
        ) : (
          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 8).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EditorialPair({ products }: { products: Product[] }) {
  if (products.length < 3) return null;

  return (
    <section className="py-4 sm:py-8">
      <div className="bm-shell grid gap-6 lg:grid-cols-2">
        <EditorialCard
          product={products[1]}
          eyebrow="Best seller"
          title="The one they always ask for twice"
          cta="Shop the classic"
          tone="bloom"
        />
        <EditorialCard
          product={products[2]}
          eyebrow="New this week"
          title="A little pot of calm for the windowsill"
          cta="Meet the orchid"
          tone="leaf"
        />
      </div>
    </section>
  );
}

function DeliveryCare() {
  return (
    <section id="delivery" className="scroll-mt-28 py-20 sm:py-24">
      <div className="bm-shell">
        <div className="overflow-hidden rounded-2xl bg-leaf-900 px-6 py-14 text-center sm:px-14 sm:py-16">
          <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-leaf-300 uppercase">
            Delivery &amp; care
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl leading-tight font-semibold text-sand-50 text-balance sm:text-4xl">
            Ordered by 2pm, in your hands by sunset
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-leaf-200 sm:text-base">
            We deliver seven days a week across Lagos. Keep cut flowers in clean
            water away from direct sun, and trim the stems every couple of days.
            Plants want bright, indirect light and a drink when the topsoil feels
            dry.
          </p>

          <ul className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              [
                "Cut flowers",
                "Trim stems at an angle, change the water every two days, keep them cool.",
              ],
              [
                "Potted plants",
                "Bright indirect light. Water when the top centimetre of soil is dry.",
              ],
              [
                "Orchids",
                "Never let the pot sit in water. Feed lightly through the growing season.",
              ],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-lg border border-leaf-800 bg-leaf-950/40 px-6 py-7 text-left"
              >
                <h3 className="font-display text-lg font-medium text-sand-50">
                  {title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-leaf-200">
                  {body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link
              href="#collection"
              className="bm-btn bg-sand-50 text-leaf-900 hover:bg-sand-100"
            >
              Browse the collection
            </Link>
            <Link
              href="/cart"
              className="bm-btn border border-leaf-700 text-sand-50 hover:bg-leaf-800"
            >
              View your cart
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function OurStory({ products }: { products: Product[] }) {
  return (
    <section id="about" className="scroll-mt-28 py-20 sm:py-28">
      <div className="bm-shell grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="bm-eyebrow">Our story</p>
          <h2 className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
            A small bench, a strict routine, and flowers that last the week
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Bloom Market began with one florist, one cold room and a stubborn
            belief that an online bouquet shop should feel like a market stall
            on a good morning — not a warehouse. Every stem is cut to order,
            hydrated overnight and photographed before it is boxed.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            We keep the range deliberately tight so we can keep the quality high.
            If something sells out, it means the morning&apos;s flowers are gone
            — and we would rather tell you that than send a compromise.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-4 rounded-lg bg-surface p-6 shadow-soft ring-1 ring-line">
            {[
              ["100%", "Stem inspection"],
              ["0", "Preservatives"],
              ["24h", "Dispatch window"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">
                  {value}
                </dt>
                <dd className="mt-1 text-[0.6875rem] tracking-[0.06em] text-ink-soft uppercase">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {products.slice(3, 5).map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-lg shadow-card"
            >
              <div className="bm-photo aspect-3/4">
                {product.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h13m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

