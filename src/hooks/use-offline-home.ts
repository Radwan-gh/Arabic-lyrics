"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useRealLocation } from "@/hooks/use-real-location";
import { computeTagCounts, filterLyricsByTags, filterLyricsBySearch, paginate } from "@/lib/offline-filter";
import type { OfflineLyric } from "@/lib/offline";
import type { TagCount } from "@/lib/tags";

const PAGE_SIZE = 12;

export interface HomeItem {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  createdAt: string;
  contentHtml: string;
  favorited: boolean;
}

export interface HomeSsrData {
  q: string;
  tags: string[];
  items: HomeItem[];
  grandTotal: number;
  filteredTotal: number;
  isFiltered: boolean;
  tagCounts: TagCount[];
  page: number;
  pageCount: number;
  loggedIn: boolean;
}

export interface HomeView {
  query: string;
  selectedTags: string[];
  items: HomeItem[];
  grandTotal: number;
  filteredTotal: number;
  isFiltered: boolean;
  tagCounts: TagCount[];
  page: number;
  pageCount: number;
  loggedIn: boolean;
}

export interface UseOfflineHomeResult {
  view: HomeView;
  online: boolean;
  sourcedFromCache: boolean;
  commitSearch: (value: string) => void;
  commitTags: (tags: string[]) => void;
  commitPage: (page: number) => void;
  pageHref: (page: number) => string;
  /** المجموعة الكاملة + فهرس البحث، لاستخدامهما في شاشة البحث المنبثقة الغامرة
   * حين نقرأ من اللقطة المخزَّنة (بدل GET /api/lyrics الذي لا يعمل دون اتصال).
   * null حين لا حاجة له (أونلاين وبيانات SSR متوفّرة). */
  offlineSearchData: { lyrics: OfflineLyric[]; searchIndex: Map<string, string> } | null;
}

function buildHomeUrl(q: string, tags: string[], page?: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tags.length) params.set("tags", tags.join(","));
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * يُوحِّد مصدر بيانات الرئيسية بين المسار الطبيعي (SSR + Prisma عبر التنقّل
 * بالمسار) ومسار القراءة دون اتصال (لقطة مخزَّنة + تصفية في العميل) — نفس
 * الشكل (HomeView) لكلتا الحالتين حتى تستخدمه شاشتا الموبايل وسطح المكتب دون
 * تكرار. `ssr === null` يعني أن الصفحة لم تُصيَّر على الخادم إطلاقًا (خدمها
 * الـ service worker من غلاف احتياطي عام أثناء انقطاع الشبكة لمسار لم يُخزَّن
 * بعينه) — عندها تُقرأ المعطيات الأولية من الرابط الحقيقي نفسه.
 */
export function useOfflineHome(ssr: HomeSsrData | null): UseOfflineHomeResult {
  const router = useRouter();
  const realLocation = useRealLocation();

  const [queryOverride, setQueryOverride] = useState<string | null>(null);
  const [tagsOverride, setTagsOverride] = useState<string[] | null>(null);
  const [pageOverride, setPageOverride] = useState<number | null>(null);
  const [usingSnapshot, setUsingSnapshot] = useState(ssr === null);

  // لا بيانات من الخادم إطلاقًا: اقرأ الاستعلام الأولي من الرابط الحقيقي بعد
  // التركيب (parseRoute في OfflineShell يوجّه هنا أصلًا فقط لمسار "/").
  useEffect(() => {
    if (ssr !== null || !realLocation) return;
    const params = new URLSearchParams(realLocation.search);
    setQueryOverride(params.get("q") ?? "");
    setTagsOverride(
      (params.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    );
    setPageOverride(Math.max(1, Number(params.get("page")) || 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realLocation === null]);

  const snapshotEnabled = usingSnapshot || ssr === null;
  const snapshot = useOfflineSnapshot(snapshotEnabled);
  const online = snapshot.online;

  useEffect(() => {
    if (!online) setUsingSnapshot(true);
  }, [online]);

  const effectiveQuery = queryOverride ?? ssr?.q ?? "";
  const effectiveTags = tagsOverride ?? ssr?.tags ?? [];
  const effectivePage = pageOverride ?? ssr?.page ?? 1;

  let view: HomeView;
  if (usingSnapshot) {
    const all = snapshot.collection?.lyrics ?? [];
    const byTags = filterLyricsByTags(all, effectiveTags);
    const filtered = filterLyricsBySearch(byTags, effectiveQuery, snapshot.searchIndex);
    const tagCounts = computeTagCounts(all);
    const { slice, pageCount, page } = paginate(filtered, effectivePage, PAGE_SIZE);
    const favorites = new Set(snapshot.me?.favorites ?? []);
    view = {
      query: effectiveQuery,
      selectedTags: effectiveTags,
      items: slice.map((l) => ({
        id: l.id,
        title: l.title,
        artist: l.artist,
        album: l.album,
        tags: l.tags,
        createdAt: l.createdAt,
        contentHtml: l.contentHtml,
        favorited: favorites.has(l.id),
      })),
      grandTotal: all.length,
      filteredTotal: filtered.length,
      isFiltered: Boolean(effectiveQuery) || effectiveTags.length > 0,
      tagCounts,
      page,
      pageCount,
      loggedIn: snapshot.me !== null,
    };
  } else {
    view = {
      query: ssr!.q,
      selectedTags: ssr!.tags,
      items: ssr!.items,
      grandTotal: ssr!.grandTotal,
      filteredTotal: ssr!.filteredTotal,
      isFiltered: ssr!.isFiltered,
      tagCounts: ssr!.tagCounts,
      page: ssr!.page,
      pageCount: ssr!.pageCount,
      loggedIn: ssr!.loggedIn,
    };
  }

  function commitSearch(value: string) {
    if (online) {
      router.replace(buildHomeUrl(value, effectiveTags));
      return;
    }
    setQueryOverride(value);
    setPageOverride(1);
    window.history.replaceState(null, "", buildHomeUrl(value, effectiveTags));
  }

  function commitTags(tags: string[]) {
    if (online) {
      router.push(buildHomeUrl(effectiveQuery, tags));
      return;
    }
    setTagsOverride(tags);
    setPageOverride(1);
    window.history.replaceState(null, "", buildHomeUrl(effectiveQuery, tags));
  }

  function commitPage(page: number) {
    setPageOverride(page);
    window.history.replaceState(null, "", buildHomeUrl(effectiveQuery, effectiveTags, page));
  }

  function pageHref(page: number): string {
    return buildHomeUrl(effectiveQuery, effectiveTags, page);
  }

  const offlineSearchData = usingSnapshot
    ? { lyrics: snapshot.collection?.lyrics ?? [], searchIndex: snapshot.searchIndex }
    : null;

  return {
    view,
    online,
    sourcedFromCache: usingSnapshot,
    commitSearch,
    commitTags,
    commitPage,
    pageHref,
    offlineSearchData,
  };
}
