import { Router, Request, Response } from "express";
import { prisma } from "../db/client";

const router = Router();

router.get("/:articleId/sources", async (req: Request, res: Response) => {
  const { articleId } = req.params;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      sourceName: true,
      sourceUrl: true,
      sourceCount: true,
      sources: {
        select: {
          id: true,
          sourceName: true,
          sourceUrl: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const sources =
    article.sources.length > 0
      ? article.sources
      : [
          {
            id: "primary",
            sourceName: article.sourceName,
            sourceUrl: article.sourceUrl,
            imageUrl: null,
          },
        ];

  res.json({
    articleId: article.id,
    sourceCount: article.sourceCount,
    sources,
  });
});

export default router;
