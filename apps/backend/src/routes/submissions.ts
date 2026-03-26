import { Router, Request, Response } from "express";
import { prisma } from "../db/client";
import { Category } from "@prisma/client";
import { summarizeArticle } from "../services/summarizer";
import { adminAuth } from "../middleware/adminAuth";

const router = Router();

const VALID_CATEGORIES = new Set(["TECH", "FINANCE", "POLITICS", "CULTURE", "SPORTS"]);

router.post("/submit", async (req: Request, res: Response) => {
  const { userId, email, username, title, url, category, description } = req.body;

  if (!userId || !title || !url || !category) {
    res.status(400).json({ error: "userId, title, url, and category are required" });
    return;
  }

  // Verify that the authenticated user matches the submitted userId
  const verifiedId = req.headers["x-verified-user-id"] as string | undefined;
  if (verifiedId && verifiedId !== userId) {
    res.status(403).json({ error: "User ID mismatch" });
    return;
  }

  if (!VALID_CATEGORIES.has(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  // Validate URL format
  try {
    const parsed = new URL(url as string);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "URL must use http or https" });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  // Ensure user exists (upsert)
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: email || "unknown", username: username || "user" },
    update: {},
  });

  // Check for duplicate URL
  const existingArticle = await prisma.article.findUnique({ where: { sourceUrl: url } });
  if (existingArticle) {
    res.status(409).json({ error: "This story has already been submitted", articleId: existingArticle.id });
    return;
  }

  const existingSub = await prisma.userSubmission.findFirst({
    where: { url, status: "pending" },
  });
  if (existingSub) {
    res.status(409).json({ error: "This URL is already pending review" });
    return;
  }

  const submission = await prisma.userSubmission.create({
    data: {
      userId,
      title,
      url,
      category: category as Category,
      description: description || null,
    },
  });

  // Auto-approve for users with reputation >= 50
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { reputation: true } });
  if (user && user.reputation >= 50) {
    await approveSubmission(submission.id);
    res.status(201).json({ id: submission.id, status: "approved", message: "Auto-approved based on reputation" });
    return;
  }

  res.status(201).json({ id: submission.id, status: "pending" });
});

router.get("/submissions", async (req: Request, res: Response) => {
  const { status, userId } = req.query;

  const where: Record<string, unknown> = {};
  if (status && typeof status === "string") where.status = status;
  if (userId && typeof userId === "string") where.userId = userId;

  const submissions = await prisma.userSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { username: true, reputation: true } } },
  });

  res.json({ items: submissions });
});

// Approval is an admin action — require ADMIN_SECRET header
router.post("/submissions/:id/approve", adminAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const submission = await prisma.userSubmission.findUnique({ where: { id } });
  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (submission.status !== "pending") {
    res.status(400).json({ error: `Submission is already ${submission.status}` });
    return;
  }

  const article = await approveSubmission(id);
  if (!article) {
    res.status(500).json({ error: "Failed to create article from submission" });
    return;
  }

  // Boost submitter reputation
  await prisma.user.update({
    where: { id: submission.userId },
    data: { reputation: { increment: 5 } },
  });

  res.json({ articleId: article.id, status: "approved" });
});

async function approveSubmission(submissionId: string) {
  const submission = await prisma.userSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return null;

  try {
    const { headline, summary } = await summarizeArticle(
      submission.title,
      submission.description || submission.title
    );

    const article = await prisma.article.create({
      data: {
        title: headline,
        summary,
        sourceUrl: submission.url,
        sourceName: "Community",
        category: submission.category,
        publishedAt: new Date(),
        importanceScore: 4,
        feedScore: 0,
        submittedBy: submission.userId,
      },
    });

    await prisma.userSubmission.update({
      where: { id: submissionId },
      data: { status: "approved", articleId: article.id },
    });

    return article;
  } catch (err) {
    console.error("[Submissions] Failed to approve:", err);
    return null;
  }
}

export default router;
