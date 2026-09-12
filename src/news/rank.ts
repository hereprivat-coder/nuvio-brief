import { newsEnv } from './env.js';
import type { NewsItem, RankedNews } from './types.js';

/** Max candidates sent to Groq per run — keeps the prompt small even if a
 * 3-hour window produced an unusually large batch. */
const MAX_CANDIDATES = 20;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) if (setB.has(word)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
}

/** Collapses near-identical headlines re-syndicated across sources into one
 * representative — the highest-weight source, ties broken by newest. Plain
 * string equality would miss "SEC sues X" vs "SEC files suit against X". */
function dedupSimilarTitles(items: NewsItem[]): NewsItem[] {
  const kept: NewsItem[] = [];
  const normalized = items.map((item) => normalizeTitle(item.title));

  for (let i = 0; i < items.length; i++) {
    const dupIndex = kept.findIndex((k) => jaccardSimilarity(normalized[i]!, normalizeTitle(k.title)) >= 0.6);
    if (dupIndex === -1) {
      kept.push(items[i]!);
      continue;
    }
    const existing = kept[dupIndex]!;
    const candidate = items[i]!;
    const candidateIsBetter =
      candidate.weight > existing.weight ||
      (candidate.weight === existing.weight &&
        (candidate.pubDate?.getTime() ?? 0) > (existing.pubDate?.getTime() ?? 0));
    if (candidateIsBetter) kept[dupIndex] = candidate;
  }

  return kept;
}

interface GroqSelection {
  selected_index: number | null;
  translated: string | null;
}

function parseGroqJson(content: string): GroqSelection | null {
  // Models occasionally wrap JSON in ```json fences despite instructions not to.
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Partial<GroqSelection>;
    if (typeof parsed.selected_index !== 'number' && parsed.selected_index !== null) return null;
    return {
      selected_index: parsed.selected_index ?? null,
      translated: typeof parsed.translated === 'string' ? parsed.translated : null,
    };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `Ты — редактор новостного крипто-канала для русскоязычной аудитории
(смесь новичков и опытных трейдеров). Тебе дают список заголовков новостей за
последние несколько часов, каждый с индексом, источником и кратким описанием.

Твоя задача:
1) Оценить, есть ли среди них хотя бы ОДНА новость, которая реально важна для
   крипторынка: регуляторные решения (SEC, ЦБ и т.п.), взломы/эксплойты бирж
   или протоколов, крупные листинги/делистинги, банкротства, макрособытия с
   прямым влиянием на крипторынок, значимые технические апгрейды сети.
2) Игнорировать рутину: обзоры цен без повода, мнения аналитиков, рекламу,
   мелкие партнёрства, повторяющиеся темы без нового факта.
3) Если ничего действительно важного нет — так и сказать.
4) Если важная новость есть — выбрать САМУЮ важную одну (не несколько) и
   написать её суть по-русски: 2-4 коротких предложения, только факты из
   входных данных, без домыслов и без торговых советов.

Ответ — СТРОГО один JSON-объект, без markdown и пояснений вокруг:
{"selected_index": <номер элемента или null>, "translated": "<текст на русском или null>"}`;

/** Sends deduped candidates to Groq for importance ranking + RU translation
 * in one call. Returns null when there's nothing worth posting this run, or
 * on any failure — the caller's contract is "no post" on null, never a
 * fallback post, since there's no safe canned text for arbitrary news. */
export async function rankAndTranslate(items: NewsItem[]): Promise<RankedNews | null> {
  const candidates = dedupSimilarTitles(items)
    .sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0))
    .slice(0, MAX_CANDIDATES);

  if (candidates.length === 0) return null;
  if (!newsEnv.groqApiKey) return null;

  const listing = candidates
    .map((item, i) => `${i}. [${item.sourceName}] ${item.title} — ${item.summary}`.slice(0, 400))
    .join('\n');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newsEnv.groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.2,
        max_tokens: 1200,
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: listing },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`Groq ranking request failed: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;

    const selection = parseGroqJson(content);
    if (!selection || selection.selected_index === null || !selection.translated) return null;

    const item = candidates[selection.selected_index];
    if (!item) return null;

    return { item, translatedText: selection.translated.trim() };
  } catch (err) {
    console.error('Groq ranking call failed:', err);
    return null;
  }
}
