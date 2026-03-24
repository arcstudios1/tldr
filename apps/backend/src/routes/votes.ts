import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { upsertUser } from "../db/upsertUser";

const router = Router();

const VoteBodySchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

// POST /articles/:id/vote
// value: 1 = upvote, -1 = downvote, 0 = remove vote
router.post("/:id/vote", async (req: Request, res: Response) => {
  try {
    const parsed = VoteBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { userId, email, username, value } = parsed.data;
    const articleId = req.params.id as string;

    await upsertUser(userId, email, username);

    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    if (value === 0) {
      await prisma.vote.deleteMany({ where: { userId, articleId } });
    } else {
      await prisma.vote.upsert({
        where: { userId_articleId: { userId, articleId } },
        create: { userId, articleId, value },
        update: { value },
      });
    }

    const votes = await prisma.vote.findMany({ where: { articleId } });
    res.json({
      upvotes: votes.filter((v) => v.value === 1).length,
      downvotes: votes.filter((v) => v.value === -1).length,
      userVote: value,
    });
  } catch (err) {
    console.error("[Vote] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
