import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { upsertUser } from "../db/upsertUser";

const router = Router();

// GET /users/:userId/bookmarks
router.get("/:userId/bookmarks", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        article: {
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
            votes: { select: { value: true } },
          },
        },
      },
    });

    const articles = bookmarks.map(({ article: a }) => ({
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
    }));

    res.json(articles);
  } catch (err) {
    console.error("[Bookmarks] GET error:", err);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

const BookmarkBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  articleId: z.string().min(1),
});

// POST /users/:userId/bookmarks  — add bookmark
router.post("/:userId/bookmarks", async (req: Request, res: Response) => {
  const parsed = BookmarkBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId } = req.params;
  const { email, username, articleId } = parsed.data;

  try {
    await upsertUser(userId, email, username);
    await prisma.bookmark.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: {},
    });
    res.json({ bookmarked: true });
  } catch (err) {
    console.error("[Bookmarks] POST error:", err);
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

// DELETE /users/:userId/bookmarks/:articleId  — remove bookmark
router.delete("/:userId/bookmarks/:articleId", async (req: Request, res: Response) => {
  const { userId, articleId } = req.params;
  try {
    await prisma.bookmark.deleteMany({ where: { userId, articleId } });
    res.json({ bookmarked: false });
  } catch (err) {
    console.error("[Bookmarks] DELETE error:", err);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

export default router;
