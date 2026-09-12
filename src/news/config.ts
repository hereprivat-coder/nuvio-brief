import type { NewsSource } from './types.js';

/** All verified live (curl 200, valid RSS/Atom) as of 2026-09-12. Weight feeds
 * into Groq ranking: regulators/foundations outrank general crypto media,
 * which outrank nothing (there's no lower tier — everything here is already
 * crypto- or regulation-focused). */
export const NEWS_SOURCES: readonly NewsSource[] = [
  { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', weight: 2 },
  { id: 'cointelegraph', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', weight: 2 },
  { id: 'decrypt', name: 'Decrypt', url: 'https://decrypt.co/feed', weight: 2 },
  { id: 'theblock', name: 'The Block', url: 'https://www.theblock.co/rss.xml', weight: 2 },
  { id: 'forklog', name: 'ForkLog', url: 'https://forklog.com/feed/', weight: 2 },
  { id: 'ethereum-blog', name: 'Ethereum Foundation', url: 'https://blog.ethereum.org/en/feed.xml', weight: 3 },
  // General (non-crypto-only) official feeds — the keyword filter below is
  // what keeps these from flooding the pipeline with unrelated press releases.
  { id: 'sec', name: 'SEC', url: 'https://www.sec.gov/news/pressreleases.rss', weight: 4 },
  { id: 'cbr', name: 'Банк России', url: 'https://cbr.ru/rss/RssPress', weight: 4 },
];

export const NEWS_CONFIG = {
  /** Coarse relevance pass before any Groq call — an item must match at least
   * one of these (case-insensitive, matched against title + summary) to reach
   * ranking. Mainly load-bearing for the two general feeds (sec, cbr); crypto-
   * native sources pass almost everything through anyway. */
  keywords: [
    // assets / tickers
    'bitcoin', 'биткоин', 'btc', 'ethereum', 'эфир', 'eth', 'solana', 'солана', 'sol',
    'toncoin', 'ton', 'gram', 'xrp', 'ripple', 'stablecoin', 'стейблкоин', 'usdt', 'usdc',
    // domain / industry
    'crypto', 'крипто', 'blockchain', 'блокчейн', 'токен', 'token', 'defi', 'nft',
    'web3', 'майнинг', 'mining', 'цифровой рубль', 'цифровая валюта', 'cbdc',
    // exchanges / major projects
    'binance', 'coinbase', 'okx', 'bybit', 'kraken',
    // regulation / risk — what makes SEC/CBR items relevant
    'sec', 'etf', 'регулир', 'regulat', 'запрет', 'ban', 'sanction', 'санкц',
    'hack', 'взлом', 'exploit', 'эксплойт', 'фишинг', 'phishing',
  ],

  /** How often the workflow checks — informational here, the real cadence
   * lives in .github/workflows/news.yml's cron. */
  checkWindowHours: 3,

  /** Hard ceiling even on a very newsy day, so the channel never gets spammed
   * beyond this regardless of how many checks fired something. */
  maxPostsPerDay: 6,

  /** How many recent GUIDs to remember for de-dup (oldest are dropped first). */
  seenGuidsCapacity: 500,
} as const;
