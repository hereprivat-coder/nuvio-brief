import type { PivotCluster } from './cluster.js';
import type { Level } from './types.js';
import type { LevelsConfig } from './config.js';
import { DAY_MS } from './time.js';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Step 3 — score a cluster: touches dominate (main signal), a recency bonus
 * rewards levels touched more recently, and a duration bonus rewards levels
 * respected across a wider stretch of the window (not just a tight cluster of
 * neighboring candles). Both bonuses are normalized against the lookback window
 * so they stay in [0, 1] and the formula stays simple to reason about. */
export function buildLevel(
  cluster: PivotCluster,
  nowTs: number,
  currentPrice: number,
  config: LevelsConfig,
): Level {
  const touchTimestamps = cluster.touches.map((t) => t.ts);
  const firstTouchTs = Math.min(...touchTimestamps);
  const lastTouchTs = Math.max(...touchTimestamps);

  const ageDays = (nowTs - firstTouchTs) / DAY_MS;
  const recencyDays = (nowTs - lastTouchTs) / DAY_MS;
  const spanDays = (lastTouchTs - firstTouchTs) / DAY_MS;

  const recencyBonus = clamp01(1 - recencyDays / config.lookbackDays);
  const durationBonus = clamp01(spanDays / config.lookbackDays);

  const { touches: wTouches, recency: wRecency, duration: wDuration } = config.scoreWeights;
  const score = cluster.touches.length * wTouches + recencyBonus * wRecency + durationBonus * wDuration;

  const distancePct = Math.abs(cluster.price - currentPrice) / currentPrice;

  return {
    price: cluster.price,
    touches: cluster.touches.length,
    strong: cluster.touches.length >= 3,
    firstTouchTs,
    lastTouchTs,
    ageDays,
    recencyDays,
    spanDays,
    score,
    role: cluster.price < currentPrice ? 'support' : 'resistance',
    distancePct,
  };
}
