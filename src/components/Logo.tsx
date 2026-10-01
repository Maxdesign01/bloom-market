import Link from "next/link";

/**
 * The official Bloom Market logo.
 *
 * The supplied brand mark is a wordmark: "Bloom" set in a bold display serif,
 * "Market" in the matching regular, with the two "o"s of *Bloom* drawn as green
 * loops and a pink peony sitting above them.
 *
 * `BloomMark` is that artwork reproduced as vector geometry. It is sized and
 * aligned against the text baseline arithmetically (see the `-mb` value) so the
 * loops sit exactly on the baseline at any font size, and the bloom rises above
 * the cap height exactly as in the original.
 *
 * To swap in the official raster/SVG master, replace `BloomMark` with an
 * <img src="/brand/bloom-market-logo.svg" /> — the surrounding layout, sizing
 * and colour come from this component alone.
 */

type MarkProps = {
  className?: string;
  /** Accessible label; pass `null` when the logo sits next to visible text. */
  title?: string | null;
};

export function BloomMark({ className, title = "Bloom Market" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 180 200"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* Leaf */}
      <path
        d="M40 150 C 8 148 0 128 4 106 C 26 108 44 124 40 150 Z"
        fill="#6FA83C"
      />
      {/* Stem: the tail that continues below the wordmark baseline */}
      <path
        d="M148 126 C 152 152 150 176 142 196 L 158 196 C 165 174 166 150 162 126 Z"
        fill="#7CB342"
      />
      {/* The two "o"s of Bloom */}
      <circle
        cx="58"
        cy="126"
        r="24"
        fill="none"
        stroke="#7CB342"
        strokeWidth="12"
      />
      <circle
        cx="118"
        cy="126"
        r="24"
        fill="none"
        stroke="#7CB342"
        strokeWidth="12"
      />
      {/* Peony bloom — light upper-left through to deep crimson lower-right */}
      <g>
        <ellipse cx="88" cy="66" rx="58" ry="45" fill="#A81E4A" />
        <ellipse cx="52" cy="52" rx="36" ry="29" fill="#B93459" />
        <ellipse cx="124" cy="52" rx="36" ry="29" fill="#9A2A48" />
        <ellipse cx="88" cy="54" rx="48" ry="37" fill="#D24C72" />
        <ellipse cx="62" cy="40" rx="30" ry="24" fill="#E0718F" />
        <ellipse cx="114" cy="42" rx="28" ry="22" fill="#B93459" />
        <ellipse cx="84" cy="38" rx="34" ry="26" fill="#EC9FB5" />
        <ellipse cx="60" cy="24" rx="22" ry="17" fill="#F4C6D4" />
        <ellipse cx="108" cy="26" rx="20" ry="15" fill="#E0718F" />
        <ellipse cx="78" cy="18" rx="16" ry="12" fill="#FBE0EA" />
      </g>
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** `mark` = bloom only (compact spaces), `full` = complete wordmark. */
  variant?: "full" | "mark";
  /** Link target for the logo. Pass null to render a static logo. */
  href?: string | null;
  /** Text colour for the wordmark. */
  tone?: "leaf" | "cream";
  /** Wordmark font size in px. The artwork scales proportionally from it. */
  size?: number;
};

const TONES = {
  leaf: "text-leaf-900",
  cream: "text-sand-50",
} as const;

/**
 * Mark geometry (viewBox 0 0 180 200):
 *  - each loop is r=24 with a 12px stroke, so its outer edge reaches y = 156
 *  - 156 / 200 = 78% of the box sits above the wordmark baseline; the other
 *    22% is the stem tail that dips below it
 * At an on-screen height of 1.30em that tail measures 0.286em, so a -0.286em
 * bottom margin on a flex-end row lands the loops exactly on the baseline.
 */
export function Logo({
  className = "",
  variant = "full",
  href = "/",
  tone = "leaf",
  size = 21,
}: LogoProps) {
  const inner =
    variant === "mark" ? (
      <BloomMark
        className="h-[1.3em] w-auto"
        title={href ? "Bloom Market" : null}
      />
    ) : (
      <>
        <span className="font-display font-semibold tracking-[-0.02em]">Bl</span>
        <BloomMark
          className="h-[1.3em] w-auto -mb-[0.286em] shrink-0"
          title={null}
        />
        <span className="font-display font-semibold tracking-[-0.02em]">m</span>
        <span className="font-display font-normal tracking-[-0.02em]">
          arket
        </span>
      </>
    );

  const style = { fontSize: size, lineHeight: 1 };
  const shared = `${className} ${TONES[tone]} shrink-0`;

  if (!href) {
    return (
      <span
        style={style}
        className={`${shared} inline-flex items-end`}
        role={variant === "mark" ? undefined : "img"}
        aria-label={variant === "mark" ? undefined : "Bloom Market"}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      style={style}
      aria-label="Bloom Market — home"
      className={`${shared} inline-flex items-end`}
    >
      {inner}
    </Link>
  );
}
