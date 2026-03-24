import Parser from "rss-parser";
import { Category } from "@prisma/client";

type MediaItem = {
  $?: { url?: string };
  url?: string;
};

type CustomItem = {
  "media:content"?: MediaItem;
  "media:thumbnail"?: MediaItem;
  enclosure?: { url?: string; type?: string };
};

const parser = new Parser<Record<string, never>, CustomItem>({
  timeout: 10000,
  headers: { "User-Agent": "tldr-news-bot/1.0" },
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
    ],
  },
});

export interface RawArticle {
  title: string;
  sourceUrl: string;
  sourceName: string;
  category: Category;
  content: string;
  publishedAt: Date;
  imageUrl?: string;
  importanceScore?: number; // 1-10; set by source (Reddit score, etc.)
}

// RSS feeds kept only for Culture — Tech/Finance/Politics come from Reddit
const RSS_FEEDS: { url: string; sourceName: string; category: Category }[] = [
  { url: "https://variety.com/feed/", sourceName: "Variety", category: "CULTURE" },
  { url: "https://www.hollywoodreporter.com/feed/", sourceName: "The Hollywood Reporter", category: "CULTURE" },
  { url: "https://pitchfork.com/feed/feed-news/rss", sourceName: "Pitchfork", category: "CULTURE" },
];

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_ARTICLES_PER_FEED = 5;

function extractImageUrl(item: CustomItem): string | undefined {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }
  const mc = item["media:content"];
  if (mc?.$?.url) return mc.$?.url;
  if (mc?.url) return mc.url;
  const mt = item["media:thumbnail"];
  if (mt?.$?.url) return mt.$?.url;
  if (mt?.url) return mt.url;
  return undefined;
}

export async function fetchFeed(
  feedConfig: (typeof RSS_FEEDS)[number]
): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    const articles: RawArticle[] = [];
    const now = Date.now();

    for (const item of feed.items.slice(0, MAX_ARTICLES_PER_FEED)) {
      if (!item.link || !item.title) continue;

      // Skip articles older than 24 hours
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (now - pubDate.getTime() > TWENTY_FOUR_HOURS_MS) continue;

      const content = item.contentSnippet || item.content || item.summary || item.title;

      articles.push({
        title: item.title.trim(),
        sourceUrl: item.link.trim(),
        sourceName: feedConfig.sourceName,
        category: feedConfig.category,
        content: content.slice(0, 800),
        publishedAt: pubDate,
        imageUrl: extractImageUrl(item),
      });
    }

    return articles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RSS] Failed to fetch ${feedConfig.sourceName} (${feedConfig.url}): ${msg}`);
    return [];
  }
}

// Fetch feeds in small batches to stay within Railway's memory limits
const BATCH_SIZE = 3;

export async function fetchAllFeeds(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];

  for (let i = 0; i < RSS_FEEDS.length; i += BATCH_SIZE) {
    const batch = RSS_FEEDS.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(fetchFeed));
    for (const result of results) {
      if (result.status === "fulfilled") {
        articles.push(...result.value);
      }
    }
  }

  return articles;
}
