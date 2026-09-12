/** Secrets/environment for Nuvio News — own bot, same channel as Brief/Pulse
 * (per project decision: new bot token, shared channel ID with Pulse). */
export const newsEnv = {
  telegramBotToken: process.env.NEWS_TELEGRAM_BOT_TOKEN ?? '',
  telegramChannelId: process.env.NEWS_TELEGRAM_CHANNEL_ID ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  dryRun: process.env.DRY_RUN === '1',
};

export function validateNewsEnv(): void {
  if (newsEnv.dryRun) return;

  const missing: string[] = [];
  if (!newsEnv.telegramBotToken) missing.push('NEWS_TELEGRAM_BOT_TOKEN');
  if (!newsEnv.telegramChannelId) missing.push('NEWS_TELEGRAM_CHANNEL_ID');
  // Unlike Brief's Block 3, there is no neutral fallback here — ranking and
  // RU translation both require Groq, so a missing key must fail loudly
  // rather than silently posting raw English titles.
  if (!newsEnv.groqApiKey) missing.push('GROQ_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
