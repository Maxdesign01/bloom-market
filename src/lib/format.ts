/** Format a kobo amount as Nigerian Naira, e.g. 1500000 -> "₦15,000.00" */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(naira);
}

/** Convert a naira amount to kobo. */
export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}
