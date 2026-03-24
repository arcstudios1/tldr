import { prisma } from "./client";

export async function upsertUser(
  userId: string,
  email: string,
  username: string
): Promise<void> {
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email, username },
    update: {},
  });
}
