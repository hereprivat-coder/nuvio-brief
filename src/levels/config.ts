/** Tunable knobs for the support/resistance detector (spec: smart-brief levels module). */
export const LEVELS_CONFIG = {
  /** Candles required on each side of a pivot candidate. */
  pivotStrength: 3,
  /** Pivots within this % of each other's cluster mean merge into one level. */
  clusterTolPct: 0.004,
  /** Minimum touches for a cluster to count as a level at all; 3+ is "strong". */
  minTouches: 2,
  /** Levels farther than this from current price are ignored. */
  relevancePct: 0.04,
  /** Price within this % of a level counts as "testing it now". */
  testingNowPct: 0.005,
  /** Close beyond a level by this margin counts as a break. */
  breakMarginPct: 0.003,
  /** A level being tested right now only gets solo-headlined if it's `strong`
   * (3+ touches) AND its score clears this bar too — otherwise a barely-strong
   * level (e.g. exactly 3 touches, score ~38 max under current weights) can
   * shadow a much bigger structural level sitting a bit further away. At the
   * current score weights, this effectively requires ~4+ touches with decent
   * recency/duration, or 5+ touches outright. Tune alongside scoreWeights. */
  testingHeadlineMinScore: 45,
  /** Lookback window for candle fetch and for normalizing recency/duration in scoring. */
  lookbackDays: 14,
  /** OKX candle bar size. */
  candleBar: '1H',
  /** Score = touches * wTouches + recencyBonus * wRecency + durationBonus * wDuration. */
  scoreWeights: {
    touches: 10,
    recency: 5,
    duration: 3,
  },
} as const;

export type LevelsConfig = typeof LEVELS_CONFIG;
