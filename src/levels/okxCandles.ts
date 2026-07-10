import type { Candle } from './types.js';

interface OkxCandlesResponse {
  code?: string;
  msg?: string;
  data?: string[][];
}

/** Fetches at least `totalNeeded` confirmed candles for `instId`/`bar` from OKX's
 * public market data API, paginating with `after` since a single call caps at 300.
 * NB: intentionally OKX, not Binance — api.binance.com returns 451 from US cloud
 * IPs (GitHub Actions runners), which OKX does not. */
export async function fetchOkxCandles(
  instId: string,
  bar: string,
  totalNeeded: number,
): Promise<Candle[]> {
  const collected: Candle[] = [];
  let after: string | undefined;

  while (collected.length < totalNeeded) {
    const url = new URL('https://www.okx.com/api/v5/market/candles');
    url.searchParams.set('instId', instId);
    url.searchParams.set('bar', bar);
    url.searchParams.set('limit', '300');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url);
    if (!res.ok) break;

    const json = (await res.json()) as OkxCandlesResponse;
    if (json.code !== '0' || !json.data || json.data.length === 0) break;

    const rows = json.data;
    for (const row of rows) {
      collected.push({
        ts: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        confirmed: row[8] === '1',
      });
    }

    // Rows are newest-first; the oldest row in this page seeds the next page.
    after = rows[rows.length - 1][0];
    if (rows.length < 300) break;
  }

  const byTs = new Map<number, Candle>();
  for (const c of collected) byTs.set(c.ts, c);

  return [...byTs.values()].sort((a, b) => a.ts - b.ts).slice(-totalNeeded);
}
