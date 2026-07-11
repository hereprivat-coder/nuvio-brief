export interface DailyCandle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volCcy: number;
}

/** Deliberately separate from src/levels/okxCandles.ts: that module's Candle
 * type has no volume field (the level detector never needed one), and
 * src/levels/ is sealed — not touching it just to add a field Pulse needs.
 * `limit` days of daily bars never approaches OKX's 300-per-call cap, so no
 * pagination needed here either. */
export async function fetchDailyCandles(instId: string, bar: string, limit: number): Promise<DailyCandle[]> {
  try {
    const url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = (await res.json()) as { code?: string; data?: string[][] };
    if (json.code !== '0' || !json.data) return [];

    return json.data
      .map((row) => ({
        ts: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volCcy: Number(row[6]),
      }))
      .sort((a, b) => a.ts - b.ts);
  } catch {
    return [];
  }
}
