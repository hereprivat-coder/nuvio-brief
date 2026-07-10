import type { BreakoutEvent, Level, LevelStory } from './types.js';
import type { LevelsConfig } from './config.js';
import { formatBreakoutLine, formatCombinedTestingLine, formatFallbackLine, formatTestingLine } from './format.js';

function closeness(distancePct: number, relevancePct: number): number {
  return Math.max(0, Math.min(1, 1 - distancePct / relevancePct));
}

/** Ranks levels within the relevance window by score * closeness-to-price. */
export function rankRelevantLevels(allLevels: Level[], config: LevelsConfig): Level[] {
  return allLevels
    .filter((level) => level.distancePct <= config.relevancePct)
    .sort((a, b) => b.score * closeness(b.distancePct, config.relevancePct) - a.score * closeness(a.distancePct, config.relevancePct));
}

/** A level is strong enough to solo-headline only if it clears BOTH bars —
 * `strong` (raw touch count) alone lets a barely-3-touch level outrank a much
 * bigger structural one just because price happens to be sitting on it. */
function qualifiesToHeadline(level: Level, config: LevelsConfig): boolean {
  return level.strong && level.score >= config.testingHeadlineMinScore;
}

/** Step 5-6 — pick the single story for the brief. Priority, matching spec §output:
 * 1) a fresh breakout (checked across ALL valid levels, not just the relevance window
 *    — a level can be broken and price can move past the relevance band on the very
 *    same candle, and that's still the headline);
 * 2) a level currently being tested (within testingNow) — but ONLY headlined solo if
 *    it clears qualifiesToHeadline itself. A weak tested level next to a much
 *    stronger nearby level produces a combined "weak here, big one over there" line
 *    instead of burying the stronger level;
 * 3) no qualifying tested level → headline the dominant-by-score relevant level
 *    outright (this is a reuse of the "testing" copy for a level that may not be
 *    literally touched this instant — see report for the interpretation call);
 * 4) fallback — nearest valid level anywhere (or nothing at all), flagged as
 *    "free space". */
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

  const testingCandidates = relevantLevels.filter((level) => level.distancePct <= config.testingNowPct);
  const testedLevel = testingCandidates[0] ?? null;

  if (testedLevel && qualifiesToHeadline(testedLevel, config)) {
    return { kind: 'testing', text: formatTestingLine(testedLevel), level: testedLevel };
  }

  const dominant = relevantLevels[0] ?? null;

  if (dominant && qualifiesToHeadline(dominant, config)) {
    if (testedLevel && testedLevel.price !== dominant.price) {
      return {
        kind: 'combined',
        text: formatCombinedTestingLine(testedLevel, dominant, currentPrice),
        level: dominant,
        secondaryLevel: testedLevel,
      };
    }
    return { kind: 'testing', text: formatTestingLine(dominant), level: dominant };
  }

  if (allLevels.length === 0) {
    return { kind: 'fallback', text: formatFallbackLine(null, null) };
  }

  const nearest = [...allLevels].sort((a, b) => a.distancePct - b.distancePct)[0];
  const direction = nearest.price < currentPrice ? 'below' : 'above';
  return { kind: 'fallback', text: formatFallbackLine(nearest, direction), level: nearest, nearestDirection: direction };
}
