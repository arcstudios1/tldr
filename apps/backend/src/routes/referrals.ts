import { Router, Request, Response } from "express";
import { prisma } from "../db/client";
import crypto from "crypto";

const router = Router();

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

router.get("/:userId/referral", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  let referral = await prisma.referral.findFirst({
    where: { referrerId: userId, referredEmail: null },
    orderBy: { createdAt: "desc" },
  });

  if (!referral) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: generateCode(),
      },
    });
  }

  const totalReferred = await prisma.referral.count({
    where: { referrerId: userId, status: "completed" },
  });

  res.json({
    code: referral.referralCode,
    link: `https://gists.news/r/${referral.referralCode}`,
    totalReferred,
  });
});

router.get("/:userId/referral/stats", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const completed = referrals.filter((r) => r.status === "completed").length;
  const pending = referrals.filter((r) => r.status === "pending").length;

  res.json({
    total: referrals.length,
    completed,
    pending,
    referrals: referrals.map((r) => ({
      code: r.referralCode,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    })),
  });
});

router.post("/referral/redeem", async (req: Request, res: Response) => {
  const { code, email } = req.body;

  if (!code || !email) {
    res.status(400).json({ error: "code and email required" });
    return;
  }

  const referral = await prisma.referral.findUnique({
    where: { referralCode: code },
  });

  if (!referral) {
    res.status(404).json({ error: "Invalid referral code" });
    return;
  }

  if (referral.status === "completed") {
    res.status(400).json({ error: "Code already redeemed" });
    return;
  }

  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      referredEmail: email,
      status: "completed",
      completedAt: new Date(),
    },
  });

  // Bump referrer reputation
  await prisma.user.update({
    where: { id: referral.referrerId },
    data: { reputation: { increment: 10 } },
  });

  // Generate a fresh unused code for the referrer
  await prisma.referral.create({
    data: {
      referrerId: referral.referrerId,
      referralCode: generateCode(),
    },
  });

  res.json({ success: true, message: "Referral redeemed successfully" });
});

export default router;
