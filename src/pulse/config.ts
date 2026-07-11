export interface WatchlistCoin {
  symbol: 'BTC' | 'ETH' | 'SOL' | 'GRAM';
  /** OKX spot instrument (price/volume). */
  spotInstId: string;
  /** OKX perpetual swap instrument (funding/OI/liquidations). */
  swapInstId: string;
  /** Underlying id for the liquidation-orders endpoint's `uly` param. */
  uly: string;
}

/** GRAM is the renamed Toncoin (rebrand 2026-06-15, ticker TON -> GRAM, same
 * asset 1:1). OKX has already fully migrated — TON-USDT no longer resolves,
 * GRAM-USDT is the live pair (verified live: real ~$4-5M 24h volume, price in
 * the expected ~$1-2 range). Do NOT match by ticker alone elsewhere — there
 * are unrelated penny-stock lookalikes (old PoW-Gram, GRM, GRAMPUS). */
export const WATCHLIST: readonly WatchlistCoin[] = [
  { symbol: 'BTC', spotInstId: 'BTC-USDT', swapInstId: 'BTC-USDT-SWAP', uly: 'BTC-USDT' },
  { symbol: 'ETH', spotInstId: 'ETH-USDT', swapInstId: 'ETH-USDT-SWAP', uly: 'ETH-USDT' },
  { symbol: 'SOL', spotInstId: 'SOL-USDT', swapInstId: 'SOL-USDT-SWAP', uly: 'SOL-USDT' },
  { symbol: 'GRAM', spotInstId: 'GRAM-USDT', swapInstId: 'GRAM-USDT-SWAP', uly: 'GRAM-USDT' },
];

export const PULSE_CONFIG = {
  candleBar: '1H',
  dailyBar: '1D',
  /** Days of daily candles to fetch for Block 1 (7d change, streak, weekly hi/lo). */
  snapshotLookbackDays: 10,
  /** A streak (consecutive green or red daily closes) is only worth mentioning
   * in Block 1 / usable as a Block 2 reversal signal once it reaches this. */
  streakMinToMention: 3,
  /** Block 1: mention proximity to the weekly high/low when within this %. */
  proximityToExtremePct: 0.05,

  /** Block 2 — price outlier: flag the coin whose |24h move| is at least this
   * many times the median |24h move| across the watchlist. */
  anomalyOutlierRatio: 2,
  /** Block 2 — volume spike: today's 24h volume vs the trailing-7-day average. */
  anomalyVolumeSpikeRatio: 2,
  /** Block 2 — reversal: streak length (before today) needed for today's
   * direction-flip to count as a reversal worth reporting. */
  anomalyReversalMinStreak: 3,

  /** Block 4 — funding rate (per settlement interval, typically 8h) beyond
   * this magnitude counts as "overheated". 0.03% is well above BTC/ETH's
   * typical resting range (roughly ±0.001-0.01%) without requiring a truly
   * historic squeeze. Tune freely — this is a first guess, not measured. */
  fundingExtremePct: 0.0003,
  /** Block 4 — OI change over the last daily bucket beyond this is "notable". */
  oiChangeNotablePct: 0.03,
  /** Block 4 — combined long+short liquidations (USD) over the lookback below
   * this is "quiet", not worth a line. */
  liquidationsNotableUsd: 5_000_000,
  /** Block 4 — how far back liquidation-orders records count as "overnight". */
  liquidationsLookbackHours: 24,

  /** Footer shows roughly every 3rd day — same cadence idea as the newbie
   * brief, independent rotation/state. */
  footerIntervalDays: 3,
} as const;

export type PulseConfig = typeof PULSE_CONFIG;
