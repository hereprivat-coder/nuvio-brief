import { newsEnv } from '../env.js';

/** Own bot/module, mirroring src/pulse/services/telegram.ts — separate token
 * from Brief and Pulse, but posts into the same channel as Pulse. */
export async function sendNewsMessage(text: string): Promise<void> {
  if (newsEnv.dryRun) {
    console.log('--- DRY RUN: News message that would be sent ---');
    console.log(text);
    console.log('--- end of message ---');
    return;
  }

  const url = `https://api.telegram.org/bot${newsEnv.telegramBotToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: newsEnv.telegramChannelId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}
