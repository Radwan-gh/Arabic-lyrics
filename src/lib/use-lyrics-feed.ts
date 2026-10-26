"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LYRICS_PAGE_SIZE, type LyricsSort } from "@/lib/lyrics-search";
import { buildSearchText, normalizeArabic } from "@/lib/arabic-search";
import { OFFLINE_LYRICS_URL, OFFLINE_ME_URL, type OfflineCollection, type OfflineLyric, type OfflineMe } from "@/lib/offline";

export interface LyricsFeedItem {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  createdAt: string;
  contentHtml: string;
  favorited: boolean;
}

interface UseLyricsFeedArgs {
  query: string;
  tags: string[];
  sort: LyricsSort;
  initialItems: LyricsFeedItem[];
  initialHasMore: boolean;
}

/** لقطة القراءة دون اتصال بعد تجهيزها للتصفية: الأناشيد مع نصّ بحثها المُطبَّع، ومعرّفات المفضّلة. */
interface OfflineEntry {
  lyric: OfflineLyric;
  searchText: string;
  /** العنوان مُطبَّعًا — مفتاح الترتيب الأبجدي (يقابل titleNormalized في قاعدة البيانات). */
  titleKey: string;
}

interface OfflineSource {
  lyrics: OfflineEntry[];
  favorites: Set<string>;
}

/**
 * تمرير لانهائي لقائمة الأناشيد (فهرس الرئيسية): يبدأ بالصفحة الأولى المُحمَّلة
 * من الخادم، ثم يجلب صفحات لاحقة من /api/lyrics بنفس معايير البحث/الوسوم/الترتيب
 * كلّما ظهر عنصر «الحارس» (sentinelRef) في نافذة العرض. عند تغيّر معايير البحث
 * (تنقّل يُعيد تحميل الرئيسية بـ initialItems/initialHasMore جديدة) تُعاد القائمة
 * إلى نقطة البداية تلك.
 *
 * دون اتصال: يخدم الـ service worker الرئيسية من نسخة HTML مخزَّنة (الصفحة الأولى
 * فقط)، بينما /api/lyrics لا يُخزَّن. فعند فشل الشبكة تُكمَل القائمة من لقطة
 * المجموعة المحفوظة (/api/public/lyrics) بنفس التصفية والترتيب، وتبقى على هذا
 * المصدر حتى تتغيّر معايير البحث (خلط مصدرين يُفسد الإزاحة بين الصفحات). إن لم
 * تكن اللقطة محفوظة يظهر خطأ قابل لإعادة المحاولة (error/retry) بدل مؤشّر انتظار
 * معلَّق، وتُعاد المحاولة تلقائيًا عند عودة الاتصال.
 */
export function useLyricsFeed({ query, tags, sort, initialItems, initialHasMore }: UseLyricsFeedArgs) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set(initialItems.map((i) => i.id)));
  const offlineRef = useRef<OfflineSource | null>(null);
  const tagsKey = tags.join(",");

  useEffect(() => {
    // يُلغي أي طلب «تحميل المزيد» لا يزال قيد التنفيذ لاستعلام سابق (مثلاً
    // بحث حيّ يبدّل النتائج بينما كان التمرير اللانهائي يجلب صفحة تالية له)،
    // حتى لا تصل نتائجه متأخرةً فتُلحق عناصر الاستعلام القديم بقائمة الجديد.
    abortRef.current?.abort();
    setItems(initialItems);
    setHasMore(initialHasMore);
    setError(false);
    pageRef.current = 1;
    shownIdsRef.current = new Set(initialItems.map((i) => i.id));
    offlineRef.current = null;
    loadingRef.current = false;
    setLoading(false);
  }, [initialItems, initialHasMore]);

  const append = useCallback((next: LyricsFeedItem[], more: boolean) => {
    const fresh = next.filter((i) => !shownIdsRef.current.has(i.id));
    for (const i of fresh) shownIdsRef.current.add(i.id);
    setItems((prev) => [...prev, ...fresh]);
    setHasMore(more);
  }, []);

  // الصفحة التالية من اللقطة المحفوظة: كل ما يطابق البحث والوسوم ولم يُعرض بعد،
  // بالترتيب المطلوب. الاستبعاد بالمعرّف (لا بالإزاحة) يضمن ألّا يتكرّر ولا يسقط
  // نشيد حتى لو اختلف ترتيب العميل قليلًا عن ترتيب قاعدة البيانات.
  const loadFromOffline = useCallback(
    (source: OfflineSource) => {
      const nq = normalizeArabic(query);
      const tagList = tagsKey ? tagsKey.split(",") : [];
      const remaining = source.lyrics
        .filter(({ lyric, searchText }) => {
          if (shownIdsRef.current.has(lyric.id)) return false;
          if (tagList.length && !lyric.tags.some((t) => tagList.includes(t))) return false;
          return !nq || searchText.includes(nq);
        })
        .sort(compareBy(sort));
      const page = remaining
        .slice(0, LYRICS_PAGE_SIZE)
        .map(({ lyric }) => ({ ...lyric, favorited: source.favorites.has(lyric.id) }));
      append(page, remaining.length > page.length);
    },
    [query, tagsKey, sort, append],
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (offlineRef.current) {
        loadFromOffline(offlineRef.current);
        return;
      }
      const nextPage = pageRef.current + 1;
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tagsKey) params.set("tags", tagsKey);
      params.set("sort", sort);
      params.set("page", String(nextPage));
      let res: Response;
      try {
        res = await fetch(`/api/lyrics?${params.toString()}`, { signal: controller.signal });
      } catch (err) {
        if (controller.signal.aborted) throw err;
        // فشل الشبكة (غالبًا دون اتصال): أكمِل من اللقطة المحفوظة.
        const source = await fetchOfflineSource(controller.signal);
        if (!source) {
          setError(true);
          return;
        }
        offlineRef.current = source;
        loadFromOffline(source);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      const data: { items: LyricsFeedItem[]; pageCount: number } = await res.json();
      pageRef.current = nextPage;
      append(data.items, nextPage < data.pageCount);
    } catch {
      // إلغاء الطلب (استعلام جديد وصل قبل اكتمال هذه الصفحة) — حالة الاستعلام
      // الجديد أُعيد ضبطها في تأثير إعادة الضبط أعلاه.
    } finally {
      if (abortRef.current === controller) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [hasMore, query, tagsKey, sort, append, loadFromOffline]);

  const retry = useCallback(() => {
    setError(false);
    void loadMore();
  }, [loadMore]);

  // أعِد المحاولة تلقائيًا عند عودة الاتصال إن كان آخر تحميل قد فشل.
  useEffect(() => {
    if (!error) return;
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [error, retry]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // items.length: يُعاد ربط المراقب بعد كل إلحاق، فإن بقي الحارس ظاهرًا (صفحة
    // أقصر من الشاشة) يُطلق تحميلًا جديدًا — المراقب لا يُبلغ إلا عند تغيّر التقاطع.
  }, [loadMore, error, items.length]);

  return { items, hasMore, loading, error, retry, sentinelRef };
}

// يجلب لقطة المجموعة (ومفضّلة المستخدم إن وُجدت) — يُرجعها الـ service worker من
// الكاش دون اتصال. null إن لم تكن المجموعة محفوظة على الجهاز.
async function fetchOfflineSource(signal: AbortSignal): Promise<OfflineSource | null> {
  let collection: OfflineCollection;
  try {
    const res = await fetch(OFFLINE_LYRICS_URL, { signal });
    if (!res.ok) return null;
    collection = await res.json();
  } catch (err) {
    if (signal.aborted) throw err;
    return null;
  }
  let favorites = new Set<string>();
  try {
    const res = await fetch(OFFLINE_ME_URL, { signal });
    if (res.ok) favorites = new Set(((await res.json()) as OfflineMe).favorites);
  } catch (err) {
    if (signal.aborted) throw err;
    // زائر أو لا بيانات خاصة محفوظة — تبقى المفضّلة فارغة.
  }
  return {
    lyrics: collection.lyrics.map((lyric) => ({
      lyric,
      searchText: buildSearchText({ title: lyric.title, artist: lyric.artist, album: lyric.album, content: lyric.contentHtml }),
      titleKey: normalizeArabic(lyric.title),
    })),
    favorites,
  };
}

// يحاكي buildLyricsOrderBy في العميل: الترتيب الأبجدي على العنوان المُطبَّع ثم
// الأصلي، والزمني على تاريخ الإضافة (سلاسل ISO تُقارَن نصيًّا)، والمعرّف فاصل تعادل أخير.
function compareBy(sort: LyricsSort): (a: OfflineEntry, b: OfflineEntry) => number {
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  const byId = (a: OfflineEntry, b: OfflineEntry) => cmp(a.lyric.id, b.lyric.id);
  const byTitle = (a: OfflineEntry, b: OfflineEntry) =>
    a.titleKey.localeCompare(b.titleKey, "ar") || a.lyric.title.localeCompare(b.lyric.title, "ar");
  const byDate = (a: OfflineEntry, b: OfflineEntry) => cmp(a.lyric.createdAt, b.lyric.createdAt);
  switch (sort) {
    case "title_asc":
      return (a, b) => byTitle(a, b) || byId(a, b);
    case "title_desc":
      return (a, b) => byTitle(b, a) || byId(a, b);
    case "date_asc":
      return (a, b) => byDate(a, b) || byId(a, b);
    case "date_desc":
      return (a, b) => byDate(b, a) || byId(a, b);
  }
}
