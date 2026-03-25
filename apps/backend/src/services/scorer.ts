import { prisma } from "../db/client";
import { Category } from "@prisma/client";

const CATEGORY_WEIGHT: Record<Category, number> = {
  POLITICS: 1.4,
  FINANCE:  1.2,
  TECH:     1.2,
  SPORTS:   1.0,
  CULTURE:  0.9,
};

/**
 * Feed ranking formula (HN-style with multi-signal numerator):
 *
 *   feedScore = categoryWeight * (importanceBase + sourceBoost) / timeDecay
 *
 *   categoryWeight = per-category multiplier (Politics > Finance=Tech > Sports > Culture)
 *   importanceBase = importanceScore * 1.5
 *   sourceBoost    = log2(sourceCount + 1) * 2
 *   timeDecay      = (hoursOld + 2) ^ 1.5
 *
 * Platform engagement signals are COMMENTED OUT until user count
 * is large enough for them to be a meaningful signal.
 * Uncomment the block below when ready:
 *
 *   + (upvotes - downvotes) * 2
 *   + commentCount * 1.0
 *   + bookmarkCount * 1.5
 */
function calcFeedScore(params: {
  importanceScore: number;
  sourceCount: number;
  publishedAt: Date;
  category: Category;
  // Platform engagement — re-enable when user base justifies it
  // upvotes: number;
  // downvotes: number;
  // commentCount: number;
  // bookmarkCount: number;
}): number {
  const hoursOld =
    (Date.now() - params.publishedAt.getTime()) / (1000 * 60 * 60);

  const importanceBase = params.importanceScore * 1.5;
  const sourceBoost = Math.log2(params.sourceCount + 1) * 2;
  const catWeight = CATEGORY_WEIGHT[params.category] ?? 1.0;

  // ── Uncomment when platform engagement is meaningful ─────────────────
  // const platformEngagement =
  //   (params.upvotes - params.downvotes) * 2 +
  //   params.commentCount * 1.0 +
  //   params.bookmarkCount * 1.5;
  // ──────────────────────────────────────────────────────────────────────

  const numerator = importanceBase + sourceBoost; // + platformEngagement
  const timeDecay = Math.pow(hoursOld + 2, 1.5);

  return catWeight * (numerator / timeDecay);
}

/**
 * Recalculates feedScore for all articles published in the last 72 hours.
 * Intended to run every 30 minutes via the scheduler.
 */
export async function updateFeedScores(): Promise<void> {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: cutoff }, isAd: false },
    select: {
      id: true,
      importanceScore: true,
      sourceCount: true,
      publishedAt: true,
      category: true,
      // Re-enable with engagement signals:
      // _count: { select: { votes: true, comments: true, bookmarks: true } },
      // votes: { select: { value: true } },
    },
  });

  if (articles.length === 0) return;

  const updates = articles.map((a) => {
    const score = calcFeedScore({
      importanceScore: a.importanceScore,
      sourceCount: a.sourceCount,
      publishedAt: a.publishedAt,
      category: a.category,
    });
    return prisma.article.update({
      where: { id: a.id },
      data: { feedScore: score },
    });
  });

  await Promise.all(updates);
  console.log(`[Scorer] Updated feedScore for ${articles.length} articles`);
}
