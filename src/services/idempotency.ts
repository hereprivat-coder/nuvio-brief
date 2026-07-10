import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const STATE_PATH = join(process.cwd(), 'state', 'last_sent_date.txt');

/** True if a brief was already marked sent for this Moscow ISO date (YYYY-MM-DD). */
export function hasSentToday(isoDate: string): boolean {
  try {
    return readFileSync(STATE_PATH, 'utf-8').trim() === isoDate;
  } catch {
    return false;
  }
}

export function markSentToday(isoDate: string): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, isoDate, 'utf-8');
}
