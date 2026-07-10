/** Fear & Greed Index (0-100) from alternative.me. Returns null on any failure — the
 * caller must skip Block 2 entirely rather than show a stale/incorrect number. */
export async function fetchFearGreedIndex(): Promise<number | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ value?: string }> };
    const value = Number(data.data?.[0]?.value);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
