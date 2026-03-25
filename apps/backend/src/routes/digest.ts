import { Router, Request, Response } from "express";
import { prisma } from "../db/client";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const articles = await prisma.article.findMany({
    where: {
      isAd: false,
      publishedAt: { gte: todayStart },
    },
    orderBy: { feedScore: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      summary: true,
      imageUrl: true,
      sourceUrl: true,
      sourceName: true,
      category: true,
      publishedAt: true,
      sourceCount: true,
      importanceScore: true,
      feedScore: true,
      _count: { select: { comments: true } },
      votes: { select: { value: true } },
    },
  });

  const totalToday = await prisma.article.count({
    where: { isAd: false, publishedAt: { gte: todayStart } },
  });

  const sourcesUsed = await prisma.article.groupBy({
    by: ["sourceName"],
    where: { isAd: false, publishedAt: { gte: todayStart } },
  });

  const categoryBreakdown = await prisma.article.groupBy({
    by: ["category"],
    where: { isAd: false, publishedAt: { gte: todayStart } },
    _count: { id: true },
  });

  const items = articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    imageUrl: a.imageUrl ?? null,
    sourceUrl: a.sourceUrl,
    sourceName: a.sourceName,
    category: a.category,
    publishedAt: a.publishedAt,
    sourceCount: a.sourceCount,
    importanceScore: a.importanceScore,
    feedScore: a.feedScore,
    commentCount: a._count.comments,
    upvotes: a.votes.filter((v) => v.value === 1).length,
    downvotes: a.votes.filter((v) => v.value === -1).length,
    userVote: 0,
  }));

  res.json({
    date: todayStart.toISOString(),
    items,
    stats: {
      totalArticles: totalToday,
      totalSources: sourcesUsed.length,
      categories: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
    },
  });
});

export default router;
