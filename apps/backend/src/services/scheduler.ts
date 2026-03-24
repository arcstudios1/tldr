import cron from "node-cron";
import { prisma } from "../db/client";
import { fetchAllFeeds, RawArticle } from "./rss";
import { summarizeArticle } from "./summarizer";

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
  // 2+ shared meaningful keywords = same story
  return shared >= 2;
}

// Group articles by topic, return one representative per group
// sorted by how many sources covered that story (descending)
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
      article: g.articles[0], // first = highest-position article (feed order)
      sourceCount: g.articles.length,
    }))
    .sort((a, b) => b.sourceCount - a.sourceCount); // multi-source stories first
}

export async function runPipeline(): Promise<void> {
  console.log("[Pipeline] Starting content pipeline run...");
  const rawArticles = await fetchAllFeeds();
  console.log(`[Pipeline] Fetched ${rawArticles.length} raw articles`);

  // Group by topic and surface multi-source stories first
  const grouped = groupByTopic(rawArticles);
  console.log(
    `[Pipeline] ${grouped.length} unique stories (` +
    `${grouped.filter((g) => g.sourceCount > 1).length} covered by multiple sources)`
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { article, sourceCount } of grouped) {
    try {
      const existing = await prisma.article.findUnique({
        where: { sourceUrl: article.sourceUrl },
      });

      if (existing) {
        skipped++;
        continue;
      }

      if (!article.imageUrl) {
        skipped++;
        continue;
      }

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
        },
      });

      created++;
      if (sourceCount > 1) {
        console.log(
          `[Pipeline] ★ Multi-source story (${sourceCount} sources): "${headline}"`
        );
      }
    } catch (err) {
      console.error(`[Pipeline] Failed to process "${article.title}":`, err);
      failed++;
    }
  }

  console.log(
    `[Pipeline] Done. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`
  );
}

export function startScheduler(): void {
  // Run every hour (reduced from 30min — top stories don't change that fast)
  cron.schedule("0 * * * *", async () => {
    await runPipeline();
  });

  // Run once immediately on startup
  runPipeline().catch(console.error);

  console.log("[Scheduler] Pipeline scheduled every hour");
}
