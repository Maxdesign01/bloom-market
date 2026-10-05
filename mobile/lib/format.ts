/** Format a kobo amount as Nigerian Naira, e.g. 1500000 -> "₦15,000.00" */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Convert a naira amount to kobo. */
export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}
