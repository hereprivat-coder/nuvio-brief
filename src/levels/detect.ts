import type { Candle, DetectionResult, Level } from './types.js';
import { LEVELS_CONFIG, type LevelsConfig } from './config.js';
import { findPivots } from './pivots.js';
import { clusterPivots, type PivotCluster } from './cluster.js';
import { buildLevel } from './score.js';
import { detectBreakout } from './breakout.js';
import { rankRelevantLevels, selectStory } from './select.js';

function nearestByPrice(clusters: PivotCluster[], currentPrice: number, side: 'above' | 'below'): PivotCluster | null {
  const candidates =
    side === 'above' ? clusters.filter((c) => c.price > currentPrice) : clusters.filter((c) => c.price < currentPrice);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (Math.abs(b.price - currentPrice) < Math.abs(a.price - currentPrice) ? b : a));
}

/** Entry point — steps 1-6 of the spec wired together. Pure function of the
 * candle series (ascending by ts); no I/O, no AI. `asOfTs`/`currentPrice`
 * default to the last candle's timestamp/close so callers can also replay
 * history by passing a truncated candle array.
 *
 * `alreadyAnnouncedBreakouts` is an injected set of breakout dedup keys (see
 * breakout.ts) — pure function, so persistence itself is the caller's job. */
export function detectLevels(
  candles: Candle[],
  config: LevelsConfig = LEVELS_CONFIG,
  alreadyAnnouncedBreakouts: ReadonlySet<string> = new Set(),
): DetectionResult {
  if (candles.length === 0) {
    throw new Error('detectLevels: candles array is empty');
  }

  const last = candles[candles.length - 1];
  const currentPrice = last.close;
  const asOfTs = last.ts;

  const pivots = findPivots(candles, config.pivotStrength);
  const clusters = clusterPivots(pivots, config.clusterTolPct);

  const strictClusters = clusters.filter((c) => c.touches.length >= config.minTouches);
  const strictLevels = strictClusters.map((c) => buildLevel(c, asOfTs, currentPrice, config, false));

  // Bracket exception: never let the strict 3+ filter leave a side of price
  // with nothing at all — fall back to the loose (2+) threshold just for the
  // nearest level on that side, flagged tentative.
  const looseClusters = clusters.filter((c) => c.touches.length >= config.bracketMinTouches);
  const bracketLevels: Level[] = [];

  if (!strictLevels.some((l) => l.price > currentPrice)) {
    const nearestAbove = nearestByPrice(looseClusters, currentPrice, 'above');
    if (nearestAbove) bracketLevels.push(buildLevel(nearestAbove, asOfTs, currentPrice, config, true));
  }
  if (!strictLevels.some((l) => l.price < currentPrice)) {
    const nearestBelow = nearestByPrice(looseClusters, currentPrice, 'below');
    if (nearestBelow) bracketLevels.push(buildLevel(nearestBelow, asOfTs, currentPrice, config, true));
  }

  const allLevels = [...strictLevels, ...bracketLevels].sort((a, b) => a.price - b.price);

  const relevantLevels = rankRelevantLevels(allLevels, config);
  const breakout = detectBreakout(allLevels, candles, config, alreadyAnnouncedBreakouts);
  const story = selectStory(allLevels, relevantLevels, breakout, currentPrice, config);

  return { currentPrice, asOfTs, allLevels, relevantLevels, breakout, story };
}
