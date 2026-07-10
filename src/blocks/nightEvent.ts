import { callGroq } from '../services/groq.js';

const FALLBACK_TEXT = 'Спокойная ночь, важных событий нет. Просто наблюдай.';

const BANNED_SUBSTRINGS = [
  'фандинг',
  'открытый интерес',
  ' oi ',
  'ликвидаци',
  'деривативы',
  'шорт',
  'лонг',
  'плечо',
  'поддержк',
  'сопротивлен',
  'волатильност',
  'покупай',
  'продавай',
  'заходи',
  'фиксируй',
];

function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches) return matches.length;
  return text.trim().length > 0 ? 1 : 0;
}

function isValidOutput(text: string): boolean {
  if (countSentences(text) !== 2) return false;
  const lower = ` ${text.toLowerCase()} `;
  return !BANNED_SUBSTRINGS.some((word) => lower.includes(word));
}

/** Block 3 — event of the night, humanized by Groq. Falls back to a canned
 * neutral line if Groq is unavailable, times out, or returns invalid output
 * (spec §7: the 10:00 send must never be blocked by this step). */
export async function getNightEventText(eventLine: string): Promise<string> {
  const result = await callGroq(eventLine);
  if (!result) return FALLBACK_TEXT;

  const cleaned = result.trim();
  return isValidOutput(cleaned) ? cleaned : FALLBACK_TEXT;
}
