import type { Candle, PivotTouch } from './types.js';

/** Step 1 — pivot detection. A candle at index i is a pivot-high if its high is
 * strictly greater than all N candles on both sides, and a pivot-low if its low
 * is strictly less than all N candles on both sides. Edge candles that don't have
 * a full N-candle neighborhood on both sides can never qualify, by construction. */
export function findPivots(candles: Candle[], strength: number): PivotTouch[] {
  const pivots: PivotTouch[] = [];

  for (let i = strength; i < candles.length - strength; i++) {
    const candle = candles[i];

    let isHigh = true;
    let isLow = true;
    for (let k = 1; k <= strength; k++) {
      const left = candles[i - k];
      const right = candles[i + k];
      if (candle.high <= left.high || candle.high <= right.high) isHigh = false;
      if (candle.low >= left.low || candle.low >= right.low) isLow = false;
      if (!isHigh && !isLow) break;
    }

    if (isHigh) pivots.push({ ts: candle.ts, price: candle.high, kind: 'high' });
    if (isLow) pivots.push({ ts: candle.ts, price: candle.low, kind: 'low' });
  }

  return pivots;
}
