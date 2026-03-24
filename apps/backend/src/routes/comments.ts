import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { upsertUser } from "../db/upsertUser";

const router = Router();

const CommentBodySchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  body: z.string().min(1).max(500),
});

const CommentQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// GET /articles/:id/comments
router.get("/:id/comments", async (req: Request, res: Response) => {
  const parsed = CommentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { cursor, limit } = parsed.data;
  const articleId = req.params.id;

  const comments = await prisma.comment.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { id: true, username: true } },
    },
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, -1) : comments;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ items, nextCursor });
});

// POST /articles/:id/comments
router.post("/:id/comments", async (req: Request, res: Response) => {
  const parsed = CommentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId, email, username, body } = parsed.data;
  const articleId = req.params.id;

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  await upsertUser(userId, email, username);

  const comment = await prisma.comment.create({
    data: { userId, articleId, body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { id: true, username: true } },
    },
  });

  res.status(201).json(comment);
});

export default router;
