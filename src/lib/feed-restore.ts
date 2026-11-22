"use client";

import type { LyricsFeedItem } from "@/lib/use-lyrics-feed";
import type { OfflineDataset } from "@/lib/offline-data";

/**
 * استعادة قائمة الرئيسية عند الرجوع إليها (زرّ «رجوع» من تفاصيل نشيد): القائمة
 * بتمرير لانهائي، فحين تُركَّب من جديد لا تحمل إلا الصفحة الأولى من الخادم، فيقع
 * المستخدم في غير موضعه. لذا تُحفظ لقطة من حالتها (كل ما حُمِّل + موضع التمرير)
 * عند مغادرتها، وتُستعاد حين يكون التنقّل رجوعًا/تقدّمًا في السجلّ (popstate)
 * بنفس معايير البحث. التنقّل العادي إلى الرئيسية (القائمة أو الشعار) يبدأ من الأعلى.
 *
 * اللقطة في الذاكرة فقط (لا sessionStorage): التنقّل داخل التطبيق لا يُعيد تحميل
 * الصفحة، ونصوص الأناشيد المحمَّلة قد تتجاوز حدود التخزين.
 */
export interface FeedSnapshot {
  key: string;
  items: LyricsFeedItem[];
  hasMore: boolean;
  total: number;
  page: number;
  serverCount: number;
  deleted: number;
  removedCount: number;
  offline: OfflineDataset | null;
  scrollY: number;
}

/** نسختا الرئيسية (موبايل/سطح مكتب) مركّبتان معًا، فلكلّ منهما لقطتها. */
export type FeedVariant = "mobile" | "desktop";

const snapshots = new Map<FeedVariant, FeedSnapshot>();

// زمن آخر تنقّل في السجلّ (رجوع/تقدّم). التركيب الذي يليه مباشرةً استعادة لا بداية جديدة.
let lastPopAt = -Infinity;
const POP_WINDOW_MS = 3000;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopAt = performance.now();
  });
}

// آخر مسارين زارهما المستخدم داخل التطبيق (يحدّثهما AppChrome): لمعرفة هل الصفحة
// السابقة في السجلّ هي الرئيسية، فيكون «الرجوع» إليها عودةً إلى موضعه في القائمة.
let currentPath: string | null = null;
let previousPath: string | null = null;

export function noteRoute(pathname: string) {
  if (pathname === currentPath) return;
  previousPath = currentPath;
  currentPath = pathname;
}

/** وصل المستخدم إلى الصفحة الحالية من القائمة مباشرةً، ولقطتها محفوظة. */
export function cameFromFeed(): boolean {
  return previousPath === "/" && snapshots.size > 0;
}

/**
 * حُذف نشيد من صفحة تفاصيله: يُزال من اللقطات المحفوظة قبل الرجوع إلى القائمة،
 * فتظهر في موضعها نفسه بدونه، وتُطلب الصفحات التالية بإزاحة أقلّ بواحد.
 */
export function removeFromFeedSnapshots(id: string) {
  for (const snapshot of snapshots.values()) {
    const items = snapshot.items.filter((i) => i.id !== id);
    if (items.length === snapshot.items.length) continue;
    snapshot.items = items;
    snapshot.total = Math.max(0, snapshot.total - 1);
    snapshot.deleted += 1;
    snapshot.removedCount += 1;
  }
}

export function saveFeedSnapshot(variant: FeedVariant, snapshot: FeedSnapshot) {
  snapshots.set(variant, snapshot);
}

/** لقطة هذه النسخة إن كان التركيب ناتجًا عن رجوع بنفس معايير البحث؛ تُستهلك مرة واحدة. */
export function takeFeedSnapshot(variant: FeedVariant, key: string): FeedSnapshot | null {
  if (typeof window === "undefined") return null;
  const snapshot = snapshots.get(variant);
  snapshots.delete(variant);
  if (!snapshot || snapshot.key !== key) return null;
  if (performance.now() - lastPopAt > POP_WINDOW_MS) return null;
  return snapshot;
}

/**
 * دون اتصال لا ينجح التنقّل داخل التطبيق: فتح نشيد يُحمّل الصفحة كاملةً (من هيكل
 * الـ SW)، فتضيع اللقطة التي في الذاكرة، والرجوع يُحمّل هيكل الرئيسية من جديد.
 * لذلك تُحفظ عند مغادرة الصفحة (pagehide) لقطة مصغّرة في sessionStorage: معرّفات
 * الأناشيد المعروضة فقط (نصوصها في بيانات الجهاز) وموضع التمرير، وتُستعاد حين
 * يكون تحميل الصفحة نفسه رجوعًا/تقدّمًا في السجلّ.
 */
export interface PersistedFeedSnapshot {
  key: string;
  ids: string[];
  scrollY: number;
  /** أول نشيد ظاهر وبُعده عن أعلى الشاشة: يُعاد إلى البُعد نفسه، فلا يزيحه اختلاف ما
   * فوق القائمة (مثل تلميح السحب الذي لا يظهر دون اتصال). */
  anchor: { id: string; top: number } | null;
}

/** رابط النشيد الظاهر في القائمة (نسختا الرئيسية مركّبتان معًا، والمخفيّة بلا offsetParent). */
function visibleFeedLink(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`a[href="/lyrics/${CSS.escape(id)}"]`)) {
    if (el.offsetParent !== null) return el;
  }
  return null;
}

/** أول نشيد يبدأ داخل الشاشة من بين المعروضة؛ null إن لم تكن هذه النسخة ظاهرة. */
export function findFeedAnchor(ids: string[]): { id: string; top: number } | null {
  let fallback: { id: string; top: number } | null = null;
  for (const id of ids) {
    const el = visibleFeedLink(id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    if (top >= 0) return { id, top };
    fallback = { id, top };
  }
  return fallback;
}

/** يمرّر الصفحة حتى يعود النشيد المرجعي إلى بُعده عن أعلى الشاشة؛ false إن لم يُعثر عليه. */
export function scrollToFeedAnchor(anchor: { id: string; top: number }): boolean {
  const el = visibleFeedLink(anchor.id);
  if (!el) return false;
  window.scrollBy(0, el.getBoundingClientRect().top - anchor.top);
  return true;
}

const PERSIST_PREFIX = "arabic-lyrics:feed-restore:";
const persistChecked = new Set<FeedVariant>();

export function persistFeedSnapshot(variant: FeedVariant, snapshot: PersistedFeedSnapshot) {
  try {
    sessionStorage.setItem(PERSIST_PREFIX + variant, JSON.stringify(snapshot));
  } catch {
    // تخزين غير متاح أو ممتلئ: يبدأ الرجوع دون اتصال من أعلى القائمة كما كان.
  }
}

/** أُعيد عرض الصفحة من ذاكرة المتصفح (bfcache) بحالتها كاملة: اللقطة المحفوظة لا حاجة لها. */
export function discardPersistedFeedSnapshot(variant: FeedVariant) {
  try {
    sessionStorage.removeItem(PERSIST_PREFIX + variant);
  } catch {
    // لا شيء.
  }
}

/** اللقطة المحفوظة لهذه النسخة إن كان تحميل هذه الصفحة رجوعًا في السجلّ؛ مرة واحدة لكل تحميل. */
export function takePersistedFeedSnapshot(variant: FeedVariant): PersistedFeedSnapshot | null {
  if (typeof window === "undefined" || persistChecked.has(variant)) return null;
  persistChecked.add(variant);
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PERSIST_PREFIX + variant);
    sessionStorage.removeItem(PERSIST_PREFIX + variant);
  } catch {
    return null;
  }
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!raw || nav?.type !== "back_forward") return null;
  try {
    const parsed = JSON.parse(raw) as PersistedFeedSnapshot;
    if (!Array.isArray(parsed.ids) || typeof parsed.key !== "string") return null;
    return { ...parsed, anchor: parsed.anchor ?? null };
  } catch {
    return null;
  }
}
