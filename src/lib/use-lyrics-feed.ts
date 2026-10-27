"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LYRICS_PAGE_SIZE } from "@/lib/lyrics-search";
import { homeFiltersKey, type HomeFilters } from "@/lib/use-home-filters";
import { normalizeArabic } from "@/lib/arabic-search";
import { compareOfflineLyrics, type OfflineLyric } from "@/lib/offline";
import { OFFLINE_DATA_EVENT } from "@/lib/offline-db";
import { loadOfflineDataset, matchesSearch, type OfflineDataset } from "@/lib/offline-data";

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
  /** المعايير الفعلية من الرابط (راجع useHomeFilters). */
  filters: HomeFilters;
  /** المعايير التي صيّر الخادم بها الصفحة الأولى أدناه. */
  initialFilters: HomeFilters;
  initialItems: LyricsFeedItem[];
  initialHasMore: boolean;
  initialTotal: number;
  /** صفحة فُتحت من هيكل دون اتصال (بلا صفحة أولى من الخادم): القائمة كلها من الجهاز. */
  shell?: boolean;
}

type OfflineSource = OfflineDataset;

/**
 * تمرير لانهائي لقائمة الأناشيد (فهرس الرئيسية): يبدأ بالصفحة الأولى المُحمَّلة
 * من الخادم، ثم يجلب صفحات لاحقة من /api/lyrics بنفس معايير البحث/الوسوم/الترتيب
 * كلّما ظهر عنصر «الحارس» (sentinelRef) في نافذة العرض. عند تغيّر معايير البحث
 * (تنقّل يُعيد تحميل الرئيسية بـ initialItems/initialHasMore جديدة) تُعاد القائمة
 * إلى نقطة البداية تلك.
 *
 * دون اتصال: /api/lyrics غير متاح، فعند فشل الشبكة تُكمَل القائمة من بيانات الجهاز
 * (IndexedDB — راجع offline-data) بنفس التصفية والترتيب، وتبقى على هذا المصدر حتى
 * تتغيّر معايير البحث (خلط مصدرين يُفسد الإزاحة بين الصفحات). وإن فُتحت الرئيسية
 * من هيكل (`shell`)، أو اختلفت معايير الرابط عن معايير الصفحة الأولى (بحث أو تصفية
 * دون اتصال — راجع useAppRouter)، تُحسب القائمة وعدد النتائج كلّها من الجهاز. إن لم تكن اللقطة
 * محفوظة يظهر خطأ قابل لإعادة المحاولة (error/retry) بدل مؤشّر انتظار معلَّق،
 * وتُعاد المحاولة تلقائيًا عند عودة الاتصال.
 */
export function useLyricsFeed({ filters, initialFilters, initialItems, initialHasMore, initialTotal, shell = false }: UseLyricsFeedArgs) {
  const { query, tags, sort } = filters;
  const local = shell || homeFiltersKey(filters) !== homeFiltersKey(initialFilters);
  const [items, setItems] = useState(initialItems);
  // في الهيكل لا صفحة أولى: مؤشّر التحميل (لا «لا توجد أناشيد») حتى تُقرأ بيانات الجهاز.
  const [hasMore, setHasMore] = useState(shell || initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set(initialItems.map((i) => i.id)));
  const offlineRef = useRef<OfflineSource | null>(null);
  const tagsKey = tags.join(",");

  const append = useCallback((next: LyricsFeedItem[], more: boolean) => {
    const fresh = next.filter((i) => !shownIdsRef.current.has(i.id));
    for (const i of fresh) shownIdsRef.current.add(i.id);
    setItems((prev) => [...prev, ...fresh]);
    setHasMore(more);
  }, []);

  // الصفحة التالية من اللقطة المحفوظة: كل ما يطابق البحث والوسوم ولم يُعرض بعد،
  // بالترتيب المطلوب (مطابق لترتيب قاعدة البيانات — راجع compareOfflineLyrics).
  // الاستبعاد بالمعرّف (لا بالإزاحة) يضمن ألّا يتكرّر ولا يسقط نشيد.
  const loadFromOffline = useCallback(
    (source: OfflineSource) => {
      const tagList = tagsKey ? tagsKey.split(",") : [];
      const matching = source.lyrics.filter((lyric) => {
        if (tagList.length && !lyric.tags.some((t) => tagList.includes(t))) return false;
        return matchesSearch(source, lyric, query);
      });
      // العدد من اللقطة فقط حين تكون هي مصدر القائمة كلّها؛ وإلا فعدد الخادم أدقّ.
      if (local) setTotal(matching.length);
      const remaining = matching
        .filter((lyric) => !shownIdsRef.current.has(lyric.id))
        .sort(compareOfflineLyrics(sort, (l: OfflineLyric) => l, (l) => normalizeArabic(l.title)));
      const page = remaining.slice(0, LYRICS_PAGE_SIZE).map((lyric) => ({
        id: lyric.id,
        title: lyric.title,
        artist: lyric.artist,
        album: lyric.album,
        tags: lyric.tags,
        createdAt: lyric.createdAt,
        contentHtml: lyric.contentHtml,
        favorited: source.favoriteIds.has(lyric.id),
      }));
      append(page, remaining.length > page.length);
    },
    [query, tagsKey, sort, local, append],
  );

  useEffect(() => {
    // يُلغي أي طلب «تحميل المزيد» لا يزال قيد التنفيذ لاستعلام سابق (مثلاً
    // بحث حيّ يبدّل النتائج بينما كان التمرير اللانهائي يجلب صفحة تالية له)،
    // حتى لا تصل نتائجه متأخرةً فتُلحق عناصر الاستعلام القديم بقائمة الجديد.
    abortRef.current?.abort();
    setError(false);
    pageRef.current = 1;
    offlineRef.current = null;
    loadingRef.current = false;
    setLoading(false);
    if (!local) {
      setItems(initialItems);
      setHasMore(initialHasMore);
      setTotal(initialTotal);
      shownIdsRef.current = new Set(initialItems.map((i) => i.id));
      return;
    }
    shownIdsRef.current = new Set();
    setItems([]);
    if (cachedSource) {
      // اللقطة في الذاكرة: النتائج فورًا، بلا وميض مؤشّر التحميل أثناء الكتابة.
      offlineRef.current = cachedSource;
      loadFromOffline(cachedSource);
    } else {
      // الحارس الظاهر (قائمة فارغة) يُطلق loadMore فيجلب اللقطة.
      setHasMore(true);
    }
  }, [initialItems, initialHasMore, initialTotal, local, loadFromOffline]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    abortRef.current = controller;
    // يُكمل القائمة من اللقطة المحفوظة، أو يُظهر خطأً إن لم تكن محفوظة.
    const continueOffline = async () => {
      const source = await loadOfflineSource();
      if (controller.signal.aborted) return;
      if (!source) {
        setError(true);
        return;
      }
      offlineRef.current = source;
      loadFromOffline(source);
    };
    try {
      if (offlineRef.current) {
        loadFromOffline(offlineRef.current);
        return;
      }
      if (local) {
        await continueOffline();
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
        await continueOffline();
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
  }, [hasMore, query, tagsKey, sort, local, append, loadFromOffline]);
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

  return { items, hasMore, total, loading, error, retry, sentinelRef };
}

// بيانات الجهاز بعد أول قراءة، لاستعمالها فورًا (البحث دون اتصال يعيد التصفية مع
// كل حرف). تُهمَل بعد كل مزامنة لتُقرأ النسخة الأحدث.
let cachedSource: OfflineSource | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(OFFLINE_DATA_EVENT, () => {
    cachedSource = null;
  });
}

async function loadOfflineSource(): Promise<OfflineSource | null> {
  const dataset = await loadOfflineDataset();
  cachedSource = dataset;
  return dataset;
}
