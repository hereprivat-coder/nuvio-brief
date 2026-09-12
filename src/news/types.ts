export interface NewsSource {
  id: string;
  name: string;
  url: string;
  /** Authority weight passed to Groq ranking — regulator/foundation > exchange/media. */
  weight: number;
}

export interface NewsItem {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  /** RSS guid, falling back to the link when a feed omits <guid>. */
  guid: string;
  pubDate: Date | null;
  summary: string;
  weight: number;
}

export interface RankedNews {
  item: NewsItem;
  /** Russian, 2-4 sentences — ready to post. */
  translatedText: string;
}
