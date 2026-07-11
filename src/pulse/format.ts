/** Coins under $10 (GRAM territory) need decimal places to be readable;
 * everything else follows the same integer + thousands-separator style as
 * the level detector's price formatting. */
export function formatCoinPrice(price: number): string {
  if (price < 10) return price.toFixed(2);
  return Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Signed percentage, one decimal, using the mathematical minus sign (−) to
 * match the spec's own examples rather than a plain hyphen. */
export function formatPct(fraction: number): string {
  const pct = (fraction * 100).toFixed(1);
  return fraction >= 0 ? `+${pct}%` : `−${Math.abs(Number(pct)).toFixed(1)}%`;
}

/** Unsigned percentage for "within X% of ..." phrasing. */
export function formatPctAbs(fraction: number): string {
  return `${(Math.abs(fraction) * 100).toFixed(1)}%`;
}
