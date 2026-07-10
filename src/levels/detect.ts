import type { Candle, DetectionResult } from './types.js';
import { LEVELS_CONFIG, type LevelsConfig } from './config.js';
import { findPivots } from './pivots.js';
import { clusterPivots } from './cluster.js';
import { buildLevel } from './score.js';
import { detectBreakout } from './breakout.js';
import { rankRelevantLevels, selectStory } from './select.js';

/** Entry point — steps 1-6 of the spec wired together. Pure function of the
 * candle series (ascending by ts); no I/O, no AI. `asOfTs`/`currentPrice`
 * default to the last candle's timestamp/close so callers can also replay
 * history by passing a truncated candle array. */
export function detectLevels(
  candles: Candle[],
  config: LevelsConfig = LEVELS_CONFIG,
): DetectionResult {
  if (candles.length === 0) {
    throw new Error('detectLevels: candles array is empty');
  }

  const last = candles[candles.length - 1];
  const currentPrice = last.close;
  const asOfTs = last.ts;

  const pivots = findPivots(candles, config.pivotStrength);
  const clusters = clusterPivots(pivots, config.clusterTolPct);

  const allLevels = clusters
    .filter((cluster) => cluster.touches.length >= config.minTouches)
    .map((cluster) => buildLevel(cluster, asOfTs, currentPrice, config))
    .sort((a, b) => a.price - b.price);

  const relevantLevels = rankRelevantLevels(allLevels, config);
  const breakout = detectBreakout(allLevels, candles, config);
  const story = selectStory(allLevels, relevantLevels, breakout, currentPrice, config);

  return { currentPrice, asOfTs, allLevels, relevantLevels, breakout, story };
}
