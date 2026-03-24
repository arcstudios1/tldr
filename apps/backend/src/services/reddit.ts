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

// Domains we skip — Reddit meta, image hosts, video hosts
const SKIP_DOMAINS = new Set([
  "reddit.com", "redd.it", "i.redd.it", "v.redd.it",
  "i.imgur.com", "imgur.com", "gfycat.com", "streamable.com",
  "youtube.com", "youtu.be", "twitter.com", "x.com",
]);

const HEADERS = {
  "User-Agent": "tldr-news-bot/1.0",
  "Accept": "application/json",
};

const MAX_POSTS = 10;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Map Reddit upvote score → 1-10 importance
function scoreToImportance(score: number): number {
  if (score >= 20000) return 10;
  if (score >= 10000) return 9;
  if (score >= 5000) return 8;
  if (score >= 2000) return 7;
  if (score >= 1000) return 6;
  if (score >= 300) return 5;
  return 4;
}

// Format domain as readable source name: "apnews.com" → "AP News"
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

interface RedditChild {
  data: {
    title: string;
    url: string;
    thumbnail: string;
    score: number;
    domain: string;
    is_self: boolean;
    created_utc: number;
    preview?: {
      images: Array<{ source: { url: string } }>;
    };
  };
}

function extractImage(post: RedditChild["data"]): string | undefined {
  // Reddit caches the article's OG image — best quality
  const preview = post.preview?.images?.[0]?.source?.url;
  if (preview) return preview.replace(/&amp;/g, "&");
  // Fall back to Reddit's thumbnail if it's an actual image URL
  if (post.thumbnail?.startsWith("http")) return post.thumbnail;
  return undefined;
}

export async function fetchSubreddit(
  config: (typeof SUBREDDITS)[number]
): Promise<RawArticle[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${config.subreddit}/top.json?t=day&limit=25`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as { data: { children: RedditChild[] } };
    const articles: RawArticle[] = [];
    const now = Date.now();

    for (const child of json.data.children) {
      const post = child.data;
      if (articles.length >= MAX_POSTS) break;

      // Skip text posts and Reddit-hosted content
      if (post.is_self) continue;
      const cleanDomain = post.domain.replace(/^www\./, "");
      if (SKIP_DOMAINS.has(cleanDomain)) continue;

      // Skip posts older than 24 hours
      const pubDate = new Date(post.created_utc * 1000);
      if (now - pubDate.getTime() > TWENTY_FOUR_HOURS_MS) continue;

      const imageUrl = extractImage(post);
      if (!imageUrl) continue;

      articles.push({
        title: post.title,
        sourceUrl: post.url,
        sourceName: domainToSourceName(post.domain),
        category: config.category,
        content: post.title, // title is enough context for GPT to summarize
        publishedAt: pubDate,
        imageUrl,
        importanceScore: scoreToImportance(post.score),
      });
    }

    console.log(
      `[Reddit] r/${config.subreddit}: ${articles.length} articles (top score: ${
        json.data.children[0]?.data.score ?? 0
      })`
    );
    return articles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Reddit] Failed to fetch r/${config.subreddit}: ${msg}`);
    return [];
  }
}

export async function fetchAllRedditFeeds(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  // Sequential to respect Reddit's rate limit (1 req/sec)
  for (const config of SUBREDDITS) {
    const results = await fetchSubreddit(config);
    articles.push(...results);
    await new Promise((r) => setTimeout(r, 1100)); // 1.1s between requests
  }
  return articles;
}
