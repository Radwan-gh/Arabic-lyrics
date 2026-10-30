import { prisma } from "./prisma";
import { buildSearchText, normalizeArabic } from "./arabic-search";
import { sanitizeLyricsHtml } from "./sanitize-lyrics";
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

/** يجلب النشيد لصفحته دون احتساب مشاهدة (تُحتسب بعد إرسال الصفحة عبر `incrementLyricsViews`). */
export async function getLyrics(id: string) {
  return prisma.lyrics.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
}

/** يزيد عدّاد مشاهدات النشيد؛ يتجاهل الفشل (نشيد محذوف مثلاً) لأنه لا يخصّ القارئ. */
export async function incrementLyricsViews(id: string): Promise<void> {
  await prisma.lyrics
    .update({ where: { id }, data: { viewCount: { increment: 1 } }, select: { id: true } })
    .catch(() => undefined);
}

/** يجلب النشيد ويحتسب المشاهدة في عملية واحدة (مسار الـ API). */
export async function getLyricsAndIncrementViews(id: string) {
  return prisma.lyrics
    .update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { createdBy: { select: { name: true } } },
    })
    .catch(() => null);
}

export interface LyricsWriteInput {
  title: string;
  artist?: string;
  album?: string;
  /** HTML المحرّر (يُنقّى هنا). */
  content: string;
  tags?: string[];
}

/**
 * يجهّز حقول الحفظ المشتركة بين الإضافة والتعديل (مسارات الـ API وخادم MCP):
 * تنقية المحتوى، والعنوان المُطبَّع، ونص البحث. يُرجع null إن خلا النص بعد التنقية.
 */
export function buildLyricsWriteData({ title, artist, album, content, tags }: LyricsWriteInput) {
  const cleanedContent = sanitizeLyricsHtml(content);
  if (!cleanedContent.replace(/<[^>]*>/g, "").trim()) return null;

  return {
    title,
    titleNormalized: normalizeArabic(title),
    artist: artist || null,
    album: album || null,
    content: cleanedContent,
    tags: tags ?? [],
    searchText: buildSearchText({ title, artist, album, content: cleanedContent }),
  };
}
