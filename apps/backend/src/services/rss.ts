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

const RSS_FEEDS: { url: string; sourceName: string; category: Category }[] = [
  // Tech
  { url: "https://techcrunch.com/feed/", sourceName: "TechCrunch", category: "TECH" },
  { url: "https://www.theverge.com/rss/index.xml", sourceName: "The Verge", category: "TECH" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", sourceName: "Ars Technica", category: "TECH" },
  // Finance
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", sourceName: "WSJ Markets", category: "FINANCE" },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", sourceName: "CNBC Finance", category: "FINANCE" },
  { url: "https://feeds.reuters.com/reuters/businessNews", sourceName: "Reuters Business", category: "FINANCE" },
  // Politics
  { url: "https://feeds.reuters.com/Reuters/PoliticsNews", sourceName: "Reuters Politics", category: "POLITICS" },
  { url: "https://rss.politico.com/politics-news.xml", sourceName: "Politico", category: "POLITICS" },
  { url: "https://apnews.com/rss/apf-politics", sourceName: "AP Politics", category: "POLITICS" },
  // Culture
  { url: "https://variety.com/feed/", sourceName: "Variety", category: "CULTURE" },
  { url: "https://www.hollywoodreporter.com/feed/", sourceName: "The Hollywood Reporter", category: "CULTURE" },
  { url: "https://pitchfork.com/feed/feed-news/rss", sourceName: "Pitchfork", category: "CULTURE" },
];

function extractImageUrl(item: CustomItem): string | undefined {
  // Priority 1: standard RSS enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }
  // Priority 2: media:content
  const mc = item["media:content"];
  if (mc?.$.url) return mc.$.url;
  if (mc?.url) return mc.url;
  // Priority 3: media:thumbnail
  const mt = item["media:thumbnail"];
  if (mt?.$.url) return mt.$.url;
  if (mt?.url) return mt.url;
  return undefined;
}

export async function fetchFeed(
  feedConfig: (typeof RSS_FEEDS)[number]
): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    const articles: RawArticle[] = [];

    for (const item of feed.items.slice(0, 10)) {
      if (!item.link || !item.title) continue;

      const content = item.contentSnippet || item.content || item.summary || item.title;

      articles.push({
        title: item.title.trim(),
        sourceUrl: item.link.trim(),
        sourceName: feedConfig.sourceName,
        category: feedConfig.category,
        content: content.slice(0, 800),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        imageUrl: extractImageUrl(item),
      });
    }

    return articles;
  } catch (err) {
    console.error(`[RSS] Failed to fetch ${feedConfig.sourceName}:`, err);
    return [];
  }
}

export async function fetchAllFeeds(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const articles: RawArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  return articles;
}
