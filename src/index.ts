import { config, validateConfig } from './config.js';
import { getMoscowHumanDate, getMoscowIsoDate } from './utils/date.js';
import { get24hChange } from './services/okx.js';
import { fetchFearGreedIndex } from './services/alternativeMe.js';
import { hasSentToday, markSentToday } from './services/idempotency.js';
import { sendTelegramMessage } from './services/telegram.js';
import { getPulseLine } from './blocks/pulse.js';
import { getFearGreedBandName, getFearGreedLine } from './blocks/fearGreed.js';
import { selectEvent } from './blocks/eventSelection.js';
import { getNightEventText } from './blocks/nightEvent.js';
import { getAdviceOfDay } from './blocks/advice.js';
import { getFooterText, shouldShowFooter } from './blocks/footer.js';

async function main(): Promise<void> {
  validateConfig();

  const now = new Date();
  const isoDate = getMoscowIsoDate(now);
  const humanDate = getMoscowHumanDate(now);

  if (hasSentToday(isoDate)) {
    console.log(`Brief already sent for ${isoDate}, skipping (idempotency guard).`);
    return;
  }

  // Step 1-2: price → Block 1 pulse (BTC drives it, ETH only feeds event selection).
  const [btcChange, ethChange, fearGreedValue] = await Promise.all([
    get24hChange('BTC-USDT'),
    get24hChange('ETH-USDT'),
    fetchFearGreedIndex(),
  ]);

  const pulseLine = getPulseLine(btcChange);

  // Step 4-5: pick the event of the night, then let Groq humanize it (with fallback).
  const eventLine = selectEvent(btcChange, ethChange);
  const nightEventText = await getNightEventText(eventLine);

  // Step 6: advice bank stub.
  const adviceText = getAdviceOfDay(isoDate);

  // Step 7: footer schedule.
  const showFooter = shouldShowFooter(isoDate);

  // Step 8: assemble the fixed template. Block 2 is omitted entirely if F&G is unavailable.
  const lines: string[] = [
    `☕ Утренний Nuvio — ${humanDate}, 10:00`,
    '',
    `📊 Рынок: ${pulseLine}`,
    '',
  ];

  if (fearGreedValue !== null) {
    const bandName = getFearGreedBandName(fearGreedValue);
    const fgLine = getFearGreedLine(fearGreedValue);
    lines.push(`🧭 Настроение: ${bandName} ${fearGreedValue}. ${fgLine}`, '');
  }

  lines.push(`🌙 За ночь: ${nightEventText}`, '', `🛡 Совет дня: ${adviceText}`);

  if (showFooter) {
    lines.push('', getFooterText(config.refLink));
  }

  const message = lines.join('\n');

  // Step 9-10: send — this must never be skipped, whatever happened upstream.
  await sendTelegramMessage(message);
  if (!config.dryRun) markSentToday(isoDate);
  console.log(`Brief sent for ${isoDate}.`);
}

main().catch((err) => {
  console.error('Fatal error while sending the daily brief:', err);
  process.exitCode = 1;
});
