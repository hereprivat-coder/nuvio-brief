import type { BreakoutEvent, Level, LevelStory } from './types.js';
import type { LevelsConfig } from './config.js';
import { formatBreakoutLine, formatFallbackLine, formatTestingLine } from './format.js';

function closeness(distancePct: number, relevancePct: number): number {
  return Math.max(0, Math.min(1, 1 - distancePct / relevancePct));
}

/** Ranks levels within the relevance window by score * closeness-to-price. */
export function rankRelevantLevels(allLevels: Level[], config: LevelsConfig): Level[] {
  return allLevels
    .filter((level) => level.distancePct <= config.relevancePct)
    .sort((a, b) => b.score * closeness(b.distancePct, config.relevancePct) - a.score * closeness(a.distancePct, config.relevancePct));
}

/** Step 5-6 — pick the single story for the brief. Priority, matching spec §output:
 * 1) a fresh breakout (checked across ALL valid levels, not just the relevance window
 *    — a level can be broken and price can move past the relevance band on the very
 *    same candle, and that's still the headline);
 * 2) a relevant level currently being tested (within testingNow), highest score wins;
 * 3) fallback — nearest valid level anywhere, flagged as "free space". */
export function selectStory(
  allLevels: Level[],
  relevantLevels: Level[],
  breakout: BreakoutEvent | null,
  currentPrice: number,
  config: LevelsConfig,
): LevelStory {
  if (breakout) {
    return { kind: 'breakout', text: formatBreakoutLine(breakout), breakout, level: breakout.level };
  }

  const testing = relevantLevels.filter((level) => level.distancePct <= config.testingNowPct);
  if (testing.length > 0) {
    const best = testing[0];
    return { kind: 'testing', text: formatTestingLine(best), level: best };
  }

  if (allLevels.length === 0) {
    return { kind: 'fallback', text: formatFallbackLine(null, null) };
  }

  const nearest = [...allLevels].sort((a, b) => a.distancePct - b.distancePct)[0];
  const direction = nearest.price < currentPrice ? 'below' : 'above';
  return { kind: 'fallback', text: formatFallbackLine(nearest, direction), level: nearest, nearestDirection: direction };
}
