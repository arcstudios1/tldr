import cron from "node-cron";
import { prisma } from "../db/client";
import { fetchAllFeeds, RawArticle } from "./rss";
import { fetchHackerNews } from "./hackernews";
import { fetchGuardian } from "./guardian";
import { fetchNYTimes } from "./nytimes";
import { fetchGNews } from "./gnews";
import { summarizeArticle } from "./summarizer";
import { updateFeedScores } from "./scorer";
import { enrichMissingImages } from "./imageEnricher";

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "but",
  "is", "are", "was", "were", "be", "been", "by", "with", "from", "that",
  "this", "it", "its", "as", "up", "how", "what", "who", "why", "when",
  "where", "new", "says", "said", "will", "has", "have", "had", "not",
  "over", "after", "into", "about", "more", "than", "just", "could",
]);

function getKeywords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

function titlesAreSimilar(a: string, b: string): boolean {
  const kwA = getKeywords(a);
  const kwB = getKeywords(b);
  let shared = 0;
  for (const word of kwA) {
    if (kwB.has(word)) shared++;
  }
  return shared >= 2;
}

function groupByTopic(
  articles: RawArticle[]
): Array<{ article: RawArticle; sourceCount: number }> {
  const groups: Array<{ articles: RawArticle[] }> = [];

  for (const article of articles) {
    let placed = false;
    for (const group of groups) {
      if (titlesAreSimilar(article.title, group.articles[0].title)) {
        group.articles.push(article);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ articles: [article] });
    }
  }

  return groups
    .map((g) => ({
      article: g.articles[0],
      sourceCount: g.articles.length,
    }))
    .sort((a, b) => b.sourceCount - a.sourceCount);
}

export async function runPipeline(): Promise<void> {
  console.log("[Pipeline] Starting content pipeline run...");

  const [rssArticles, hnArticles, guardianArticles, nytArticles, gnewsArticles] =
    await Promise.all([
      fetchAllFeeds(),
      fetchHackerNews(),
      fetchGuardian(),
      fetchNYTimes(),
      fetchGNews(),
    ]);

  const rawArticles = [
    ...hnArticles,
    ...nytArticles,
    ...guardianArticles,
    ...gnewsArticles,
    ...rssArticles,
  ];

  console.log(
    `[Pipeline] Fetched ${rawArticles.length} raw articles ` +
    `(HN: ${hnArticles.length}, NYT: ${nytArticles.length}, ` +
    `Guardian: ${guardianArticles.length}, GNews: ${gnewsArticles.length}, ` +
    `RSS: ${rssArticles.length})`
  );

  const grouped = groupByTopic(rawArticles);
  console.log(
    `[Pipeline] ${grouped.length} unique stories ` +
    `(${grouped.filter((g) => g.sourceCount > 1).length} multi-source)`
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { article, sourceCount } of grouped) {
    try {
      const existing = await prisma.article.findUnique({
        where: { sourceUrl: article.sourceUrl },
      });

      if (existing) { skipped++; continue; }

      const { headline, summary } = await summarizeArticle(
        article.title,
        article.content
      );

      await prisma.article.create({
        data: {
          title: headline,
          summary,
          imageUrl: article.imageUrl ?? null,
          sourceUrl: article.sourceUrl,
          sourceName: article.sourceName,
          category: article.category,
          publishedAt: article.publishedAt,
          sourceCount,
          importanceScore: article.importanceScore ?? 5,
          feedScore: 0, // scorer will populate within 30 minutes
        },
      });

      created++;
      if (sourceCount > 1) {
        console.log(`[Pipeline] ★ Multi-source (${sourceCount}): "${headline}"`);
      }
    } catch (err) {
      console.error(`[Pipeline] Failed: "${article.title}":`, err);
      failed++;
    }
  }

  console.log(
    `[Pipeline] Done. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`
  );

  // Run scorer immediately after ingestion so new articles have a score
  await updateFeedScores().catch((err) =>
    console.error("[Pipeline] Scorer error:", err)
  );

  // Backfill og:image for top-scored articles that arrived without one
  await enrichMissingImages().catch((err) =>
    console.error("[Pipeline] ImageEnricher error:", err)
  );
}

export function startScheduler(): void {
  // Content pipeline: every hour
  cron.schedule("0 * * * *", () => {
    runPipeline().catch((err) =>
      console.error("[Scheduler] Pipeline error:", err)
    );
  });

  // Feed scorer: every 30 minutes (keeps scores fresh as time decays)
  cron.schedule("*/30 * * * *", () => {
    updateFeedScores().catch((err) =>
      console.error("[Scheduler] Scorer error:", err)
    );
  });

  // Startup run after 15s (server warm-up buffer)
  setTimeout(() => {
    runPipeline().catch((err) =>
      console.error("[Scheduler] Startup pipeline error:", err)
    );
  }, 15_000);

  console.log(
    "[Scheduler] Pipeline: hourly | Scorer: every 30 min | First run in 15s"
  );
}
