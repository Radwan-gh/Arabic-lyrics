// أنواع ومعرّفات مشتركة لوضع القراءة دون اتصال (Offline PWA).
//
// الفكرة: التطبيق يجلب هذه اللقطات عبر fetch العادي، ويتولّى الـ service worker
// (public/sw.js) إرجاعها من الكاش عند انقطاع الشبكة — فلا يحتاج العميل لمعرفة
// أسماء الكاش الداخلية.

import type { LyricsSort } from "@/lib/lyrics-search";

/** لقطة المجموعة العامة (كل الأناشيد) — عامة وقابلة للتخزين بأمان. */
export const OFFLINE_LYRICS_URL = "/api/public/lyrics";

/** بيانات المستخدم الخفيفة (مفضّلته وقوائمه) — خاصة، تُمسح عند تسجيل الخروج. */
export const OFFLINE_ME_URL = "/api/offline/me";

/** رسالة تُرسَل إلى الـ service worker لمسح البيانات الخاصة عند الخروج. */
export const CLEAR_PRIVATE_MESSAGE = "CLEAR_PRIVATE";

export interface OfflineLyric {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  /** ISO string — يُحوَّل إلى Date عند العرض. */
  createdAt: string;
  /** HTML مُنقّى مسبقًا عبر renderLyricsHtml. */
  contentHtml: string;
  /**
   * موضع النشيد في الترتيب الأبجدي التصاعدي كما تُرجعه قاعدة البيانات
   * (buildLyricsOrderBy("title_asc")). يُحسب على الخادم لأن ترتيب Postgres يتبع
   * collation القاعدة، ولا يمكن مطابقته بدقة بمقارنة نصوص في المتصفح.
   * اختياري: اللقطات المخزَّنة قبل إضافته لا تحمله (راجع compareOfflineLyrics).
   */
  titleRank?: number;
  /**
   * رقم مجموعة التعادل في الترتيب الأبجدي: يتساوى فقط للأناشيد ذات العنوان
   * (المُطبَّع والأصلي) المتطابق. يلزم للترتيب التنازلي، الذي يعكس المجموعات
   * ويُبقي المعرّف تصاعديًا داخلها.
   */
  titleGroup?: number;
}

export interface OfflineCollection {
  updatedAt: string;
  lyrics: OfflineLyric[];
}

export interface OfflinePlaylist {
  id: string;
  title: string;
  description: string | null;
  /** معرّفات الأناشيد بالترتيب — يُحلّ محتواها من لقطة المجموعة. */
  itemIds: string[];
}

export interface OfflineMe {
  updatedAt: string;
  /** معرّفات المفضّلة بالترتيب الخاص للمستخدم. */
  favorites: string[];
  playlists: OfflinePlaylist[];
}

/**
 * مقارِن يطابق buildLyricsOrderBy لترتيب اللقطة في العميل:
 * - الأبجدي: بالرتبة المحسوبة على الخادم (مطابقة تامة لقاعدة البيانات).
 *   تصاعديًا بـ titleRank، وتنازليًا بـ titleGroup معكوسًا ثم titleRank داخل
 *   المجموعة (= المعرّف تصاعديًا، كما في القاعدة).
 * - الزمني: بتاريخ الإضافة (سلاسل ISO تُقارَن نصيًّا)، والمعرّف فاصل تعادل.
 * لقطة قديمة بلا رتب تعود إلى مقارنة نصية تقريبية للعنوان المُطبَّع (`titleKey`).
 * عام على نوع العنصر (`lyricOf` يستخرج النشيد) ليرتّب مُدخلات مُغلَّفة دون نسخها.
 */
export function compareOfflineLyrics<T>(
  sort: LyricsSort,
  lyricOf: (item: T) => OfflineLyric,
  titleKey: (item: T) => string,
): (a: T, b: T) => number {
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  const byId = (a: T, b: T) => cmp(lyricOf(a).id, lyricOf(b).id);
  const byDate = (a: T, b: T) => cmp(lyricOf(a).createdAt, lyricOf(b).createdAt);
  const byTitle = (a: T, b: T) =>
    titleKey(a).localeCompare(titleKey(b), "ar") || lyricOf(a).title.localeCompare(lyricOf(b).title, "ar");
  const byRank = (a: T, b: T, desc: boolean): number | null => {
    const x = lyricOf(a);
    const y = lyricOf(b);
    if (x.titleRank === undefined || y.titleRank === undefined) return null;
    if (!desc) return x.titleRank - y.titleRank;
    return (y.titleGroup ?? 0) - (x.titleGroup ?? 0) || x.titleRank - y.titleRank;
  };
  switch (sort) {
    case "title_asc":
      return (a, b) => byRank(a, b, false) ?? (byTitle(a, b) || byId(a, b));
    case "title_desc":
      return (a, b) => byRank(a, b, true) ?? (byTitle(b, a) || byId(a, b));
    case "date_asc":
      return (a, b) => byDate(a, b) || byId(a, b);
    case "date_desc":
      return (a, b) => byDate(b, a) || byId(a, b);
  }
}
