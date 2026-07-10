export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  refLink: process.env.REF_LINK || '[ссылка]',
  dryRun: process.env.DRY_RUN === '1',
};

export function validateConfig(): void {
  if (config.dryRun) return;

  const missing: string[] = [];
  if (!config.telegramBotToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!config.telegramChannelId) missing.push('TELEGRAM_CHANNEL_ID');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
