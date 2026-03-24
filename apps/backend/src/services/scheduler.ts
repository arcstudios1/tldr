import cron from "node-cron";
import { prisma } from "../db/client";
import { fetchAllFeeds } from "./rss";
import { summarizeArticle } from "./summarizer";

export async function runPipeline(): Promise<void> {
  console.log("[Pipeline] Starting content pipeline run...");
  const articles = await fetchAllFeeds();
  console.log(`[Pipeline] Fetched ${articles.length} raw articles`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
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

      const { headline, summary } = await summarizeArticle(article.title, article.content);

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
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    await runPipeline();
  });

  // Run once immediately on startup
  runPipeline().catch(console.error);

  console.log("[Scheduler] Pipeline scheduled every 30 minutes");
}
