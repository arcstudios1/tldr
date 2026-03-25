import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";

const router = Router();

const SearchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(30).default(15),
  cursor: z.string().optional(),
});

router.get("/", async (req: Request, res: Response) => {
  const parsed = SearchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { q, limit, cursor } = parsed.data;

  const articles = await prisma.article.findMany({
    where: {
      isAd: false,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { sourceName: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ feedScore: "desc" }, { publishedAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, -1) : articles;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const normalized = items.map((a) => ({
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

  res.json({ items: normalized, nextCursor, query: q });
});

export default router;
