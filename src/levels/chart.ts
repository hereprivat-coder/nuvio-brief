import sharp from 'sharp';
import type { Candle, DetectionResult, Level } from './types.js';

const WIDTH = 1400;
const HEIGHT = 800;
const MARGIN = { top: 46, right: 170, bottom: 50, left: 20 };

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders price + detected levels to a PNG buffer for a human to eyeball.
 * Highlights the level driving the current story (if any) in a distinct
 * color. Pure rendering, no analysis — takes whatever detectLevels() already
 * computed. */
export async function renderLevelsChartBuffer(candles: Candle[], result: DetectionResult): Promise<Buffer> {
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const closes = candles.map((c) => c.close);
  const levelPrices = result.allLevels.map((l) => l.price);
  const allPrices = [...closes, ...levelPrices];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const pad = (maxPrice - minPrice) * 0.05 || maxPrice * 0.01;
  const yMin = minPrice - pad;
  const yMax = maxPrice + pad;

  const xAt = (i: number) => MARGIN.left + (i / (candles.length - 1)) * plotW;
  const yAt = (price: number) => MARGIN.top + (1 - (price - yMin) / (yMax - yMin)) * plotH;

  const pricePath = candles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(c.close).toFixed(1)}`).join(' ');

  const highlightPrice = result.story.level?.price;
  const secondaryPrice = result.story.secondaryLevel?.price;

  const levelLines = result.allLevels
    .map((level: Level) => {
      const y = yAt(level.price).toFixed(1);
      const isHighlighted = highlightPrice !== undefined && Math.abs(level.price - highlightPrice) < 1e-9;
      const isSecondary = secondaryPrice !== undefined && Math.abs(level.price - secondaryPrice) < 1e-9;
      const baseColor = level.role === 'support' ? '#2e8b57' : '#a33';
      const color = isHighlighted ? '#e6551d' : isSecondary ? '#c98a1f' : level.tentative ? '#999' : baseColor;
      const strokeWidth = isHighlighted || isSecondary ? 2.5 : level.strong ? 1.6 : 1;
      const dash = isHighlighted || isSecondary ? '' : level.tentative ? 'stroke-dasharray="2,3"' : 'stroke-dasharray="6,4"';
      const marker = isHighlighted ? ' ★' : isSecondary ? ' •' : '';
      const tentativeTag = level.tentative ? ' ~tentative' : '';
      const label = `${Math.round(level.price)} (${level.touches}x)${tentativeTag}${marker}`;
      return (
        `<line x1="${MARGIN.left}" y1="${y}" x2="${MARGIN.left + plotW}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" ${dash}/>` +
        `<text x="${MARGIN.left + plotW + 8}" y="${Number(y) + 4}" font-size="13" fill="${color}" font-family="monospace">${escapeXml(label)}</text>`
      );
    })
    .join('\n');

  const dayTicks: string[] = [];
  let lastDay = '';
  for (let i = 0; i < candles.length; i++) {
    const day = new Date(candles[i].ts).toISOString().slice(5, 10);
    if (day !== lastDay) {
      lastDay = day;
      const x = xAt(i).toFixed(1);
      dayTicks.push(
        `<line x1="${x}" y1="${MARGIN.top}" x2="${x}" y2="${MARGIN.top + plotH}" stroke="#ddd" stroke-width="1"/>` +
          `<text x="${x}" y="${HEIGHT - MARGIN.bottom + 16}" font-size="11" fill="#666" font-family="monospace" text-anchor="middle">${day}</text>`,
      );
    }
  }

  const title = escapeXml(
    `BTC-USDT 1H — ${new Date(result.asOfTs).toISOString()} — price ${Math.round(result.currentPrice)} — story: ${result.story.kind}`,
  );

  const legend =
    'green/red dashed = support/resistance, thicker = strong (3+ touches), grey fine-dashed = tentative ' +
    '(bracket-only, <3 touches), orange solid + ★ = headline, amber solid + • = weak level being touched (combined)';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="white"/>
  <text x="${MARGIN.left}" y="18" font-size="14" fill="#222" font-family="monospace">${title}</text>
  <text x="${MARGIN.left}" y="34" font-size="11" fill="#666" font-family="monospace">${escapeXml(legend)}</text>
  ${dayTicks.join('\n')}
  ${levelLines}
  <path d="${pricePath}" fill="none" stroke="#1a56db" stroke-width="1.5"/>
  <rect x="${MARGIN.left}" y="${MARGIN.top}" width="${plotW}" height="${plotH}" fill="none" stroke="#ccc"/>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** File-writing wrapper around renderLevelsChartBuffer(), used by the manual
 * verification harness. */
export async function renderLevelsChart(candles: Candle[], result: DetectionResult, outPath: string): Promise<void> {
  const buffer = await renderLevelsChartBuffer(candles, result);
  await sharp(buffer).toFile(outPath);
}
