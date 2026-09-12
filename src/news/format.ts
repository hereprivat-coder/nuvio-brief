import type { RankedNews } from './types.js';

export function formatNewsMessage(ranked: RankedNews): string {
  const { item, translatedText } = ranked;
  const lines = ['📰 Новость', '', translatedText, '', `Источник: ${item.sourceName} — ${item.link}`];
  return lines.join('\n');
}
