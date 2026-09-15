"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useRealLocation } from "@/hooks/use-real-location";
import { filterLyricsBySearch, paginate } from "@/lib/offline-filter";

const PAGE_SIZE = 12;

export interface FavoritesItem {
  lyricsId: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags?: string[];
  createdAt?: string;
  contentHtml?: string;
}

export interface FavoritesSortOption {
  value: string;
  label: string;
}

export interface FavoritesSsrData {
  totalCount: number;
  query: string;
  sort: string;
  sortOptions: FavoritesSortOption[];
  isCustom: boolean;
  reorderable: boolean;
  items: FavoritesItem[];
  page: number;
  pageCount: number;
}

export interface UseOfflineFavoritesResult {
  view: FavoritesSsrData;
  online: boolean;
  loggedIn: boolean;
  sourcedFromCache: boolean;
  commitSearch: (value: string) => void;
  commitSort: (sort: string) => void;
  commitPage: (page: number) => void;
  pageHref: (page: number) => string;
}

const SORT_OPTIONS: FavoritesSortOption[] = [
  { value: "recent", label: "الأحدث" },
  { value: "oldest", label: "الأقدم" },
  { value: "title", label: "العنوان" },
  { value: "artist", label: "المنشد" },
  { value: "custom", label: "ترتيبي الخاص" },
];

function buildFavoritesUrl(q: string, sort: string, page?: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort !== "recent") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/favorites?${qs}` : "/favorites";
}

/**
 * يُوحِّد مصدر بيانات المفضّلة بين SSR الطبيعي ومسار القراءة دون اتصال. عند
 * الاعتماد على اللقطة المخزَّنة: لا سبيل لمعرفة تاريخ إضافة كل نشيد للمفضّلة،
 * فيرتدّ ترتيبا "الأحدث"/"الأقدم" إلى الترتيب الخاص المحفوظ (position) — العنوان
 * والمنشد يُرتَّبان محليًا بلا قيود. إعادة الترتيب بالسحب معطّلة أوفلاين (لا سبيل
 * لحفظها) حتى تعود الشبكة.
 */
export function useOfflineFavorites(ssr: FavoritesSsrData | null): UseOfflineFavoritesResult {
  const router = useRouter();
  const realLocation = useRealLocation();

  const [queryOverride, setQueryOverride] = useState<string | null>(null);
  const [sortOverride, setSortOverride] = useState<string | null>(null);
  const [pageOverride, setPageOverride] = useState<number | null>(null);
  const [usingSnapshot, setUsingSnapshot] = useState(ssr === null);

  useEffect(() => {
    if (ssr !== null || !realLocation) return;
    const params = new URLSearchParams(realLocation.search);
    setQueryOverride(params.get("q") ?? "");
    setSortOverride(params.get("sort") ?? "recent");
    setPageOverride(Math.max(1, Number(params.get("page")) || 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realLocation === null]);

  const snapshotEnabled = usingSnapshot || ssr === null;
  const snapshot = useOfflineSnapshot(snapshotEnabled);
  const online = snapshot.online;

  useEffect(() => {
    if (!online) setUsingSnapshot(true);
  }, [online]);

  const effectiveQuery = queryOverride ?? ssr?.query ?? "";
  const effectiveSort = sortOverride ?? ssr?.sort ?? "recent";
  const effectivePage = pageOverride ?? ssr?.page ?? 1;

  let view: FavoritesSsrData;
  const loggedIn = usingSnapshot ? snapshot.me !== null : true;

  if (usingSnapshot && snapshot.me) {
    const isCustom = effectiveSort === "custom";
    const favoriteLyrics = snapshot.me.favorites
      .map((id) => snapshot.lyricsById.get(id))
      .filter((l): l is NonNullable<typeof l> => !!l);

    let ordered = favoriteLyrics;
    if (effectiveSort === "title") {
      ordered = [...favoriteLyrics].sort((a, b) => a.title.localeCompare(b.title, "ar"));
    } else if (effectiveSort === "artist") {
      ordered = [...favoriteLyrics].sort((a, b) => (a.artist ?? "").localeCompare(b.artist ?? "", "ar"));
    }
    // "الأحدث"/"الأقدم" (recent/oldest): تاريخ الإضافة للمفضّلة غير مخزَّن أوفلاين،
    // فيُستخدَم الترتيب الخاص المحفوظ (position) كبديل معقول.

    const filtered = filterLyricsBySearch(ordered, effectiveQuery, snapshot.searchIndex);

    const items: FavoritesItem[] = filtered.map((l) => ({
      lyricsId: l.id,
      title: l.title,
      artist: l.artist,
      album: l.album,
      tags: l.tags,
      createdAt: l.createdAt,
      contentHtml: l.contentHtml,
    }));

    if (isCustom) {
      view = {
        totalCount: snapshot.me.favorites.length,
        query: effectiveQuery,
        sort: effectiveSort,
        sortOptions: SORT_OPTIONS,
        isCustom: true,
        reorderable: online && effectiveQuery.length === 0,
        items,
        page: 1,
        pageCount: 1,
      };
    } else {
      const { slice, pageCount, page } = paginate(items, effectivePage, PAGE_SIZE);
      view = {
        totalCount: snapshot.me.favorites.length,
        query: effectiveQuery,
        sort: effectiveSort,
        sortOptions: SORT_OPTIONS,
        isCustom: false,
        reorderable: false,
        items: slice,
        page,
        pageCount,
      };
    }
  } else if (ssr !== null) {
    view = ssr;
  } else {
    view = {
      totalCount: 0,
      query: effectiveQuery,
      sort: effectiveSort,
      sortOptions: SORT_OPTIONS,
      isCustom: effectiveSort === "custom",
      reorderable: false,
      items: [],
      page: 1,
      pageCount: 1,
    };
  }

  function commitSearch(value: string) {
    if (online) {
      router.push(buildFavoritesUrl(value, effectiveSort));
      return;
    }
    setQueryOverride(value);
    setPageOverride(1);
    window.history.replaceState(null, "", buildFavoritesUrl(value, effectiveSort));
  }

  function commitSort(sort: string) {
    if (online) {
      router.push(buildFavoritesUrl(effectiveQuery, sort));
      return;
    }
    setSortOverride(sort);
    setPageOverride(1);
    window.history.replaceState(null, "", buildFavoritesUrl(effectiveQuery, sort));
  }

  function commitPage(page: number) {
    setPageOverride(page);
    window.history.replaceState(null, "", buildFavoritesUrl(effectiveQuery, effectiveSort, page));
  }

  function pageHref(page: number): string {
    return buildFavoritesUrl(effectiveQuery, effectiveSort, page);
  }

  return { view, online, loggedIn, sourcedFromCache: usingSnapshot, commitSearch, commitSort, commitPage, pageHref };
}
