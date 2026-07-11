import type { Candle, BreakoutEvent, Level } from './types.js';
import type { LevelsConfig } from './config.js';
import { DAY_MS } from './time.js';

function makeKey(level: Level, direction: 'up' | 'down', crossingTs: number): string {
  return `${Math.round(level.price)}_${direction}_${crossingTs}`;
}

/** Step 6 — fresh-breakout detection, tuned for a once-a-day check cadence:
 *
 * 1. Scans the last `breakoutLookbackCandles` CONFIRMED candles (not just the
 *    last 2) for a level crossing — otherwise a break that happens mid-day is
 *    stale by the time the next daily check runs and gets silently missed.
 * 2. A crossing only counts once `breakoutConfirmCandles` SUBSEQUENT candles
 *    also stayed beyond the level — filters same-hour whipsaw reversals
 *    (e.g. a break that un-breaks itself an hour later isn't a real story).
 * 3. `alreadyAnnounced` (caller-supplied, persisted externally — this stays a
 *    pure function) excludes breaks already reported, so the same event
 *    doesn't get re-announced every day it's still inside the lookback
 *    window. Among the rest, the freshest wins. */
export function detectBreakout(
  levels: Level[],
  candles: Candle[],
  config: LevelsConfig,
  alreadyAnnounced: ReadonlySet<string> = new Set(),
): BreakoutEvent | null {
  const confirmed = candles.filter((c) => c.confirmed);
  if (confirmed.length < 2) return null;

  const confirmWindow = config.breakoutConfirmCandles;
  const earliestIdx = Math.max(1, confirmed.length - config.breakoutLookbackCandles);
  const latestIdx = confirmed.length - 1 - confirmWindow;

  const candidates: BreakoutEvent[] = [];

  for (const level of levels) {
    const upThreshold = level.price * (1 + config.breakMarginPct);
    const downThreshold = level.price * (1 - config.breakMarginPct);

    for (let i = earliestIdx; i <= latestIdx; i++) {
      const prev = confirmed[i - 1];
      const cur = confirmed[i];

      let direction: 'up' | 'down' | null = null;
      if (prev.close <= level.price && cur.close > upThreshold) direction = 'up';
      else if (prev.close >= level.price && cur.close < downThreshold) direction = 'down';
      if (!direction) continue;

      const confirmSlice = confirmed.slice(i + 1, i + 1 + confirmWindow);
      if (confirmSlice.length < confirmWindow) continue; // not enough data yet to confirm — try again next check
      const stillBeyond = confirmSlice.every((c) => (direction === 'up' ? c.close > level.price : c.close < level.price));
      if (!stillBeyond) continue; // reverted within the confirmation window — whipsaw, not a real break

      const key = makeKey(level, direction, cur.ts);
      if (alreadyAnnounced.has(key)) continue;

      candidates.push({
        level,
        direction,
        brokenAtTs: cur.ts,
        ageAtBreakDays: (cur.ts - level.firstTouchTs) / DAY_MS,
        key,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Freshest crossing wins; ties broken by the more established level.
  candidates.sort((a, b) => b.brokenAtTs - a.brokenAtTs || b.level.score - a.level.score);
  return candidates[0];
}
