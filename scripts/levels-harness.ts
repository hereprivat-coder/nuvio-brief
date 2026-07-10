import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fetchOkxCandles } from '../src/levels/okxCandles.js';
import { LEVELS_CONFIG } from '../src/levels/config.js';
import { detectLevels } from '../src/levels/detect.js';
import { renderLevelsChart } from '../src/levels/chart.js';
import { formatPrice } from '../src/levels/format.js';
import type { Level } from '../src/levels/types.js';

const INST_ID = 'BTC-USDT';
/** How many days back to replay the detector, to see example strings across several days. */
const SIM_OFFSETS_DAYS = [0, 1, 3, 7];

function printLevelsTable(levels: Level[]): void {
  const headers = ['Price', 'Touches', 'Age(d)', 'Recency(d)', 'Role', 'Strong', 'Score'];
  const rows = levels.map((l) => [
    formatPrice(l.price),
    String(l.touches),
    l.ageDays.toFixed(1),
    l.recencyDays.toFixed(1),
    l.role,
    l.strong ? 'yes' : 'no',
    l.score.toFixed(1),
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log(line(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

async function main(): Promise<void> {
  const windowSize = LEVELS_CONFIG.lookbackDays * 24;
  const maxOffsetDays = Math.max(...SIM_OFFSETS_DAYS);
  const totalNeeded = windowSize + maxOffsetDays * 24;

  console.log(`Fetching ${totalNeeded} candles (${INST_ID}, ${LEVELS_CONFIG.candleBar}) from OKX...`);
  const candles = await fetchOkxCandles(INST_ID, LEVELS_CONFIG.candleBar, totalNeeded);
  console.log(
    `Fetched ${candles.length}/${totalNeeded} candles: ` +
      `${new Date(candles[0]?.ts ?? 0).toISOString()} -> ${new Date(candles[candles.length - 1]?.ts ?? 0).toISOString()}`,
  );

  if (candles.length < totalNeeded) {
    console.error('Not enough candles fetched — aborting.');
    process.exit(1);
  }

  for (const offsetDays of SIM_OFFSETS_DAYS) {
    const sliceEnd = candles.length - offsetDays * 24;
    const sliceStart = sliceEnd - windowSize;
    const slice = candles.slice(sliceStart, sliceEnd);
    const result = detectLevels(slice, LEVELS_CONFIG);

    console.log(`\n${'='.repeat(78)}`);
    console.log(
      `Simulated "now": ${new Date(result.asOfTs).toISOString()} (offset ${offsetDays}d) — price ${formatPrice(result.currentPrice)}`,
    );
    console.log('='.repeat(78));

    if (result.allLevels.length === 0) {
      console.log('(no levels found)');
    } else {
      printLevelsTable(result.allLevels);
    }

    console.log(`\nStory [${result.story.kind}]: ${result.story.text}`);

    if (offsetDays === 0) {
      const outDir = path.resolve('out');
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, 'levels-btc-today.png');
      await renderLevelsChart(slice, result, outPath);
      console.log(`\nChart written to ${outPath}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
