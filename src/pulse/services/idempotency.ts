import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Own state file — deliberately not shared with services/idempotency.ts
 * (spec §0: "отдельная идемпотентность, отдельный state"). */
const STATE_PATH = join(process.cwd(), 'state', 'pulse_last_sent_date.txt');

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
