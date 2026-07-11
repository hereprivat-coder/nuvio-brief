/** Secrets/environment for Nuvio Pulse — deliberately separate names from the
 * newbie brief's src/config.ts (spec §0: separate bot, separate everything). */
export const pulseEnv = {
  telegramBotToken: process.env.PULSE_TELEGRAM_BOT_TOKEN ?? '',
  telegramChannelId: process.env.PULSE_TELEGRAM_CHANNEL_ID ?? '',
  swapLink: process.env.PULSE_SWAP_LINK || '[ссылка]',
  dryRun: process.env.DRY_RUN === '1',
};

export function validatePulseEnv(): void {
  if (pulseEnv.dryRun) return;

  const missing: string[] = [];
  if (!pulseEnv.telegramBotToken) missing.push('PULSE_TELEGRAM_BOT_TOKEN');
  if (!pulseEnv.telegramChannelId) missing.push('PULSE_TELEGRAM_CHANNEL_ID');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
