import { prisma } from "./client";

export async function upsertUser(
  userId: string,
  email: string,
  username: string
): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email, username },
      update: {},
    });
  } catch (err: unknown) {
    // Unique constraint violation (P2002): a stale record exists with the same
    // email or username but a different userId (e.g. after account re-creation).
    // Delete the conflicting record and create a fresh one.
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      try {
        await prisma.user.deleteMany({
          where: { OR: [{ email }, { username }], NOT: { id: userId } },
        });
        await prisma.user.create({ data: { id: userId, email, username } });
      } catch {
        // If still failing, silently swallow — the route will surface its own error
      }
    }
  }
}
