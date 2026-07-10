import { config } from '../config.js';

export async function sendTelegramMessage(text: string): Promise<void> {
  if (config.dryRun) {
    console.log('--- DRY RUN: message that would be sent ---');
    console.log(text);
    console.log('--- end of message ---');
    return;
  }

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChannelId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}
