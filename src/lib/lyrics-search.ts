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
