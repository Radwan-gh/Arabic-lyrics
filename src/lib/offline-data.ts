"use client";

// قراءة بيانات الجهاز للصفحات حين تُفتح دون اتصال (هيكل بلا بيانات من الـ SW).
// كل صفحة تأخذ بياناتها من الخادم متصلةً، ومن هنا — بنفس الشكل — دون اتصال
// (راجع useOfflinePageData).

import { useEffect, useMemo, useState } from "react";
import { buildSearchText, normalizeArabic } from "@/lib/arabic-search";
import { OFFLINE_DATA_EVENT, readAllLyrics, readMe } from "@/lib/offline-db";
import type { OfflineLyric, OfflineMe } from "@/lib/offline";
import type { TagCount } from "@/lib/tags";

export interface OfflineDataset {
  /** كل الأناشيد مع رتبها الأبجدية. */
  lyrics: OfflineLyric[];
  byId: Map<string, OfflineLyric>;
  /** null للزائر. */
  me: OfflineMe | null;
  favoriteIds: Set<string>;
  /** نصّ البحث المُطبَّع لنشيد (يُحسب عند الطلب ويُحفظ). */
  searchText(lyric: OfflineLyric): string;
}

let datasetPromise: Promise<OfflineDataset | null> | null = null;

if (typeof window !== "undefined") {
  // كتابة جديدة (مزامنة) تُبطل النسخة المقروءة في الذاكرة.
  window.addEventListener(OFFLINE_DATA_EVENT, () => {
    datasetPromise = null;
  });
}

async function buildDataset(): Promise<OfflineDataset | null> {
  const [lyrics, me] = await Promise.all([readAllLyrics(), readMe()]);
  if (!lyrics.length) return null;
  const searchCache = new Map<string, string>();
  return {
    lyrics,
    byId: new Map(lyrics.map((l) => [l.id, l])),
    me,
    favoriteIds: new Set(me?.favorites.map((f) => f.lyricsId) ?? []),
    searchText(lyric) {
      let text = searchCache.get(lyric.id);
      if (text === undefined) {
        text = buildSearchText({ title: lyric.title, artist: lyric.artist, album: lyric.album, content: lyric.contentHtml });
        searchCache.set(lyric.id, text);
      }
      return text;
    },
  };
}

/** بيانات الجهاز (null إن لم تُزامَن بعد أو تعذّرت قراءتها). مشتركة طوال عمر الصفحة. */
export function loadOfflineDataset(): Promise<OfflineDataset | null> {
  if (!datasetPromise) {
    const promise = buildDataset().catch(() => null);
    datasetPromise = promise;
    promise.then((dataset) => {
      if (!dataset && datasetPromise === promise) datasetPromise = null;
    });
  }
  return datasetPromise;
}

/** يطابق البحث الموحَّد على الخادم (buildLyricsWhere): احتواء نصّ مُطبَّع. */
export function matchesSearch(dataset: OfflineDataset, lyric: OfflineLyric, query: string): boolean {
  const nq = normalizeArabic(query);
  return !nq || dataset.searchText(lyric).includes(nq);
}

/** يطابق getTagCounts على الخادم: الأكثر استخدامًا أولًا، ثم أبجديًا. */
export function selectTagCounts(dataset: OfflineDataset): TagCount[] {
  const counts = new Map<string, number>();
  for (const lyric of dataset.lyrics) {
    for (const tag of lyric.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ar"));
}

/** أرقام الرئيسية (الإجمالي وعدّ الوسوم): من الخادم، أو من الجهاز في الهيكل. */
export function useHomeStats(shell: boolean, grandTotal: number, tagCounts: TagCount[]) {
  const state = useOfflinePageData(
    shell ? null : { grandTotal, tagCounts },
    (dataset) => ({ grandTotal: dataset.lyrics.length, tagCounts: selectTagCounts(dataset) }),
    "home-stats",
  );
  return state.status === "ready" ? state.data : { grandTotal: 0, tagCounts: [] as TagCount[] };
}

export type OfflinePageState<T> =
  | { status: "ready"; data: T }
  | { status: "loading" }
  | { status: "missing" };

/**
 * بيانات صفحة: من الخادم إن صيّرها (`server` غير null)، وإلا — صفحة فُتحت من
 * هيكل دون اتصال — تُحسب من بيانات الجهاز عبر `select`. `key` يعرّف ما تعتمد عليه
 * `select` (المسار والمعاملات) فيُعاد الحساب عند تغيّره.
 */
export function useOfflinePageData<T>(
  server: T | null,
  select: (dataset: OfflineDataset) => T | null,
  key: string,
): OfflinePageState<T> {
  const local = server === null;
  const [dataset, setDataset] = useState<OfflineDataset | null | undefined>(undefined);

  useEffect(() => {
    if (!local) return;
    let cancelled = false;
    const load = () => {
      loadOfflineDataset().then((d) => {
        if (!cancelled) setDataset(d);
      });
    };
    load();
    window.addEventListener(OFFLINE_DATA_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(OFFLINE_DATA_EVENT, load);
    };
  }, [local]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selected = useMemo(() => (local && dataset ? select(dataset) : null), [local, dataset, key]);

  if (!local) return { status: "ready", data: server as T };
  if (dataset === undefined) return { status: "loading" };
  return selected ? { status: "ready", data: selected } : { status: "missing" };
}
