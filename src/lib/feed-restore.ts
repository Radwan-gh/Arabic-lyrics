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
