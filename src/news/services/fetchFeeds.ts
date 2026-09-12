import { XMLParser } from 'fast-xml-parser';
import { NEWS_SOURCES } from '../config.js';
import type { NewsItem, NewsSource } from '../types.js';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const FETCH_TIMEOUT_MS = 15_000;

function stripHtml(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** RSS items expose text as either a plain string or, with CDATA, an object
 * shaped like { '#text': '...' } depending on the parser's mood. */
function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text'] ?? '');
  }
  return '';
}

function parseFeedItems(xml: string, source: NewsSource): NewsItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rss = doc.rss as { channel?: { item?: unknown } } | undefined;
  const feed = doc.feed as { entry?: unknown } | undefined;

  const rawItems = rss?.channel?.item ?? feed?.entry;
  if (!rawItems) return [];
  const list = Array.isArray(rawItems) ? rawItems : [rawItems];

  return list.map((raw): NewsItem => {
    const entry = raw as Record<string, unknown>;
    const title = stripHtml(textOf(entry.title));

    // Atom uses <link href="..."/>, RSS uses a plain <link> text node.
    const linkRaw = entry.link;
    const link =
      typeof linkRaw === 'string'
        ? linkRaw
        : Array.isArray(linkRaw)
          ? String((linkRaw[0] as { '@_href'?: string })?.['@_href'] ?? '')
          : String((linkRaw as { '@_href'?: string } | undefined)?.['@_href'] ?? '');

    const guidRaw = entry.guid ?? entry.id;
    const guid = stripHtml(textOf(guidRaw)) || link;

    const pubDateRaw = textOf(entry.pubDate ?? entry.updated ?? entry.published);
    const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;

    const summary = stripHtml(textOf(entry.description ?? entry.summary ?? entry['content:encoded'])).slice(
      0,
      500,
    );

    return {
      sourceId: source.id,
      sourceName: source.name,
      title,
      link,
      guid,
      pubDate: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate : null,
      summary,
      weight: source.weight,
    };
  });
}

async function fetchOneFeed(source: NewsSource): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NuvioNewsBot/1.0)' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error(`News feed ${source.id} returned ${res.status}, skipping.`);
      return [];
    }

    return parseFeedItems(await res.text(), source);
  } catch (err) {
    console.error(`News feed ${source.id} failed, skipping:`, err);
    return [];
  }
}

/** Fetches every configured feed in parallel. A single feed failing (network,
 * bad XML, blocked bot) never blocks the others — it just contributes nothing. */
export async function fetchAllFeeds(): Promise<NewsItem[]> {
  const results = await Promise.all(NEWS_SOURCES.map(fetchOneFeed));
  return results.flat();
}
