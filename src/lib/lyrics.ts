import { prisma } from "./prisma";

export async function getLyricsAndIncrementViews(id: string) {
  return prisma.lyrics
    .update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { createdBy: { select: { name: true } } },
    })
    .catch(() => null);
}
