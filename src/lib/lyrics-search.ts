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
export const LYRICS_PAGE_SIZE = 50;

/** أبجدي (تصاعدي/تنازلي حسب الحرف الأول)، أو بتاريخ الإضافة (الأحدث/الأقدم). */
export type LyricsSort = "title_asc" | "title_desc" | "date_desc" | "date_asc";

const LYRICS_SORTS: readonly LyricsSort[] = ["title_asc", "title_desc", "date_desc", "date_asc"];

function isLyricsSort(value: string | null | undefined): value is LyricsSort {
  return !!value && (LYRICS_SORTS as readonly string[]).includes(value);
}

/** يتحقّق من قيمة `sort` القادمة من الرابط، ويعود إلى `fallback` إن كانت غائبة أو غير صالحة. */
export function parseLyricsSort(value: string | undefined | null, fallback: LyricsSort): LyricsSort {
  return isLyricsSort(value) ? value : fallback;
}

/**
 * يبني orderBy للأناشيد حسب الترتيب المطلوب. الترتيب الأبجدي يعتمد على
 * `titleNormalized` (بلا تشكيل وبصور حروف موحَّدة) حتى يتطابق ترتيب الفهرس مع
 * توقّع القارئ (مثلاً "أحمد" و"احمد" يقعان معًا)، مع العنوان الأصلي كفاصل تعادل.
 * `id` فاصل تعادل أخير في كل الحالات: بلا مفتاح فريد قد يتعادل عدد كبير من
 * الصفوف (تاريخ إضافة متطابق من إدخال دفعي، أو عناوين مكرّرة)، فيصبح ترتيب
 * Postgres بينها غير حتمي — يظهر هذا تحديدًا في التمرير اللانهائي حيث تُجلب كل
 * صفحة باستعلام منفصل (skip/take)، فيكرّر بعض الصفوف أو يسقط بعضها بين الصفحات.
 */
export function buildLyricsOrderBy(sort: LyricsSort): Prisma.LyricsOrderByWithRelationInput[] {
  switch (sort) {
    case "title_asc":
      return [{ titleNormalized: "asc" }, { title: "asc" }, { id: "asc" }];
    case "title_desc":
      return [{ titleNormalized: "desc" }, { title: "desc" }, { id: "asc" }];
    case "date_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "date_desc":
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}
