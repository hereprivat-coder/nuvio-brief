import { LEVELS_CONFIG } from '../../levels/config.js';
import { detectLevels } from '../../levels/detect.js';
import { fetchOkxCandles } from '../../levels/okxCandles.js';
import { loadAnnouncedBreakouts, markBreakoutAnnounced } from '../../levels/breakoutState.js';
import type { DetectionResult } from '../../levels/types.js';

/** Production dedup state for the levels breakout branch — distinct from the
 * harness's scratch out/ path. Must be committed back to the repo by CI
 * (spec §5) or the dedup resets every run and the same break gets re-announced
 * daily. src/levels/ itself is untouched — this only calls its public API. */
export const LEVEL_BREAKOUT_STATE_PATH = 'state/pulse_levels_announced_breakouts.json';

/** Step: Block 3 — reuses the sealed src/levels/ detector as-is, no logic
 * changes. BTC only, per spec §5. Null on any failure (short history, OKX
 * down) — caller drops the whole block, the rest of the post still goes out. */
export async function buildLevelOfDay(): Promise<DetectionResult | null> {
  try {
    const totalNeeded = LEVELS_CONFIG.lookbackDays * 24;
    const candles = await fetchOkxCandles('BTC-USDT', LEVELS_CONFIG.candleBar, totalNeeded);
    if (candles.length < totalNeeded) return null;

    const announced = loadAnnouncedBreakouts(
      LEVEL_BREAKOUT_STATE_PATH,
      Date.now(),
      LEVELS_CONFIG.breakoutAnnouncedRetentionDays,
    );

    return detectLevels(candles, LEVELS_CONFIG, announced);
  } catch {
    return null;
  }
}

/** Call ONLY after the post actually sent successfully — marking a breakout
 * announced before the send is confirmed risks permanently losing it if the
 * send then fails (next day's dedup would wrongly skip it). Mirrors how the
 * newbie brief only calls markSentToday post-send. */
export function markLevelBreakoutAnnounced(result: DetectionResult): void {
  if (!result.breakout) return;
  markBreakoutAnnounced(
    LEVEL_BREAKOUT_STATE_PATH,
    result.breakout.key,
    result.breakout.brokenAtTs,
    Date.now(),
    LEVELS_CONFIG.breakoutAnnouncedRetentionDays,
  );
}
