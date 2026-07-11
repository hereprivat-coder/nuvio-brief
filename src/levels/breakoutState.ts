import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DAY_MS } from './time.js';

interface AnnouncedEntry {
  key: string;
  brokenAtTs: number;
}

/** Persists which breakout keys (see breakout.ts) have already been announced,
 * so a break found within the lookback window on consecutive daily checks only
 * gets reported once. Same mechanics as services/idempotency.ts for the newbie
 * brief, generalized to a pruned set instead of a single last-sent-date. Kept
 * out of detect.ts/breakout.ts on purpose — those stay pure functions; this is
 * the only place in src/levels/ that touches disk. */
export function loadAnnouncedBreakouts(statePath: string, nowTs: number, retentionDays: number): Set<string> {
  let entries: AnnouncedEntry[];
  try {
    entries = JSON.parse(readFileSync(statePath, 'utf-8')) as AnnouncedEntry[];
  } catch {
    return new Set();
  }
  const cutoff = nowTs - retentionDays * DAY_MS;
  return new Set(entries.filter((e) => e.brokenAtTs >= cutoff).map((e) => e.key));
}

export function markBreakoutAnnounced(
  statePath: string,
  key: string,
  brokenAtTs: number,
  nowTs: number,
  retentionDays: number,
): void {
  let entries: AnnouncedEntry[];
  try {
    entries = JSON.parse(readFileSync(statePath, 'utf-8')) as AnnouncedEntry[];
  } catch {
    entries = [];
  }

  const cutoff = nowTs - retentionDays * DAY_MS;
  const pruned = entries.filter((e) => e.brokenAtTs >= cutoff);
  if (!pruned.some((e) => e.key === key)) {
    pruned.push({ key, brokenAtTs });
  }

  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(pruned), 'utf-8');
}
