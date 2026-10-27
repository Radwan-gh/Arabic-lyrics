// القراءة دون اتصال (Offline PWA): الأنواع والثوابت المشتركة بين الخادم والعميل.
//
// الفكرة: قاعدة بيانات على الجهاز (IndexedDB — راجع offline-db.ts) تُزامَن من
// الخادم بالتغييرات فقط (حقل updatedAt)، وتعرض منها صفحات التطبيق نفسها بياناتها
// حين لا يتوفّر اتصال. لا يخزّن الـ service worker إلا «هيكلًا» واحدًا لكل نوع
// صفحة (HTML بلا بيانات — راجع isShellRequest)، فتُحمِّل الصفحة بياناتها من الجهاز.

import type { LyricsSort } from "@/lib/lyrics-search";

/** مزامنة الأناشيد: كلها، أو ما تغيّر منذ `?since=` (راجع LyricsSyncResponse). */
export const OFFLINE_LYRICS_URL = "/api/public/lyrics";

/** بيانات المستخدم الخفيفة (مفضّلته ووصلاته) — خاصة، تُمسح عند تغيّر الجلسة. */
export const OFFLINE_ME_URL = "/api/offline/me";

/** رسالة إلى الـ SW: خزّن هياكل هذه الصفحات (ما لم تكن نسختها المخزَّنة مطابقة). */
export const WARM_SHELLS_MESSAGE = "WARM_SHELLS";

/** سؤال الـ SW عن حالة حفظ الهياكل، وردّه وبثّه للتقدّم. */
export const WARM_STATUS_MESSAGE = "WARM_STATUS";

/** رسالة من الـ SW: تغيّرت بيانات على الخادم (طلب تعديل نجح) — أعِد المزامنة. */
export const DATA_CHANGED_MESSAGE = "DATA_CHANGED";

/**
 * ترويسة يُرسلها الـ SW حين يجلب «هيكل» صفحة: تُصيِّر الصفحة حينها واجهتها بلا
 * بيانات ودون الوصول لقاعدة البيانات، لتملأها في المتصفح من بيانات الجهاز.
 */
export const SHELL_HEADER = "x-sw-shell";

export function isShellRequest(headers: { get(name: string): string | null }): boolean {
  return headers.get(SHELL_HEADER) === "1";
}

export interface OfflineLyric {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  /** ISO string — يُحوَّل إلى Date عند العرض. */
  createdAt: string;
  /** ISO string — آخر تعديل (أساس المزامنة بالتغييرات). */
  updatedAt: string;
  /** HTML مُنقّى مسبقًا عبر renderLyricsHtml. */
  contentHtml: string;
  viewCount: number;
  createdById: string | null;
  createdByName: string | null;
  /**
   * موضع النشيد في الترتيب الأبجدي التصاعدي كما تُرجعه قاعدة البيانات
   * (buildLyricsOrderBy("title_asc")). يُحسب على الخادم لأن ترتيب Postgres يتبع
   * collation القاعدة، ولا يمكن مطابقته بدقة بمقارنة نصوص في المتصفح. يُشتقّ على
   * الجهاز من `order` في كل مزامنة (راجع offline-db).
   */
  titleRank?: number;
  /**
   * رقم مجموعة التعادل في الترتيب الأبجدي: يتساوى فقط للأناشيد ذات العنوان
   * (المُطبَّع والأصلي) المتطابق. يلزم للترتيب التنازلي، الذي يعكس المجموعات
   * ويُبقي المعرّف تصاعديًا داخلها.
   */
  titleGroup?: number;
}

export interface LyricsSyncResponse {
  /** وقت الخادم عند الاستجابة — يُرسَل `since` في المزامنة التالية. */
  serverTime: string;
  /** كل الأناشيد الحالية بالترتيب الأبجدي: [المعرّف، مجموعة التعادل]. ما ليس فيها حُذف. */
  order: [string, number][];
  /** الأناشيد المتغيّرة منذ `since` (أو كلها إن لم يُرسَل). */
  lyrics: OfflineLyric[];
}

export interface OfflineFavorite {
  lyricsId: string;
  /** ISO string — تاريخ الإضافة إلى المفضّلة (لترتيب «الأحدث/الأقدم»). */
  createdAt: string;
}

export interface OfflinePlaylist {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  shareToken: string;
  /** معرّفات الأناشيد بالترتيب — يُحلّ محتواها من أناشيد الجهاز. */
  itemIds: string[];
}

export interface OfflineMe {
  /** المفضّلة بالترتيب الخاص للمستخدم. */
  favorites: OfflineFavorite[];
  playlists: OfflinePlaylist[];
}

/** حالة الحفظ للاستخدام دون اتصال (البيانات وهياكل الصفحات معًا). */
export interface OfflineStatus {
  /** عدد خطوات الحفظ المطلوبة لهذه الجلسة. */
  total: number;
  /** عدد ما اكتمل منها. */
  done: number;
  /** حفظ جارٍ الآن. */
  running: boolean;
  /** كل ما يلزم محفوظ بنسخته الحالية. */
  complete: boolean;
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

/** بصمة نصية قصيرة (FNV-1a بـ 32 بت) — تكفي لكشف التغيّر، لا للأمان. */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
