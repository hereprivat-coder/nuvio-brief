import type { CoinDailySeries, SnapshotLine } from '../types.js';
import type { PulseConfig } from '../config.js';
import { computeStreak } from '../streak.js';
import { formatCoinPrice, formatPct, formatPctAbs } from '../format.js';

/** Step: Block 1 — one line per coin, price plus at least one context anchor
 * (24h+7d change always; streak and proximity-to-extreme only when notable
 * enough to clear their thresholds, so an ordinary day doesn't get cluttered
 * with every possible anchor). Coins with no data are silently dropped —
 * spec's per-coin fallback — not the whole block. */
export function buildSnapshotLines(seriesList: Array<CoinDailySeries | null>, config: PulseConfig): SnapshotLine[] {
  const lines: SnapshotLine[] = [];

  for (const series of seriesList) {
    if (!series) continue;

    const { coin, lastPrice, change24hPct, dailyCloses, dailyOpens, dailyHighs, dailyLows } = series;

    const idx7dAgo = dailyCloses.length - 1 - 7;
    const change7dPct = idx7dAgo >= 0 ? (lastPrice - dailyCloses[idx7dAgo]) / dailyCloses[idx7dAgo] : null;

    let line = `${coin.symbol} $${formatCoinPrice(lastPrice)} (${formatPct(change24hPct)} сут`;
    line += change7dPct !== null ? `, ${formatPct(change7dPct)} нед)` : ')';

    const extras: string[] = [];

    const streak = computeStreak(dailyCloses, dailyOpens);
    if (streak && streak.length >= config.streakMinToMention) {
      const word = streak.direction === 'up' ? 'зелёный' : 'красный';
      extras.push(`${streak.length}-й ${word} день подряд`);
    }

    const weeklyHighs = dailyHighs.slice(-7);
    const weeklyLows = dailyLows.slice(-7);
    if (weeklyHighs.length > 0 && weeklyLows.length > 0) {
      const weeklyHigh = Math.max(...weeklyHighs);
      const weeklyLow = Math.min(...weeklyLows);
      const distToHigh = (weeklyHigh - lastPrice) / weeklyHigh;
      const distToLow = (lastPrice - weeklyLow) / weeklyLow;

      if (distToHigh <= config.proximityToExtremePct && distToHigh <= distToLow) {
        extras.push(`в ${formatPctAbs(distToHigh)} от недельного хая`);
      } else if (distToLow <= config.proximityToExtremePct) {
        extras.push(`в ${formatPctAbs(distToLow)} от недельного лоу`);
      }
    }

    if (extras.length > 0) line += ` — ${extras.join(', ')}`;

    lines.push({ coin, text: line, change24hPct });
  }

  return lines;
}
