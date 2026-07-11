import { pulseEnv } from '../env.js';

/** Deliberately a separate module from src/services/telegram.ts — own bot
 * token, per spec §0 ("отдельный бот"). */
export async function sendPulseMessage(text: string): Promise<void> {
  if (pulseEnv.dryRun) {
    console.log('--- DRY RUN: Pulse message that would be sent ---');
    console.log(text);
    console.log('--- end of message ---');
    return;
  }

  const url = `https://api.telegram.org/bot${pulseEnv.telegramBotToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: pulseEnv.telegramChannelId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}
