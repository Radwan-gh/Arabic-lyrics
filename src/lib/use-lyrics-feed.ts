"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LYRICS_PAGE_SIZE } from "@/lib/lyrics-search";
import { homeFiltersKey, type HomeFilters } from "@/lib/use-home-filters";
import { normalizeArabic } from "@/lib/arabic-search";
import { compareOfflineLyrics, type OfflineLyric } from "@/lib/offline";
import { OFFLINE_DATA_EVENT } from "@/lib/offline-db";
import { loadOfflineDataset, matchesSearch, type OfflineDataset } from "@/lib/offline-data";
import { saveFeedSnapshot, takeFeedSnapshot, type FeedVariant } from "@/lib/feed-restore";

export interface LyricsFeedItem {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  createdAt: string;
  contentHtml: string;
  favorited: boolean;
  /** يملك المستخدم الحالي صلاحية تعديله/حذفه (يُحسب على الخادم؛ false دون اتصال). */
  canModify: boolean;
}

/** نشيد أُخفي من القائمة (حذف بانتظار التأكيد) مع موضعه، لإرجاعه عند التراجع. */
export interface RemovedFeedItem {
  item: LyricsFeedItem;
  index: number;
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
  /** أيّ نسختَي الرئيسية — لحفظ موضعها واستعادته عند الرجوع (راجع feed-restore). */
  variant: FeedVariant;
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
 *
 * عند الرجوع إلى الرئيسية من تفاصيل نشيد تُستعاد القائمة كما تُركت (كل الصفحات
 * المحمَّلة وموضع التمرير) بدل البدء من الصفحة الأولى — راجع feed-restore.
 */
export function useLyricsFeed({ filters, initialFilters, initialItems, initialHasMore, initialTotal, shell = false, variant }: UseLyricsFeedArgs) {
  const { query, tags, sort } = filters;
  const local = shell || homeFiltersKey(filters) !== homeFiltersKey(initialFilters);
  const filtersKey = homeFiltersKey(filters);
  // لقطة القائمة كما تُركت، إن كان هذا التركيب رجوعًا إليها (تُقرأ مرة واحدة).
  const [restored] = useState(() => takeFeedSnapshot(variant, filtersKey));
  const [items, setItems] = useState(restored?.items ?? initialItems);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // في الهيكل لا صفحة أولى: مؤشّر التحميل (لا «لا توجد أناشيد») حتى تُقرأ بيانات الجهاز.
  const [hasMore, setHasMore] = useState(restored ? restored.hasMore : shell || initialHasMore);
  const [total, setTotal] = useState(restored?.total ?? initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pageRef = useRef(restored?.page ?? 1);
  // عدد ما جاء من الخادم، وعدد ما حُذف منه فعليًا: الصفحة التالية تُطلب بإزاحة
  // (الفرق بينهما) لا برقم صفحة، وإلا أسقط كل حذفٍ نشيدًا من الصفحة التالية.
  const serverCountRef = useRef(restored?.serverCount ?? initialItems.length);
  const deletedRef = useRef(restored?.deleted ?? 0);
  // عدد الأناشيد المُخفاة الآن من القائمة (محذوفة أو بانتظار الحذف) — لإنقاص العدّادات.
  const [removedCount, setRemovedCount] = useState(restored?.removedCount ?? 0);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set((restored?.items ?? initialItems).map((i) => i.id)));
  const offlineRef = useRef<OfflineSource | null>(restored?.offline ?? null);
  const tagsKey = tags.join(",");
  // مدخلات التركيب الذي استُعيدت له اللقطة: ما دامت هي نفسها لا يُعاد ضبط القائمة.
  const restoredForRef = useRef(restored ? { initialItems, initialHasMore, initialTotal, local } : null);

  // موضع التمرير الأخير والحالة الراهنة، لحفظها عند مغادرة الرئيسية.
  const scrollYRef = useRef(restored?.scrollY ?? 0);
  const stateRef = useRef({ hasMore, total, removedCount, filtersKey });
  stateRef.current = { hasMore, total, removedCount, filtersKey };

  // يُعاد موضع التمرير قبل الرسم (بعد تصيير كل الصفحات المستعادة)، ثم مرة أخرى في
  // الإطار التالي تحسّبًا لاستعادة المتصفح التلقائية أو تغيّر ارتفاع ما فوق القائمة.
  useLayoutEffect(() => {
    if (!restored) return;
    const y = restored.scrollY;
    window.scrollTo(0, y);
    const frame = requestAnimationFrame(() => window.scrollTo(0, y));
    return () => cancelAnimationFrame(frame);
  }, [restored]);

  useEffect(() => {
    const homePath = window.location.pathname;
    if (!restored) scrollYRef.current = window.scrollY;
    function onScroll() {
      // بعد بدء التنقّل يتغيّر الرابط قبل أن يمرّر Next.js الصفحة الجديدة إلى الأعلى:
      // ذلك التمرير ليس موضع القائمة، فلا يُسجَّل.
      if (window.location.pathname !== homePath) return;
      scrollYRef.current = window.scrollY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      const state = stateRef.current;
      saveFeedSnapshot(variant, {
        key: state.filtersKey,
        items: itemsRef.current,
        hasMore: state.hasMore,
        total: state.total,
        page: pageRef.current,
        serverCount: serverCountRef.current,
        deleted: deletedRef.current,
        removedCount: state.removedCount,
        offline: offlineRef.current,
        scrollY: scrollYRef.current,
      });
    };
  }, [restored, variant]);

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
        canModify: false,
      }));
      append(page, remaining.length > page.length);
    },
    [query, tagsKey, sort, local, append],
  );

  useEffect(() => {
    // القائمة مستعادة لهذه المدخلات نفسها (رجوع إلى الرئيسية): لا إعادة ضبط.
    const restoredFor = restoredForRef.current;
    if (
      restoredFor &&
      restoredFor.initialItems === initialItems &&
      restoredFor.initialHasMore === initialHasMore &&
      restoredFor.initialTotal === initialTotal &&
      restoredFor.local === local
    ) {
      return;
    }
    restoredForRef.current = null;
    // يُلغي أي طلب «تحميل المزيد» لا يزال قيد التنفيذ لاستعلام سابق (مثلاً
    // بحث حيّ يبدّل النتائج بينما كان التمرير اللانهائي يجلب صفحة تالية له)،
    // حتى لا تصل نتائجه متأخرةً فتُلحق عناصر الاستعلام القديم بقائمة الجديد.
    abortRef.current?.abort();
    setError(false);
    pageRef.current = 1;
    serverCountRef.current = initialItems.length;
    deletedRef.current = 0;
    setRemovedCount(0);
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
      const offset = Math.max(0, serverCountRef.current - deletedRef.current);
      params.set("offset", String(offset));
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
      const data: { items: LyricsFeedItem[]; total: number } = await res.json();
      pageRef.current = nextPage;
      serverCountRef.current += data.items.length;
      append(data.items, data.items.length > 0 && offset + data.items.length < data.total);
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

  /** يُخفي نشيدًا من القائمة فورًا (قبل تأكيد الخادم)، ويُرجعه مع موضعه. */
  const removeItem = useCallback((id: string): RemovedFeedItem | null => {
    const current = itemsRef.current;
    const index = current.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const removed = { item: current[index], index };
    // تحديث فوري للمرجع: حذفان متتاليان قبل إعادة التصيير يريان القائمة الصحيحة.
    itemsRef.current = current.filter((i) => i.id !== id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setRemovedCount((n) => n + 1);
    return removed;
  }, []);

  /** يُرجع نشيدًا أُخفي (تراجع أو فشل الحذف) إلى موضعه. */
  const restoreItem = useCallback(({ item, index }: RemovedFeedItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
    setTotal((t) => t + 1);
    setRemovedCount((n) => Math.max(0, n - 1));
  }, []);

  /** أكّد الخادم الحذف: تُطلب الصفحات التالية بإزاحة أقلّ بواحد. */
  const confirmRemoved = useCallback(() => {
    deletedRef.current += 1;
  }, []);

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

  return { items, hasMore, total, loading, error, retry, sentinelRef, removedCount, removeItem, restoreItem, confirmRemoved };
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
