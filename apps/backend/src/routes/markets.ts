import { Router, Request, Response } from "express";
import { prisma } from "../db/client";
import { Category } from "@prisma/client";

const router = Router();

const STOP_WORDS = new Set([
  "a","an","the","in","on","at","to","for","of","and","or","but",
  "is","are","was","were","be","been","by","with","from","that",
  "this","it","its","as","up","how","what","who","why","when",
  "where","new","says","said","will","has","have","had","not",
  "over","after","into","about","more","than","just","could",
  "would","should","may","might","also","back","than","then",
  "which","their","there","these","those","some","any","all",
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

function scoreMatch(articleText: string, marketQuestion: string): number {
  const articleKw = extractKeywords(articleText);
  const marketKw = extractKeywords(marketQuestion);
  let shared = 0;
  for (const word of articleKw) {
    if (marketKw.has(word)) shared++;
  }
  return shared;
}

router.get("/for-article/:articleId", async (req: Request, res: Response) => {
  const articleId = req.params.articleId as string;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, summary: true, category: true },
  });

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  // Fetch all stored markets (capped at 100 — DB is small)
  const allMarkets = await prisma.predictionMarket.findMany({
    orderBy: { volume: "desc" },
    take: 100,
  });

  if (allMarkets.length === 0) {
    res.json({ market: null });
    return;
  }

  const articleText = `${article.title} ${article.summary}`;

  // Score each market by keyword overlap
  const scored = allMarkets.map((m) => ({
    market: m,
    score: scoreMatch(articleText, m.question),
  }));

  // Sort: keyword match first, then same category, then volume
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aCat = a.market.category === article.category ? 1 : 0;
    const bCat = b.market.category === article.category ? 1 : 0;
    if (bCat !== aCat) return bCat - aCat;
    return b.market.volume - a.market.volume;
  });

  const best = scored[0];

  // Only return a keyword match OR a same-category market with meaningful volume
  const isKeywordMatch = best.score >= 1;
  const isCategoryMatch = best.market.category === article.category && best.market.volume > 1_000_000;

  if (!isKeywordMatch && !isCategoryMatch) {
    res.json({ market: null });
    return;
  }

  res.json({ market: best.market, matchScore: best.score, matchType: isKeywordMatch ? "keyword" : "category" });
});

router.get("/", async (req: Request, res: Response) => {
  const { category, limit } = req.query;

  const where: Record<string, unknown> = {};
  if (category && typeof category === "string") {
    where.category = category.toUpperCase() as Category;
  }

  const markets = await prisma.predictionMarket.findMany({
    where,
    orderBy: { volume: "desc" },
    take: Math.min(Number(limit) || 10, 30),
  });

  res.json({ items: markets });
});

router.get("/:category", async (req: Request, res: Response) => {
  const cat = String(req.params.category).toUpperCase() as Category;
  const markets = await prisma.predictionMarket.findMany({
    where: { category: cat },
    orderBy: { volume: "desc" },
    take: 5,
  });

  res.json({ items: markets });
});

export default router;
