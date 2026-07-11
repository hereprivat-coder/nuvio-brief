export interface Streak {
  length: number;
  direction: 'up' | 'down';
}

/** Consecutive green/red daily closes ending `excludeLast` candles before the
 * most recent one (0 = ending today, 1 = ending yesterday — lets Block 2's
 * reversal check ask "what was the streak as of yesterday"). Flat days (close
 * === open) break the streak rather than extending it either direction. */
export function computeStreak(closes: number[], opens: number[], excludeLast = 0): Streak | null {
  const n = closes.length - excludeLast;
  if (n < 1) return null;

  const dirAt = (i: number): 'up' | 'down' | null => {
    if (closes[i] > opens[i]) return 'up';
    if (closes[i] < opens[i]) return 'down';
    return null;
  };

  const lastDir = dirAt(n - 1);
  if (!lastDir) return null;

  let length = 1;
  for (let i = n - 2; i >= 0; i--) {
    if (dirAt(i) === lastDir) length++;
    else break;
  }

  return { length, direction: lastDir };
}
