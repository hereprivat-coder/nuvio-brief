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

/** Sends a chart image as its own channel post, with an optional caption
 * (Telegram's sendPhoto caption cap is 1024 chars — callers must keep within
 * that themselves). Separate from sendPulseMessage() because Telegram's photo
 * upload is multipart, not JSON. */
export async function sendPulsePhoto(photo: Buffer, caption?: string): Promise<void> {
  if (pulseEnv.dryRun) {
    console.log(`--- DRY RUN: Pulse photo that would be sent (${photo.length} bytes) ---`);
    if (caption) console.log(caption);
    console.log('--- end of photo ---');
    return;
  }

  const url = `https://api.telegram.org/bot${pulseEnv.telegramBotToken}/sendPhoto`;
  const form = new FormData();
  form.set('chat_id', pulseEnv.telegramChannelId);
  if (caption) form.set('caption', caption);
  form.set('photo', new Blob([Uint8Array.from(photo)], { type: 'image/png' }), 'level-of-day.png');

  const res = await fetch(url, { method: 'POST', body: form });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendPhoto failed: ${res.status} ${body}`);
  }
}
