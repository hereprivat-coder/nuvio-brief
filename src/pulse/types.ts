import type { WatchlistCoin } from './config.js';

export interface CoinDailySeries {
  coin: WatchlistCoin;
  /** Live ticker snapshot. */
  lastPrice: number;
  change24hPct: number;
  /** Ascending by time, oldest first. Daily candles, ~10 days. */
  dailyCloses: number[];
  dailyOpens: number[];
  dailyHighs: number[];
  dailyLows: number[];
  dailyVolUsd: number[];
}

export interface SnapshotLine {
  coin: WatchlistCoin;
  text: string;
  change24hPct: number;
}

export type AnomalyKind = 'outlier' | 'volume' | 'reversal';

export interface AnomalyResult {
  kind: AnomalyKind;
  coin: WatchlistCoin;
  text: string;
  /** Magnitude used to rank/prioritize when multiple detectors fire. */
  strength: number;
}
