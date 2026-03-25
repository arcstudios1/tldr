import { Category } from "@prisma/client";
import { RawArticle } from "./rss";

const API_KEY = process.env.GUARDIAN_API_KEY ?? "";
const BASE = "https://content.guardianapis.com";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PER_SECTION = 12;

interface GuardianResult {
  id: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionId: string;
  fields?: {
    thumbnail?: string;
    trailText?: string;
    bodyText?: string;
  };
}

const SECTIONS: { id: string; category: Category; label: string }[] = [
  { id: "politics",      category: "POLITICS", label: "Politics"  },
  { id: "world",         category: "POLITICS", label: "World"     },
  { id: "us-news",       category: "POLITICS", label: "US News"   },
  { id: "culture",       category: "CULTURE",  label: "Culture"   },
  { id: "film",          category: "CULTURE",  label: "Film"      },
  { id: "music",         category: "CULTURE",  label: "Music"     },
  { id: "technology",    category: "TECH",     label: "Technology"},
  { id: "business",      category: "FINANCE",  label: "Business"  },
  { id: "sport",         category: "SPORTS",   label: "Sport"     },
];

async function fetchSection(
  section: (typeof SECTIONS)[number]
): Promise<RawArticle[]> {
  if (!API_KEY) return [];

  const url = new URL(`${BASE}/search`);
  url.searchParams.set("section", section.id);
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("page-size", "20");
  url.searchParams.set("show-fields", "thumbnail,trailText,bodyText");
  url.searchParams.set("api-key", API_KEY);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error(`[Guardian] ${section.id} HTTP ${res.status}`);
    return [];
  }

  const json = (await res.json()) as {
    response: { results: GuardianResult[] };
  };

  const now = Date.now();
  const articles: RawArticle[] = [];

  for (const item of json.response.results) {
    if (articles.length >= MAX_PER_SECTION) break;

    const pubDate = new Date(item.webPublicationDate);
    if (now - pubDate.getTime() > MAX_AGE_MS) continue;

    const imageUrl = item.fields?.thumbnail;

    const content =
      item.fields?.trailText ??
      item.fields?.bodyText?.slice(0, 500) ??
      item.webTitle;

    articles.push({
      title: item.webTitle,
      sourceUrl: item.webUrl,
      sourceName: "The Guardian",
      category: section.category,
      content,
      publishedAt: pubDate,
      imageUrl,
      importanceScore: 6,
    });
  }

  console.log(`[Guardian] ${section.id}: ${articles.length} articles`);
  return articles;
}

export async function fetchGuardian(): Promise<RawArticle[]> {
  if (!API_KEY) {
    console.warn("[Guardian] GUARDIAN_API_KEY not set — skipping");
    return [];
  }

  const results = await Promise.allSettled(
    SECTIONS.map((s) => fetchSection(s))
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
