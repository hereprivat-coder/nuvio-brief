import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NEWS_CONFIG } from '../config.js';

/** Own state, separate from Brief/Pulse's idempotency files. */
const SEEN_GUIDS_PATH = join(process.cwd(), 'state', 'news_seen_guids.json');
const DAILY_COUNT_PATH = join(process.cwd(), 'state', 'news_daily_count.json');

interface DailyCount {
  date: string;
  count: number;
}

export function loadSeenGuids(): Set<string> {
  try {
    const raw = JSON.parse(readFileSync(SEEN_GUIDS_PATH, 'utf-8')) as string[];
    return new Set(raw);
  } catch {
    return new Set();
  }
}

/** Persists the GUID set, keeping only the most recently-added entries —
 * Set preserves insertion order, so the tail is the newest. */
export function saveSeenGuids(guids: Set<string>): void {
  mkdirSync(dirname(SEEN_GUIDS_PATH), { recursive: true });
  const trimmed = Array.from(guids).slice(-NEWS_CONFIG.seenGuidsCapacity);
  writeFileSync(SEEN_GUIDS_PATH, JSON.stringify(trimmed), 'utf-8');
}

export function getDailyCount(isoDate: string): number {
  try {
    const data = JSON.parse(readFileSync(DAILY_COUNT_PATH, 'utf-8')) as DailyCount;
    return data.date === isoDate ? data.count : 0;
  } catch {
    return 0;
  }
}

export function incrementDailyCount(isoDate: string): void {
  const count = getDailyCount(isoDate) + 1;
  mkdirSync(dirname(DAILY_COUNT_PATH), { recursive: true });
  writeFileSync(DAILY_COUNT_PATH, JSON.stringify({ date: isoDate, count } satisfies DailyCount), 'utf-8');
}
