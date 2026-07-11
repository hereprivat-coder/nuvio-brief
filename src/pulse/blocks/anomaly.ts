import type { AnomalyResult, CoinDailySeries } from '../types.js';
import type { PulseConfig } from '../config.js';
import { computeStreak } from '../streak.js';
import { formatPct } from '../format.js';

function average(xs: number[]): number {
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const MULTIPLIER_WORDS: Record<number, string> = { 2: 'вдвое', 3: 'втрое', 4: 'вчетверо', 5: 'впятеро' };

function formatMultiplier(ratio: number): string {
  const rounded = Math.round(ratio);
  if (Math.abs(ratio - rounded) < 0.15 && MULTIPLIER_WORDS[rounded]) return MULTIPLIER_WORDS[rounded];
  return `в ${ratio.toFixed(1)} раза`;
}

function volumeRatio(series: CoinDailySeries): number | null {
  const vols = series.dailyVolUsd;
  if (vols.length < 8) return null;
  const today = vols[vols.length - 1];
  const priorAvg = average(vols.slice(-8, -1));
  return priorAvg > 0 ? today / priorAvg : null;
}

/** Detector 1 (highest priority) — a coin whose 24h move stands out from the
 * rest of the watchlist. If that same coin also shows an elevated volume,
 * that's mentioned as supporting color in the same line (not a second,
 * independently-triggered anomaly — still exactly one story). */
function detectPriceOutlier(seriesList: CoinDailySeries[], config: PulseConfig): AnomalyResult | null {
  if (seriesList.length < 2) return null;

  const med = median(seriesList.map((s) => Math.abs(s.change24hPct)));
  if (med === 0) return null;

  const best = seriesList.reduce((a, b) => (Math.abs(b.change24hPct) > Math.abs(a.change24hPct) ? b : a));
  const ratio = Math.abs(best.change24hPct) / med;
  if (ratio < config.anomalyOutlierRatio) return null;

  let text = `${best.coin.symbol} ${formatPct(best.change24hPct)} за сутки — ${formatMultiplier(ratio)} сильнее остального вотчлиста.`;

  const volRatio = volumeRatio(best);
  if (volRatio !== null && volRatio >= config.anomalyVolumeSpikeRatio) {
    text = text.replace(/\.$/, `, объём ${formatMultiplier(volRatio)} выше недельного среднего.`);
  }

  return { kind: 'outlier', coin: best.coin, text, strength: ratio };
}

/** Detector 2 — today's volume vs the trailing 7-day average, independent of
 * whether price moved much (a quiet-price, loud-volume day is its own story). */
function detectVolumeSpike(seriesList: CoinDailySeries[], config: PulseConfig): AnomalyResult | null {
  let best: AnomalyResult | null = null;

  for (const series of seriesList) {
    const ratio = volumeRatio(series);
    if (ratio === null || ratio < config.anomalyVolumeSpikeRatio) continue;
    if (!best || ratio > best.strength) {
      best = {
        kind: 'volume',
        coin: series.coin,
        strength: ratio,
        text: `Объём ${series.coin.symbol} за сутки ${formatMultiplier(ratio)} выше недельного среднего.`,
      };
    }
  }

  return best;
}

/** Detector 3 (lowest priority) — a coin breaks a multi-day streak. */
function detectReversal(seriesList: CoinDailySeries[], config: PulseConfig): AnomalyResult | null {
  let best: AnomalyResult | null = null;

  for (const series of seriesList) {
    const priorStreak = computeStreak(series.dailyCloses, series.dailyOpens, 1);
    if (!priorStreak || priorStreak.length < config.anomalyReversalMinStreak) continue;

    const n = series.dailyCloses.length;
    const todayDir =
      series.dailyCloses[n - 1] > series.dailyOpens[n - 1]
        ? 'up'
        : series.dailyCloses[n - 1] < series.dailyOpens[n - 1]
          ? 'down'
          : null;
    if (!todayDir || todayDir === priorStreak.direction) continue;

    if (!best || priorStreak.length > best.strength) {
      const priorWord = priorStreak.direction === 'up' ? 'роста' : 'падения';
      const nowWord = todayDir === 'up' ? 'отскочила вверх' : 'развернулась вниз';
      best = {
        kind: 'reversal',
        coin: series.coin,
        strength: priorStreak.length,
        text: `${series.coin.symbol} ${nowWord} после ${priorStreak.length} дней ${priorWord} подряд.`,
      };
    }
  }

  return best;
}

/** Step: Block 2 — exactly one anomaly, or silence. Priority per spec:
 * price outlier > volume spike > reversal. A quiet day (nothing clears any
 * threshold) is the expected common case, not a failure. */
export function detectAnomaly(seriesList: Array<CoinDailySeries | null>, config: PulseConfig): AnomalyResult | null {
  const valid = seriesList.filter((s): s is CoinDailySeries => s !== null);
  return detectPriceOutlier(valid, config) ?? detectVolumeSpike(valid, config) ?? detectReversal(valid, config);
}
