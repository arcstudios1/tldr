import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { Category } from "@prisma/client";

const router = Router();

const FeedQuerySchema = z.object({
  category: z.nativeEnum(Category).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  userId: z.string().optional(),
});

router.get("/", async (req: Request, res: Response) => {
  const parsed = FeedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { category, cursor, limit, userId } = parsed.data;

  let preferredCategories: Category[] = [];
  let excludedSources: string[] = [];

  if (userId) {
    const prefs = await prisma.userPreference.findUnique({ where: { userId } });
    if (prefs) {
      preferredCategories = prefs.categories;
      excludedSources = prefs.excludedSources;
    }
  }

  const articles = await prisma.article.findMany({
    where: {
      isAd: false,
      imageUrl: { not: null },
      // Category bar selection takes priority; fall back to user prefs
      ...(category
        ? { category }
        : preferredCategories.length > 0
          ? { category: { in: preferredCategories } }
          : {}),
      ...(excludedSources.length > 0
        ? { sourceName: { notIn: excludedSources } }
        : {}),
    },
    orderBy: [
      { feedScore: "desc" },
      { publishedAt: "desc" },
    ],
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
      _count: { select: { comments: true } },
      votes: { select: { value: true, userId: true } },
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
    commentCount: a._count.comments,
    upvotes: a.votes.filter((v) => v.value === 1).length,
    downvotes: a.votes.filter((v) => v.value === -1).length,
    userVote: userId ? (a.votes.find((v) => v.userId === userId)?.value ?? 0) : 0,
  }));

  res.json({ items: normalized, nextCursor });
});

export default router;
