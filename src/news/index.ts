import { newsEnv, validateNewsEnv } from './env.js';
import { NEWS_CONFIG } from './config.js';
import { getMoscowIsoDate } from '../utils/date.js';
import { fetchAllFeeds } from './services/fetchFeeds.js';
import { sendNewsMessage } from './services/telegram.js';
import {
  loadSeenGuids,
  saveSeenGuids,
  getDailyCount,
  incrementDailyCount,
} from './services/idempotency.js';
import { filterRelevant, dropSeen } from './filter.js';
import { rankAndTranslate } from './rank.js';
import { formatNewsMessage } from './format.js';

async function main(): Promise<void> {
  validateNewsEnv();

  const isoDate = getMoscowIsoDate();

  const postedToday = getDailyCount(isoDate);
  if (postedToday >= NEWS_CONFIG.maxPostsPerDay) {
    console.log(`Daily cap reached (${postedToday}/${NEWS_CONFIG.maxPostsPerDay}), skipping.`);
    return;
  }

  const allItems = await fetchAllFeeds();
  const seenGuids = loadSeenGuids();
  const candidates = dropSeen(filterRelevant(allItems), seenGuids);

  if (candidates.length === 0) {
    console.log('No new relevant items this window, skipping.');
    return;
  }

  const ranked = await rankAndTranslate(candidates);
  if (!ranked) {
    console.log('Groq found nothing important enough to post this window, skipping.');
    return;
  }

  const message = formatNewsMessage(ranked);
  await sendNewsMessage(message);

  if (!newsEnv.dryRun) {
    // Marking every fetched candidate as seen (not just the posted one) avoids
    // re-offering the same skipped-as-unimportant items to Groq every 3 hours.
    for (const item of candidates) seenGuids.add(item.guid);
    saveSeenGuids(seenGuids);
    incrementDailyCount(isoDate);
  }

  console.log(`News sent for ${isoDate}: ${ranked.item.title}`);
}

main().catch((err) => {
  console.error('Fatal error while sending Nuvio News:', err);
  process.exitCode = 1;
});
