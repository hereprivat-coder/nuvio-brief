import { NEWS_CONFIG } from './config.js';
import type { NewsItem } from './types.js';

const LOWER_KEYWORDS = NEWS_CONFIG.keywords.map((k) => k.toLowerCase());

function isRelevant(item: NewsItem): boolean {
  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  return LOWER_KEYWORDS.some((kw) => haystack.includes(kw));
}

/** Coarse pass before any Groq call: drops items with no title/link, and
 * anything that matches none of the configured keywords. Load-bearing mostly
 * for the general (non-crypto-only) feeds like SEC/CBR. */
export function filterRelevant(items: NewsItem[]): NewsItem[] {
  return items.filter((item) => item.title && item.link && isRelevant(item));
}

/** Drops items already posted (by GUID) or announced this run (in-batch dup
 * from two feeds re-syndicating the same GUID). */
export function dropSeen(items: NewsItem[], seenGuids: ReadonlySet<string>): NewsItem[] {
  return items.filter((item) => !seenGuids.has(item.guid));
}
