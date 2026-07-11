import type { DetectionResult } from '../../levels/types.js';
import { formatPrice } from '../../levels/format.js';

/** Step: Block 5 — MVP realization is just Block 3's immediate bracket
 * (nearest support below price, nearest resistance above), per spec §7.
 * Depends entirely on Block 3's result — null in, null out. */
export function buildFocusLine(result: DetectionResult | null): string | null {
  if (!result) return null;

  const below = [...result.allLevels].filter((l) => l.price < result.currentPrice).sort((a, b) => b.price - a.price)[0];
  const above = [...result.allLevels].filter((l) => l.price > result.currentPrice).sort((a, b) => a.price - b.price)[0];

  if (below && above) {
    return `Диапазон дня: ${formatPrice(below.price)} снизу, ${formatPrice(above.price)} сверху. Выход из него задаёт направление.`;
  }
  if (below) return `Ближайший ориентир снизу: ${formatPrice(below.price)}. Сверху пока чисто.`;
  if (above) return `Ближайший ориентир сверху: ${formatPrice(above.price)}. Снизу пока чисто.`;
  return null;
}
