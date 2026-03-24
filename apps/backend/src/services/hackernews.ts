import { Category } from "@prisma/client";
import { RawArticle } from "./rss";

const HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

const FETCH_TOP_N = 40;   // fetch details for top 40 ranked stories
const MAX_ARTICLES = 15;  // keep best 15 that have images
const MIN_SCORE = 50;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface HNItem {
  id: number;
  type: string;
  title: string;
  url?: string;
  score: number;
  time: number;
}

function scoreToImportance(score: number): number {
  if (score >= 1000) return 10;
  if (score >= 500)  return 9;
  if (score >= 300)  return 8;
  if (score >= 200)  return 7;
  if (score >= 100)  return 6;
  if (score >= 50)   return 5;
  return 4;
}

function domainToSourceName(url: string): string {
  const MAP: Record<string, string> = {
    "apnews.com": "AP News",
    "bbc.com": "BBC",
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
    "axios.com": "Axios",
    "ft.com": "Financial Times",
    "fortune.com": "Fortune",
    "forbes.com": "Forbes",
    "github.com": "GitHub",
    "9to5mac.com": "9to5Mac",
    "macrumors.com": "MacRumors",
    "venturebeat.com": "VentureBeat",
  };
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return MAP[domain] ?? domain.replace(/\.(com|org|net|io|co\.uk)$/, "").replace(/-/g, " ");
  } catch {
    return "Unknown";
  }
}

async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; tldr-bot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return undefined;
    // Read only first 100KB to find og:image in <head>
    const reader = res.body?.getReader();
    if (!reader) return undefined;
    let html = "";
    while (html.length < 100_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export async function fetchHackerNews(): Promise<RawArticle[]> {
  try {
    const res = await fetch(HN_TOP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const topIds = (await res.json()) as number[];

    // Fetch story details in parallel
    const items = (
      await Promise.all(
        topIds.slice(0, FETCH_TOP_N).map(async (id) => {
          try {
            const r = await fetch(HN_ITEM_URL(id));
            return r.ok ? ((await r.json()) as HNItem) : null;
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean) as HNItem[];

    const now = Date.now();
    const candidates = items
      .filter(
        (item) =>
          item.type === "story" &&
          item.url &&
          item.score >= MIN_SCORE &&
          now - item.time * 1000 <= TWENTY_FOUR_HOURS_MS
      )
      .sort((a, b) => b.score - a.score);

    // Fetch OG images in batches of 5
    const articles: RawArticle[] = [];
    const BATCH = 5;
    for (let i = 0; i < candidates.length && articles.length < MAX_ARTICLES; i += BATCH) {
      const batch = candidates.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (item) => {
          const imageUrl = await fetchOgImage(item.url!);
          if (!imageUrl) return null;
          return {
            title: item.title,
            sourceUrl: item.url!,
            sourceName: domainToSourceName(item.url!),
            category: "TECH" as Category,
            content: item.title,
            publishedAt: new Date(item.time * 1000),
            imageUrl,
            importanceScore: scoreToImportance(item.score),
          } as RawArticle;
        })
      );
      for (const r of results) {
        if (r && articles.length < MAX_ARTICLES) articles.push(r);
      }
    }

    console.log(
      `[HackerNews] ${articles.length} articles (top score: ${candidates[0]?.score ?? 0})`
    );
    return articles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[HackerNews] Failed: ${msg}`);
    return [];
  }
}
