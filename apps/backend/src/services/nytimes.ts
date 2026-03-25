import { Category } from "@prisma/client";
import { RawArticle } from "./rss";

const API_KEY = process.env.NYT_API_KEY ?? "";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PER_SECTION = 8;

interface NYTArticle {
  web_url: string;
  headline: { main: string };
  abstract: string;
  pub_date: string;
  section_name: string;
  multimedia: Array<{ url: string; subtype: string }>;
  source: string;
}

// NYT Top Stories sections mapped to our categories
const TOP_STORY_SECTIONS: { section: string; category: Category }[] = [
  { section: "home",        category: "POLITICS" },
  { section: "politics",    category: "POLITICS" },
  { section: "world",       category: "POLITICS" },
  { section: "technology",  category: "TECH"     },
  { section: "business",    category: "FINANCE"  },
  { section: "arts",        category: "CULTURE"  },
  { section: "sports",      category: "SPORTS"   },
];

interface NYTTopStory {
  url: string;
  title: string;
  abstract: string;
  published_date: string;
  section: string;
  subsection: string;
  multimedia: Array<{ url: string; format: string }> | null;
}

async function fetchTopStories(
  config: (typeof TOP_STORY_SECTIONS)[number]
): Promise<RawArticle[]> {
  if (!API_KEY) return [];

  const url = `https://api.nytimes.com/svc/topstories/v2/${config.section}.json?api-key=${API_KEY}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.error(`[NYT] ${config.section} HTTP ${res.status}`);
    return [];
  }

  const json = (await res.json()) as { results: NYTTopStory[] };
  const now = Date.now();
  const articles: RawArticle[] = [];

  for (const item of json.results) {
    if (articles.length >= MAX_PER_SECTION) break;
    if (!item.url || item.url.includes("interactive")) continue;

    const pubDate = new Date(item.published_date);
    if (now - pubDate.getTime() > MAX_AGE_MS) continue;

    // NYT multimedia: prefer "superJumbo" or "Large" format
    const image =
      item.multimedia?.find((m) => m.format === "superJumbo")?.url ??
      item.multimedia?.find((m) => m.format === "Large")?.url ??
      item.multimedia?.[0]?.url;

    const imageUrl = image
      ? image.startsWith("http")
        ? image
        : `https://www.nytimes.com/${image}`
      : undefined;

    if (!imageUrl) continue;

    articles.push({
      title: item.title,
      sourceUrl: item.url,
      sourceName: "New York Times",
      category: config.category,
      content: item.abstract ?? item.title,
      publishedAt: pubDate,
      imageUrl,
      importanceScore: 7, // NYT editorial selection is high-quality signal
    });
  }

  console.log(`[NYT] ${config.section}: ${articles.length} articles`);
  return articles;
}

export async function fetchNYTimes(): Promise<RawArticle[]> {
  if (!API_KEY) {
    console.warn("[NYT] NYT_API_KEY not set — skipping");
    return [];
  }

  // Stagger requests slightly to stay within rate limits (10 req/min)
  const results: RawArticle[] = [];
  for (const config of TOP_STORY_SECTIONS) {
    const articles = await fetchTopStories(config).catch((err) => {
      console.error(`[NYT] ${config.section} error:`, err);
      return [] as RawArticle[];
    });
    results.push(...articles);
    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}
