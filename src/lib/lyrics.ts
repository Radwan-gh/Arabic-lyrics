import { prisma } from "./prisma";
import { normalizeArabicTitle } from "./arabic";

export type DuplicateMatch = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
};

/**
 * يبحث عن الأناشيد الموجودة مسبقاً التي يتطابق عنوانها المُطبَّع مع العنوان
 * المُعطى. يُستخدم لكشف التكرار عند الإضافة/التعديل ولعرض الموجود فعلاً.
 * `excludeId` يستثني سجلاً بعينه (مفيد في وضع التعديل حتى لا يطابق نفسه).
 */
export async function findDuplicateLyrics(
  title: string,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const titleNormalized = normalizeArabicTitle(title);
  if (!titleNormalized) return [];

  return prisma.lyrics.findMany({
    where: {
      titleNormalized,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, artist: true, album: true },
  });
}

export async function getLyricsAndIncrementViews(id: string) {
  return prisma.lyrics
    .update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { createdBy: { select: { name: true } } },
    })
    .catch(() => null);
}
