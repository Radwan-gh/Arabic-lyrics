import type { Prisma } from "@prisma/client";
import { normalizeArabic } from "./arabic-search";

/**
 * يبني شرط البحث الموحَّد للأناشيد.
 * يطبّق التطبيع العربي على كلمة البحث ويطابقها ضدّ العمود الظلّي `searchText`
 * (الذي يضمّ العنوان والفنان والمقام وكامل نص النشيد، مُطبَّعًا مسبقًا).
 * يُستخدم من الصفحة الرئيسية ومن مسار الـ API معًا لتفادي تكرار المنطق.
 */
export function buildLyricsWhere(q: string, tags: string[]): Prisma.LyricsWhereInput {
  const nq = normalizeArabic(q);
  return {
    ...(nq ? { searchText: { contains: nq } } : {}),
    ...(tags.length ? { tags: { hasSome: tags } } : {}),
  };
}

/** حجم صفحة القائمة المشترك بين تحميل الرئيسية الأول ومسار الـ API (التمرير اللانهائي). */
export const LYRICS_PAGE_SIZE = 12;

/** أبجدي تصاعدي (أ→ي)، أبجدي تنازلي (ي→أ)، أو الأحدث أولاً (الترتيب القديم). */
export type LyricsSort = "title_asc" | "title_desc" | "newest";

/** ترتيب الرئيسية محصور بالأبجدي فقط (فهرس أناشيد)، بلا خيار «الأحدث». */
export type TitleSort = Extract<LyricsSort, "title_asc" | "title_desc">;

export function parseTitleSort(value: string | undefined | null): TitleSort {
  return value === "title_desc" ? "title_desc" : "title_asc";
}

export function parseLyricsSort(value: string | undefined | null): LyricsSort {
  return value === "title_asc" || value === "title_desc" ? value : "newest";
}

/**
 * يبني orderBy للأناشيد حسب الترتيب المطلوب. الترتيب الأبجدي يعتمد على
 * `titleNormalized` (بلا تشكيل وبصور حروف موحَّدة) حتى يتطابق ترتيب الفهرس مع
 * توقّع القارئ (مثلاً "أحمد" و"احمد" يقعان معًا)، مع العنوان الأصلي كفاصل تعادل.
 */
export function buildLyricsOrderBy(sort: LyricsSort): Prisma.LyricsOrderByWithRelationInput[] {
  if (sort === "title_asc") return [{ titleNormalized: "asc" }, { title: "asc" }];
  if (sort === "title_desc") return [{ titleNormalized: "desc" }, { title: "desc" }];
  return [{ createdAt: "desc" }];
}
