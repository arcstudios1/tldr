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
    // Update the conflicting record's ID to the current userId — preserves all
    // associated data (votes, comments, bookmarks) instead of silently deleting.
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      try {
        const existing = await prisma.user.findFirst({
          where: { OR: [{ email }, { username }], NOT: { id: userId } },
          select: { id: true },
        });
        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { id: userId, email, username },
          });
        } else {
          await prisma.user.create({ data: { id: userId, email, username } });
        }
      } catch {
        // If still failing, silently swallow — the route will surface its own error
      }
    }
  }
}
