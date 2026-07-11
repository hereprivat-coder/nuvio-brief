import { pulseEnv, validatePulseEnv } from './env.js';
import { PULSE_CONFIG, WATCHLIST } from './config.js';
import { getMoscowHumanDate, getMoscowIsoDate } from '../utils/date.js';
import { fetchCoinSeries } from './services/coinData.js';
import { sendPulseMessage } from './services/telegram.js';
import { hasSentToday, markSentToday } from './services/idempotency.js';
import { buildSnapshotLines } from './blocks/snapshot.js';
import { detectAnomaly } from './blocks/anomaly.js';
import { buildLevelOfDay, markLevelBreakoutAnnounced } from './blocks/levelOfDay.js';
import { buildDerivativesLine } from './blocks/derivatives.js';
import { buildFocusLine } from './blocks/focus.js';
import { getFooterText, shouldShowFooter } from './blocks/footer.js';

async function main(): Promise<void> {
  validatePulseEnv();

  const now = new Date();
  const isoDate = getMoscowIsoDate(now);
  const humanDate = getMoscowHumanDate(now);

  if (hasSentToday(isoDate)) {
    console.log(`Pulse already sent for ${isoDate}, skipping (idempotency guard).`);
    return;
  }

  // Shared fetch for Blocks 1, 2 and 4's OI-direction context.
  const seriesList = await Promise.all(
    WATCHLIST.map((coin) => fetchCoinSeries(coin, PULSE_CONFIG.dailyBar, PULSE_CONFIG.snapshotLookbackDays)),
  );

  const snapshotLines = buildSnapshotLines(seriesList, PULSE_CONFIG);
  const anomaly = detectAnomaly(seriesList, PULSE_CONFIG);
  const levelResult = await buildLevelOfDay();
  const derivativesLine = await buildDerivativesLine(WATCHLIST, seriesList, PULSE_CONFIG);
  const focusLine = buildFocusLine(levelResult);
  const showFooter = shouldShowFooter(isoDate, PULSE_CONFIG);

  const nothingAtAll =
    snapshotLines.length === 0 && !anomaly && !levelResult && !derivativesLine && !focusLine;

  if (nothingAtAll) {
    console.error('All Pulse blocks failed (OKX unreachable?) — skipping send, not posting an empty shell.');
    process.exitCode = 1;
    return;
  }

  const lines: string[] = [`📟 Nuvio Pulse — ${humanDate}, 09:00`, ''];

  if (snapshotLines.length > 0) {
    lines.push('📊 Снимок:', ...snapshotLines.map((l) => l.text), '');
  }

  if (anomaly) {
    lines.push(`⚡ Аномалия: ${anomaly.text}`, '');
  }

  if (levelResult) {
    lines.push(`📍 Уровень дня: ${levelResult.story.text}`, '');
  }

  if (derivativesLine) {
    lines.push(`🔥 Деривативы: ${derivativesLine}`, '');
  }

  if (focusLine) {
    lines.push(`🎯 Фокус: ${focusLine}`, '');
  }

  if (showFooter) {
    lines.push(getFooterText(pulseEnv.swapLink));
  }

  // Trim a trailing blank line left by the last included block.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const message = lines.join('\n');

  await sendPulseMessage(message);
  if (!pulseEnv.dryRun) {
    markSentToday(isoDate);
    if (levelResult) markLevelBreakoutAnnounced(levelResult);
  }
  console.log(`Pulse sent for ${isoDate}.`);
}

main().catch((err) => {
  console.error('Fatal error while sending Nuvio Pulse:', err);
  process.exitCode = 1;
});
