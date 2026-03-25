import { Router, Request, Response } from "express";
import { prisma } from "../db/client";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const articles = await prisma.article.findMany({
    where: {
      isBreaking: true,
      publishedAt: { gte: sixHoursAgo },
      isAd: false,
    },
    orderBy: { breakingScore: "desc" },
    take: 10,
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
      breakingScore: true,
      _count: { select: { comments: true } },
      votes: { select: { value: true } },
    },
  });

  const items = articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    imageUrl: a.imageUrl,
    sourceUrl: a.sourceUrl,
    sourceName: a.sourceName,
    category: a.category,
    publishedAt: a.publishedAt,
    sourceCount: a.sourceCount,
    importanceScore: a.importanceScore,
    feedScore: a.feedScore,
    breakingScore: a.breakingScore,
    commentCount: a._count.comments,
    upvotes: a.votes.filter((v) => v.value === 1).length,
    downvotes: a.votes.filter((v) => v.value === -1).length,
  }));

  res.json({
    count: items.length,
    items,
    lastChecked: new Date().toISOString(),
  });
});

export default router;
