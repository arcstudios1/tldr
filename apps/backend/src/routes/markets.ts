import { Router, Request, Response } from "express";
import { prisma } from "../db/client";
import { Category } from "@prisma/client";

const router = Router();

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
