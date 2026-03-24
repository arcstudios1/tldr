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
}

// Top-stories / breaking-news feed variants where available
const RSS_FEEDS: { url: string; sourceName: string; category: Category }[] = [
  // Tech — already top-story feeds
  { url: "https://techcrunch.com/feed/", sourceName: "TechCrunch", category: "TECH" },
  { url: "https://www.theverge.com/rss/index.xml", sourceName: "The Verge", category: "TECH" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", sourceName: "Ars Technica", category: "TECH" },
  // Finance — top-news variants
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", sourceName: "WSJ Markets", category: "FINANCE" },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", sourceName: "CNBC Finance", category: "FINANCE" },
  { url: "https://feeds.reuters.com/reuters/businessNews", sourceName: "Reuters Business", category: "FINANCE" },
  // Politics — AP top news covers the most important politics stories
  { url: "https://feeds.reuters.com/Reuters/PoliticsNews", sourceName: "Reuters Politics", category: "POLITICS" },
  { url: "https://rss.politico.com/politics-news.xml", sourceName: "Politico", category: "POLITICS" },
  { url: "https://apnews.com/rss/apf-topnews", sourceName: "AP Top News", category: "POLITICS" },
  // Culture
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
    console.error(`[RSS] Failed to fetch ${feedConfig.sourceName}:`, err);
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
