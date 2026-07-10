/** 24h % price change for a Binance symbol (e.g. "BTCUSDT"). Returns null on any failure. */
export async function get24hChange(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { priceChangePercent?: string };
    const value = Number(data.priceChangePercent);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
