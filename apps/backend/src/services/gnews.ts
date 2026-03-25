import { Category } from "@prisma/client";
import { RawArticle } from "./rss";

const API_KEY = process.env.GNEWS_API_KEY ?? "";
const BASE = "https://gnews.io/api/v4";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PER_TOPIC = 5;

interface GNewsArticle {
  title: string;
  url: string;
  description: string;
  content: string;
  publishedAt: string;
  image: string | null;
  source: { name: string; url: string };
}

// GNews topic → our category mapping
// GNews free tier: 100 req/day — we use 5 topics = 5 req/pipeline run
const TOPICS: { topic: string; category: Category }[] = [
  { topic: "sports",         category: "SPORTS"   },
  { topic: "entertainment",  category: "CULTURE"  },
  { topic: "technology",     category: "TECH"     },
  { topic: "business",       category: "FINANCE"  },
  { topic: "politics",       category: "POLITICS" },
];

async function fetchTopic(
  config: (typeof TOPICS)[number]
): Promise<RawArticle[]> {
  if (!API_KEY) return [];

  const url = new URL(`${BASE}/top-headlines`);
  url.searchParams.set("topic", config.topic);
  url.searchParams.set("lang", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("max", "10");
  url.searchParams.set("apikey", API_KEY);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.error(`[GNews] ${config.topic} HTTP ${res.status}`);
    return [];
  }

  const json = (await res.json()) as { articles: GNewsArticle[] };
  const now = Date.now();
  const articles: RawArticle[] = [];

  for (const item of json.articles) {
    if (articles.length >= MAX_PER_TOPIC) break;
    if (!item.url || !item.image) continue;

    const pubDate = new Date(item.publishedAt);
    if (now - pubDate.getTime() > MAX_AGE_MS) continue;

    articles.push({
      title: item.title,
      sourceUrl: item.url,
      sourceName: item.source.name,
      category: config.category,
      content: item.description ?? item.content ?? item.title,
      publishedAt: pubDate,
      imageUrl: item.image,
      importanceScore: 5,
    });
  }

  console.log(`[GNews] ${config.topic}: ${articles.length} articles`);
  return articles;
}

export async function fetchGNews(): Promise<RawArticle[]> {
  if (!API_KEY) {
    console.warn("[GNews] GNEWS_API_KEY not set — skipping");
    return [];
  }

  const results: RawArticle[] = [];
  for (const config of TOPICS) {
    const articles = await fetchTopic(config).catch((err) => {
      console.error(`[GNews] ${config.topic} error:`, err);
      return [] as RawArticle[];
    });
    results.push(...articles);
    // Stagger to avoid burst rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}
