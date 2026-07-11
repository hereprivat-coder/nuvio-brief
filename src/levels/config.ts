/** Tunable knobs for the support/resistance detector (spec: smart-brief levels module). */
export const LEVELS_CONFIG = {
  /** Candles required on each side of a pivot candidate. */
  pivotStrength: 3,
  /** Pivots within this % of each other's cluster mean merge into one level. */
  clusterTolPct: 0.006,
  /** Minimum touches for a cluster to count as a level at all; 3+ is "strong".
   * The nearest level above and below price are exempt from this floor (see
   * bracketMinTouches) — a lone 2-touch level right next to price still gets
   * shown, flagged tentative, rather than silently dropped. */
  minTouches: 3,
  /** Floor for the always-shown bracket (nearest level above price, nearest
   * below) when the strict minTouches bar would otherwise leave one side of
   * price with nothing to show. Below this, a pivot cluster is noise, not a
   * tentative level. */
  bracketMinTouches: 2,
  /** Levels farther than this from current price are ignored. */
  relevancePct: 0.04,
  /** Price within this % of a level counts as "testing it now". */
  testingNowPct: 0.005,
  /** Close beyond a level by this margin counts as a break. */
  breakMarginPct: 0.003,
  /** How many recent confirmed candles to scan for a breakout — matches the
   * daily check cadence (~24 hourly candles), not just the last 2, or a break
   * that happened mid-day gets silently missed by the next day's check. */
  breakoutLookbackCandles: 24,
  /** A crossing only counts once this many SUBSEQUENT confirmed candles also
   * stayed beyond the level — filters same-hour whipsaw reversals. Costs
   * nothing at daily cadence since we're not reporting sub-day anyway. */
  breakoutConfirmCandles: 2,
  /** How long to keep a breakout's dedup key around before it can be pruned
   * from the persisted "already announced" set. */
  breakoutAnnouncedRetentionDays: 30,
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
