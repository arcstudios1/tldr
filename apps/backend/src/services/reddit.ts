import Parser from "rss-parser";
import { Category } from "@prisma/client";
import { RawArticle } from "./rss";

const SUBREDDITS: { subreddit: string; category: Category }[] = [
  { subreddit: "technology", category: "TECH" },
  { subreddit: "technews", category: "TECH" },
  { subreddit: "investing", category: "FINANCE" },
  { subreddit: "finance", category: "FINANCE" },
  { subreddit: "politics", category: "POLITICS" },
  { subreddit: "worldnews", category: "POLITICS" },
];

const SKIP_DOMAINS = new Set([
  "reddit.com", "redd.it", "i.redd.it", "v.redd.it",
  "i.imgur.com", "imgur.com", "gfycat.com", "streamable.com",
  "youtube.com", "youtu.be", "twitter.com", "x.com",
]);

const MAX_POSTS = 10;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const parser = new Parser({
  headers: { "User-Agent": "gists-news-bot/1.0" },
  customFields: { item: ["media:thumbnail"] },
});

function domainToSourceName(domain: string): string {
  const MAP: Record<string, string> = {
    "apnews.com": "AP News",
    "bbc.com": "BBC",
    "bbc.co.uk": "BBC",
    "nytimes.com": "New York Times",
    "washingtonpost.com": "Washington Post",
    "theguardian.com": "The Guardian",
    "reuters.com": "Reuters",
    "wsj.com": "WSJ",
    "bloomberg.com": "Bloomberg",
    "cnbc.com": "CNBC",
    "techcrunch.com": "TechCrunch",
    "theverge.com": "The Verge",
    "arstechnica.com": "Ars Technica",
    "wired.com": "Wired",
    "politico.com": "Politico",
    "axios.com": "Axios",
    "npr.org": "NPR",
    "nbcnews.com": "NBC News",
    "abcnews.go.com": "ABC News",
    "cbsnews.com": "CBS News",
    "foxnews.com": "Fox News",
    "cnn.com": "CNN",
    "ft.com": "Financial Times",
    "fortune.com": "Fortune",
    "forbes.com": "Forbes",
    "businessinsider.com": "Business Insider",
  };
  const clean = domain.replace(/^www\./, "");
  return MAP[clean] ?? clean.replace(/\.(com|org|net|co\.uk)$/, "").replace(/-/g, " ");
}

// Extract the external article URL from Reddit RSS item content
// Reddit RSS wraps the link in the description HTML: <a href="URL">[link]</a>
function extractArticleUrl(item: Parser.Item): string | undefined {
  // Reddit RSS puts the external URL directly as the item link for link posts
  const link = item.link ?? "";
  // If the link is a Reddit URL, try to extract from content
  if (link.includes("reddit.com")) {
    const match = item.content?.match(/href="(https?:\/\/(?!www\.reddit\.com)[^"]+)"\s*>\[link\]/);
    return match?.[1];
  }
  return link || undefined;
}

// Extract image URL from Reddit RSS item (thumbnail in enclosure or media)
function extractImageUrl(item: Parser.Item & { "media:thumbnail"?: { $?: { url?: string } } }): string | undefined {
  if (item.enclosure?.url?.startsWith("http")) return item.enclosure.url;
  const mt = item["media:thumbnail"];
  if (mt?.$?.url?.startsWith("http")) return mt.$.url;
  // Try to find an image in the content HTML
  const match = item.content?.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
  if (match) return match[1];
  return undefined;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function fetchSubreddit(
  config: (typeof SUBREDDITS)[number]
): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(
      `https://www.reddit.com/r/${config.subreddit}/top.rss?t=day&limit=25`
    );

    const articles: RawArticle[] = [];
    const now = Date.now();

    for (const item of feed.items) {
      if (articles.length >= MAX_POSTS) break;

      const articleUrl = extractArticleUrl(item);
      if (!articleUrl) continue;

      const domain = getDomain(articleUrl);
      if (!domain || SKIP_DOMAINS.has(domain)) continue;

      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (now - pubDate.getTime() > TWENTY_FOUR_HOURS_MS) continue;

      const imageUrl = extractImageUrl(item as Parameters<typeof extractImageUrl>[0]);
      if (!imageUrl) continue;

      articles.push({
        title: item.title ?? "Untitled",
        sourceUrl: articleUrl,
        sourceName: domainToSourceName(domain),
        category: config.category,
        content: item.title ?? "",
        publishedAt: pubDate,
        imageUrl,
        importanceScore: 6, // Reddit top-of-day posts default to above-average importance
      });
    }

    console.log(`[Reddit] r/${config.subreddit}: ${articles.length} articles`);
    return articles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Reddit] Failed to fetch r/${config.subreddit}: ${msg}`);
    return [];
  }
}

export async function fetchAllRedditFeeds(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  for (const config of SUBREDDITS) {
    const results = await fetchSubreddit(config);
    articles.push(...results);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return articles;
}
