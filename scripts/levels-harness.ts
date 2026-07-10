import { fetchOkxCandles } from '../src/levels/okxCandles.js';
import { LEVELS_CONFIG } from '../src/levels/config.js';

const totalNeeded = LEVELS_CONFIG.lookbackDays * 24;
const candles = await fetchOkxCandles('BTC-USDT', LEVELS_CONFIG.candleBar, totalNeeded);

console.log(`Fetched ${candles.length}/${totalNeeded} candles from OKX.`);
if (candles.length > 0) {
  console.log('First:', new Date(candles[0].ts).toISOString());
  console.log('Last:', new Date(candles[candles.length - 1].ts).toISOString());
}

if (candles.length < totalNeeded) {
  console.error('Not enough candles fetched — aborting.');
  process.exit(1);
}
