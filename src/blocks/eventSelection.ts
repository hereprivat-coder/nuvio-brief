import type { SymbolChange } from '../types.js';

/** % move threshold above which a price move counts as "the event of the night".
 * A tunable knob (see spec §6) — raise it if price events fire too often. */
const EVENT_PRICE_THRESHOLD = 2;

/** Step 6 — deterministic event selection. News is out of scope for this MVP
 * (see spec §12), so this only ever picks between "a coin moved" and "quiet night". */
export function selectEvent(btcChange: number | null, ethChange: number | null): string {
  const moves: SymbolChange[] = [];
  if (btcChange !== null) moves.push({ symbol: 'BTC', changePercent: btcChange });
  if (ethChange !== null) moves.push({ symbol: 'ETH', changePercent: ethChange });

  if (moves.length === 0) {
    return 'Ночь без значимых событий, изменения меньше 1%';
  }

  const mainMove = moves.reduce((biggest, current) =>
    Math.abs(current.changePercent) > Math.abs(biggest.changePercent) ? current : biggest,
  );

  if (Math.abs(mainMove.changePercent) >= EVENT_PRICE_THRESHOLD) {
    const sign = mainMove.changePercent >= 0 ? '+' : '';
    return `${mainMove.symbol} ${sign}${mainMove.changePercent.toFixed(1)}% за последние 24 часа`;
  }

  return `Ночь без значимых событий, изменения меньше ${EVENT_PRICE_THRESHOLD}%`;
}
