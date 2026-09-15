// أدوات تصفية/ترقيم نقية (بلا React) تُطبَّق على لقطة الأناشيد المخزَّنة عند
// القراءة دون اتصال — تطابق سلوك الاستعلامات المقابلة على الخادم (راجع
// lib/lyrics-search.ts و lib/tags.ts) حتى لا يختلف البحث/الفرز بين الحالتين.

import { normalizeArabic } from "@/lib/arabic-search";
import type { OfflineLyric } from "@/lib/offline";
import type { TagCount } from "@/lib/tags";

/** يصفّي حسب نص البحث المطبَّع عبر فهرس مبنيّ مسبقًا (id → نص مطبَّع). */
export function filterLyricsBySearch(
  list: OfflineLyric[],
  query: string,
  searchIndex: Map<string, string>
): OfflineLyric[] {
  const nq = normalizeArabic(query);
  if (!nq) return list;
  return list.filter((l) => (searchIndex.get(l.id) ?? "").includes(nq));
}

/** يصفّي حسب الوسوم بدلالة hasSome (يُعرض النشيد إن حمل أيًّا من الوسوم المحدَّدة)،
 * مطابقةً لاستعلام الخادم المقابل في lib/lyrics-search.ts. */
export function filterLyricsByTags(list: OfflineLyric[], tags: string[]): OfflineLyric[] {
  if (tags.length === 0) return list;
  return list.filter((l) => l.tags.some((t) => tags.includes(t)));
}

/** يحسب عدد الأناشيد لكل وسم من اللقطة المحلية، بنفس ترتيب lib/tags.ts's
 * getTagCounts (الأكثر استخدامًا أولاً، ثم أبجديًا). */
export function computeTagCounts(list: OfflineLyric[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const l of list) {
    for (const tag of l.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export interface PaginationResult<T> {
  slice: T[];
  pageCount: number;
  page: number;
}

/** يُرجِع شريحة الصفحة الحالية (مُصحَّحة إن تجاوز الرقم عدد الصفحات) وعدد الصفحات. */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const slice = items.slice((current - 1) * pageSize, current * pageSize);
  return { slice, pageCount, page: current };
}
