import { Router, Request, Response } from "express";
import { prisma } from "../db/client";

const router = Router();

router.get("/:articleId/sources", async (req: Request, res: Response) => {
  const articleId = req.params.articleId as string;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      sourceName: true,
      sourceUrl: true,
      sourceCount: true,
    },
  });

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const gistSources = await prisma.gistSource.findMany({
    where: { articleId },
    select: { id: true, sourceName: true, sourceUrl: true, imageUrl: true },
  });

  const sources =
    gistSources.length > 0
      ? gistSources
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
