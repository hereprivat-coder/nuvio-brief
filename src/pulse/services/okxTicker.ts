export interface TickerSnapshot {
  last: number;
  change24hPct: number;
  volCcy24h: number;
}

/** Live spot ticker: last price, 24h % change (derived from open24h, same
 * approach as the newbie brief's price source), and 24h volume in quote
 * currency (USD for our *-USDT pairs). Separate from src/services/okx.ts on
 * purpose — that one is newbie-brief-owned and only returns %change. */
export async function fetchTicker(spotInstId: string): Promise<TickerSnapshot | null> {
  try {
    const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${spotInstId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      data?: Array<{ last?: string; open24h?: string; volCcy24h?: string }>;
    };
    if (json.code !== '0') return null;

    const t = json.data?.[0];
    const last = Number(t?.last);
    const open24h = Number(t?.open24h);
    const volCcy24h = Number(t?.volCcy24h);
    if (!Number.isFinite(last) || !Number.isFinite(open24h) || open24h === 0) return null;

    return {
      last,
      change24hPct: (last - open24h) / open24h,
      volCcy24h: Number.isFinite(volCcy24h) ? volCcy24h : 0,
    };
  } catch {
    return null;
  }
}
