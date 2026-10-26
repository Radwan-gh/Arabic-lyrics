// القراءة دون اتصال (Offline PWA): أنواع اللقطات ومعرّفاتها، وتهيئة كاش الصفحات.
//
// الفكرة: لا توجد صفحات خاصة بوضع «دون اتصال». يخزّن الـ service worker
// (public/sw.js) صفحات التطبيق نفسها (HTML الحقيقي لكل مسار) ويخدمها عند انقطاع
// الشبكة، فيرى المستخدم الواجهة ذاتها. يبني العميل هنا قائمة الصفحات المطلوب
// تخزينها مع «نسخة» لكل منها مشتقّة من اللقطات، فيعيد الـ SW جلب ما تغيّر فقط.

import type { LyricsSort } from "@/lib/lyrics-search";

/** لقطة المجموعة العامة (كل الأناشيد) — عامة وقابلة للتخزين بأمان. */
export const OFFLINE_LYRICS_URL = "/api/public/lyrics";

/** بيانات المستخدم الخفيفة (مفضّلته وقوائمه) — خاصة، تُمسح عند تسجيل الخروج. */
export const OFFLINE_ME_URL = "/api/offline/me";

/** رسالة إلى الـ SW: خزّن هذه الصفحات (ما لم تكن نسختها المخزَّنة مطابقة). */
export const WARM_PAGES_MESSAGE = "WARM_PAGES";

/** رسالة من الـ SW: تغيّرت بيانات على الخادم (طلب تعديل نجح) — أعِد التهيئة. */
export const DATA_CHANGED_MESSAGE = "DATA_CHANGED";

/** ترويسة يُرسلها الـ SW عند التخزين المسبق، لئلّا يُحتسب الجلب مشاهدةً. */
export const PRECACHE_HEADER = "x-sw-precache";

/** خيارات ترتيب المفضّلة كما تظهر في الرابط (الافتراضي «recent» بلا معامل). */
const FAVORITES_SORT_PARAMS = ["", "oldest", "title", "artist", "custom"];

/** كل كم تُحدَّث صفحة «الوصلات العامة» المخزَّنة (لا لقطة لها نشتقّ منها نسخة). */
const DISCOVER_REFRESH_MS = 60 * 60 * 1000;

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
  isPublic: boolean;
  /** معرّفات الأناشيد بالترتيب — يُحلّ محتواها من لقطة المجموعة. */
  itemIds: string[];
}

export interface OfflineMe {
  updatedAt: string;
  /** معرّفات المفضّلة بالترتيب الخاص للمستخدم. */
  favorites: string[];
  playlists: OfflinePlaylist[];
}

export interface WarmPage {
  url: string;
  /** نسخة المحتوى المتوقَّع: يُعاد الجلب فقط إن اختلفت عن المخزَّنة. */
  version: string;
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
function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * قائمة صفحات التطبيق المطلوب تخزينها للقراءة دون اتصال، مع نسخة كل صفحة.
 * النسخة تُشتقّ من البيانات التي تعرضها الصفحة: نص النشيد وحالة تفضيله لصفحته،
 * ومجمل المجموعة وبيانات المستخدم لصفحات القوائم. الأهم أولًا (القوائم ثم الأناشيد).
 */
export function buildWarmPages(collection: OfflineCollection, me: OfflineMe | null): WarmPage[] {
  const favorites = new Set(me?.favorites ?? []);
  const lyricVersions = new Map<string, string>();
  for (const l of collection.lyrics) {
    const fields = [l.title, l.artist ?? "", l.album ?? "", l.tags.join(","), l.createdAt, l.contentHtml];
    lyricVersions.set(l.id, hashString(fields.join("\u0001")));
  }
  const lyricVersion = (id: string) => `${lyricVersions.get(id) ?? ""}${favorites.has(id) ? ".f" : ""}`;

  const collectionVersion = hashString([...lyricVersions.values()].join("."));
  const meVersion = me ? hashString(JSON.stringify({ favorites: me.favorites, playlists: me.playlists })) : "";
  const listsVersion = `${collectionVersion}.${meVersion}`;

  const pages: WarmPage[] = [
    { url: "/", version: listsVersion },
    { url: "/discover", version: String(Math.floor(Date.now() / DISCOVER_REFRESH_MS)) },
  ];

  if (me) {
    for (const sort of FAVORITES_SORT_PARAMS) {
      pages.push({ url: sort ? `/favorites?sort=${sort}` : "/favorites", version: listsVersion });
    }
    pages.push({ url: "/playlists", version: meVersion });
    for (const p of me.playlists) {
      const id = encodeURIComponent(p.id);
      pages.push({ url: `/playlists/${id}`, version: listsVersion });
      pages.push({ url: `/playlists/${id}/view`, version: listsVersion });
      // صفحة النشيد ضمن الوصلة (التنقّل بين عناصرها) تختلف عن صفحته المفردة.
      const itemsVersion = hashString(p.itemIds.join(","));
      for (const itemId of p.itemIds) {
        pages.push({
          url: `/lyrics/${encodeURIComponent(itemId)}?playlist=${id}`,
          version: `${lyricVersion(itemId)}.${itemsVersion}`,
        });
      }
    }
  }

  for (const l of collection.lyrics) {
    pages.push({ url: `/lyrics/${encodeURIComponent(l.id)}`, version: lyricVersion(l.id) });
  }
  return pages;
}

function waitForController(timeoutMs = 10_000): Promise<boolean> {
  if (navigator.serviceWorker.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve(ok);
    };
    const onChange = () => done(true);
    const timer = setTimeout(() => done(!!navigator.serviceWorker.controller), timeoutMs);
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
  });
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * يجلب اللقطات (فيخزّنها الـ SW) ثم يطلب منه تخزين صفحات التطبيق التي تغيّرت.
 * يعمل بصمت في الخلفية؛ أي فشل يُهمَل ويُستكمل في التهيئة التالية.
 */
export async function warmOfflineCache(authenticated: boolean): Promise<void> {
  if (!navigator.onLine) return;
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) return;
  // في الزيارة الأولى لا يتحكّم الـ SW بالصفحة فور تفعيله؛ ننتظره كي تمرّ طلبات
  // اللقطات عبره فيخزّنها.
  if (!(await waitForController())) return;

  const [collection, me] = await Promise.all([
    fetchJson<OfflineCollection>(OFFLINE_LYRICS_URL),
    authenticated ? fetchJson<OfflineMe>(OFFLINE_ME_URL) : Promise.resolve(null),
    // اقتراحات الوسوم في شريط التصفية — تُخزَّن لتعمل دون اتصال.
    fetch("/api/tags", { cache: "no-store" }).catch(() => undefined),
  ]);
  if (!collection) return;

  worker.postMessage({ type: WARM_PAGES_MESSAGE, pages: buildWarmPages(collection, me) });
}
