/** 24h % price change for an OKX instrument (e.g. "BTC-USDT"). Returns null on any
 * failure. OKX doesn't expose a ready-made % field, so it's derived from last vs open24h. */
export async function get24hChange(instId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      data?: Array<{ last?: string; open24h?: string }>;
    };
    if (data.code !== '0') return null;
    const ticker = data.data?.[0];
    const last = Number(ticker?.last);
    const open = Number(ticker?.open24h);
    if (!Number.isFinite(last) || !Number.isFinite(open) || open === 0) return null;
    return ((last - open) / open) * 100;
  } catch {
    return null;
  }
}
