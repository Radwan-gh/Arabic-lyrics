import { prisma } from "./prisma";
import { normalizeArabic } from "./arabic-search";
import { buildLyricsWhere } from "./lyrics-search";

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
  const titleNormalized = normalizeArabic(title);
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

/**
 * يقترح أناشيد موجودة يحتوي نصّها الكامل (العنوان/المنشد/المقام/الكلمات) على
 * الكلمة المكتوبة — لعرض قائمة اقتراحات حيّة (autocomplete) أثناء الكتابة.
 * يعيد الاستخدام لمنطق البحث الموحّد `buildLyricsWhere`. يتطلّب حرفين على الأقل
 * بعد التطبيع لتقليل الضجيج، ويستثني معرّفات مُعطاة (مثل المطابقات التامة).
 */
export async function findLyricsSuggestions(
  q: string,
  excludeIds: string[] = [],
): Promise<DuplicateMatch[]> {
  if (normalizeArabic(q).length < 2) return [];

  return prisma.lyrics.findMany({
    where: {
      ...buildLyricsWhere(q, []),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 8,
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
