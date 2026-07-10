import type { Candle, BreakoutEvent, Level } from './types.js';
import type { LevelsConfig } from './config.js';
import { DAY_MS } from './time.js';

/** Step 6 — fresh-breakout detection. Only looks at the transition between the
 * last two CONFIRMED (closed) candles, so a break is only reported once its
 * candle has actually closed beyond the level — avoids flip-flopping on an
 * in-progress candle. "Fresh" means the crossing happened on that very candle:
 * the prior close was still on the old side of the level. */
export function detectBreakout(
  levels: Level[],
  candles: Candle[],
  config: LevelsConfig,
): BreakoutEvent | null {
  const confirmed = candles.filter((c) => c.confirmed);
  if (confirmed.length < 2) return null;

  const last = confirmed[confirmed.length - 1];
  const prev = confirmed[confirmed.length - 2];

  const candidates: BreakoutEvent[] = [];

  for (const level of levels) {
    const upThreshold = level.price * (1 + config.breakMarginPct);
    if (prev.close <= level.price && last.close > upThreshold) {
      candidates.push({
        level,
        direction: 'up',
        brokenAtTs: last.ts,
        ageAtBreakDays: (last.ts - level.firstTouchTs) / DAY_MS,
      });
    }

    const downThreshold = level.price * (1 - config.breakMarginPct);
    if (prev.close >= level.price && last.close < downThreshold) {
      candidates.push({
        level,
        direction: 'down',
        brokenAtTs: last.ts,
        ageAtBreakDays: (last.ts - level.firstTouchTs) / DAY_MS,
      });
    }
  }

  if (candidates.length === 0) return null;

  // If more than one level broke on the same candle, the most long-held one is the story.
  candidates.sort((a, b) => b.level.score - a.level.score);
  return candidates[0];
}
