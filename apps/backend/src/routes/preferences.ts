import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { Category } from "@prisma/client";
import { upsertUser } from "../db/upsertUser";

const router = Router();

router.get("/:userId/preferences", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  try {
    const prefs = await prisma.userPreference.findUnique({ where: { userId } });
    res.json(prefs ?? { categories: [], excludedSources: [] });
  } catch (err) {
    console.error("[Preferences] GET error:", err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

const PreferencesSchema = z.object({
  categories: z.array(z.nativeEnum(Category)),
  excludedSources: z.array(z.string()),
  email: z.string().email(),
  username: z.string().min(1),
});

router.put("/:userId/preferences", async (req: Request, res: Response) => {
  const parsed = PreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = req.params.userId as string;
  const { categories, excludedSources, email, username } = parsed.data;

  try {
    await upsertUser(userId, email, username);

    const prefs = await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, categories, excludedSources },
      update: { categories, excludedSources },
    });

    res.json(prefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    console.error("[Preferences] PUT error:", err);
    res.status(500).json({ error: "Failed to save preferences", detail: message, code });
  }
});

export default router;
