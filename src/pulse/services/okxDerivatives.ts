interface OkxResponse<T> {
  code?: string;
  msg?: string;
  data?: T[];
}

async function okxGet<T>(url: string): Promise<T[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as OkxResponse<T>;
    if (json.code !== '0' || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

/** Current funding rate (fraction, e.g. 0.0003 = 0.03%) for a SWAP instId. */
export async function fetchFundingRate(swapInstId: string): Promise<number | null> {
  const data = await okxGet<{ fundingRate?: string }>(
    `https://www.okx.com/api/v5/public/funding-rate?instId=${swapInstId}`,
  );
  const value = Number(data?.[0]?.fundingRate);
  return Number.isFinite(value) ? value : null;
}

/** Current open interest in USD for a SWAP instId. */
export async function fetchOpenInterestUsd(swapInstId: string): Promise<number | null> {
  const data = await okxGet<{ oiUsd?: string }>(
    `https://www.okx.com/api/v5/public/open-interest?instId=${swapInstId}`,
  );
  const value = Number(data?.[0]?.oiUsd);
  return Number.isFinite(value) ? value : null;
}

/** % change in OI between the latest two daily buckets (positive = growing). */
export async function fetchOpenInterestChangePct(swapInstId: string): Promise<number | null> {
  const data = await okxGet<[string, string, string, string]>(
    `https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-history?instId=${swapInstId}&period=1D&limit=2`,
  );
  if (!data || data.length < 2) return null;
  const latest = Number(data[0][3]); // oiUsd
  const prior = Number(data[1][3]);
  if (!Number.isFinite(latest) || !Number.isFinite(prior) || prior === 0) return null;
  return (latest - prior) / prior;
}

export interface LiquidationTotals {
  longUsd: number;
  shortUsd: number;
}

interface InstrumentSpec {
  ctVal?: string;
}

interface LiquidationDetail {
  posSide?: string;
  bkPx?: string;
  sz?: string;
  ts?: string;
}

interface LiquidationBucket {
  details?: LiquidationDetail[];
}

/** Sums liquidated notional (USD) by side over the last `lookbackHours`, for
 * one underlying (`uly`, e.g. "BTC-USDT"). Converts contract size to USD via
 * the instrument's ctVal (contract value in base currency) * price. */
export async function fetchLiquidations(
  uly: string,
  swapInstId: string,
  lookbackHours: number,
): Promise<LiquidationTotals | null> {
  const [instruments, buckets] = await Promise.all([
    okxGet<InstrumentSpec>(`https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=${swapInstId}`),
    okxGet<LiquidationBucket>(
      `https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&uly=${uly}&state=filled`,
    ),
  ]);

  const ctVal = Number(instruments?.[0]?.ctVal);
  if (!Number.isFinite(ctVal) || ctVal <= 0) return null;
  if (!buckets) return null;

  const cutoff = Date.now() - lookbackHours * 3_600_000;
  const totals: LiquidationTotals = { longUsd: 0, shortUsd: 0 };

  for (const bucket of buckets) {
    for (const d of bucket.details ?? []) {
      const ts = Number(d.ts);
      if (!Number.isFinite(ts) || ts < cutoff) continue;
      const sz = Number(d.sz);
      const px = Number(d.bkPx);
      if (!Number.isFinite(sz) || !Number.isFinite(px)) continue;
      const notionalUsd = sz * ctVal * px;
      if (d.posSide === 'long') totals.longUsd += notionalUsd;
      else if (d.posSide === 'short') totals.shortUsd += notionalUsd;
    }
  }

  return totals;
}
