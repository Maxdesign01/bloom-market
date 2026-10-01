import Link from "next/link";

/**
 * The masthead used by every interior route so the title block, the
 * breadcrumb and the vertical rhythm are identical everywhere.
 */
export function PageHeader({
  eyebrow,
  title,
  copy,
  crumbs = [],
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <div className="border-b border-line bg-sand-100">
      <div className="bm-shell py-12 sm:py-16">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
              {crumbs.map((crumb, index) => (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <span aria-hidden className="text-sand-400">
                      /
                    </span>
                  )}
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-leaf-800"
                  >
                    {crumb.label}
                  </Link>
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="text-sand-400">
                  /
                </span>
                <span aria-current="page" className="text-ink">
                  {title}
                </span>
              </li>
            </ol>
          </nav>
        )}

        {eyebrow && <p className="bm-eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-4xl leading-[1.08] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
          {title}
        </h1>
        {copy && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
            {copy}
          </p>
        )}
      </div>
    </div>
  );
}
