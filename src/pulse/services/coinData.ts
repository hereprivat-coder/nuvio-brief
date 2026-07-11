import type { WatchlistCoin } from '../config.js';
import type { CoinDailySeries } from '../types.js';
import { fetchTicker } from './okxTicker.js';
import { fetchDailyCandles } from './okxDailyCandles.js';

/** Shared fetch for Blocks 1 and 2 — one ticker + daily-candle round trip per
 * coin, reused so both blocks see the same numbers. Null on any failure for
 * that coin; callers drop it from their output rather than fail the whole post. */
export async function fetchCoinSeries(
  coin: WatchlistCoin,
  dailyBar: string,
  lookbackDays: number,
): Promise<CoinDailySeries | null> {
  const [ticker, candles] = await Promise.all([
    fetchTicker(coin.spotInstId),
    fetchDailyCandles(coin.spotInstId, dailyBar, lookbackDays),
  ]);

  if (!ticker || candles.length < 2) return null;

  return {
    coin,
    lastPrice: ticker.last,
    change24hPct: ticker.change24hPct,
    dailyCloses: candles.map((c) => c.close),
    dailyOpens: candles.map((c) => c.open),
    dailyHighs: candles.map((c) => c.high),
    dailyLows: candles.map((c) => c.low),
    dailyVolUsd: candles.map((c) => c.volCcy),
  };
}
