"use client";

import { useSearchParams } from "next/navigation";
import { LyricsCard } from "@/components/LyricsCard";
import { FavoritesSearchBar } from "@/components/FavoritesSearchBar";
import { FavoritesSortSelect } from "@/components/FavoritesSortSelect";
import { FavoritesReorderList, type FavoriteRow } from "@/components/FavoritesReorderList";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Pagination } from "@/components/Pagination";
import { FavoritesScreen } from "@/components/FavoritesScreen";
import { OfflinePageFallback } from "@/components/OfflinePageFallback";
import {
  FAVORITES_PAGE_SIZE,
  FAVORITES_SORT_OPTIONS,
  favoritesParamsKey,
  parseFavoritesParams,
  type FavoritesParams,
} from "@/lib/favorites-sorts";
import { matchesSearch, useOfflinePageData, type OfflineDataset } from "@/lib/offline-data";
import type { OfflineLyric } from "@/lib/offline";

export interface FavoriteCard {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  /** ISO string. */
  createdAt: string;
  contentHtml: string;
}

export interface FavoritesData {
  /** المعاملات التي حُسبت بها هذه البيانات. */
  params: FavoritesParams;
  /** إجمالي المفضّلة بلا تصفية (العدّاد في شاشة الموبايل). */
  totalCount: number;
  pageCount: number;
  /** صفوف الصفحة (أو القائمة كلها في الترتيب المخصّص). */
  rows: FavoriteRow[];
  /** بطاقات الصفحة لسطح المكتب (الترتيبات غير المخصّصة). */
  cards: FavoriteCard[];
}

/**
 * صفحة المفضّلة: متصلةً يمرّر الخادم `data`؛ ودون اتصال (هيكل بلا بيانات، أو تغيّر
 * البحث/الترتيب محليًا — راجع useAppRouter) تُحسب من بيانات الجهاز حسب الرابط.
 */
export function FavoritesPage({ data }: { data: FavoritesData | null }) {
  const searchParams = useSearchParams();
  const params = parseFavoritesParams({
    q: searchParams.get("q"),
    sort: searchParams.get("sort"),
    page: searchParams.get("page"),
  });
  const key = favoritesParamsKey(params);
  const server = data && favoritesParamsKey(data.params) === key ? data : null;
  const state = useOfflinePageData(server, (dataset) => selectFavorites(dataset, params), key);
  if (state.status !== "ready") return <OfflinePageFallback status={state.status} />;
  return <FavoritesView key={key} data={state.data} />;
}

// يطابق استعلامات صفحة المفضّلة على الخادم، على بيانات الجهاز.
function selectFavorites(dataset: OfflineDataset, params: FavoritesParams): FavoritesData | null {
  if (!dataset.me) return null;
  const { query, sort, page } = params;
  const entries = dataset.me.favorites
    .map((f) => ({ lyric: dataset.byId.get(f.lyricsId), addedAt: f.createdAt }))
    .filter((e): e is { lyric: OfflineLyric; addedAt: string } => !!e.lyric);
  const filtered = entries.filter((e) => matchesSearch(dataset, e.lyric, query));
  const toRow = ({ lyric }: { lyric: OfflineLyric }): FavoriteRow => ({
    lyricsId: lyric.id,
    title: lyric.title,
    artist: lyric.artist,
    album: lyric.album,
  });

  if (sort === "custom") {
    // مفضّلة الجهاز محفوظة بترتيب المستخدم الخاص (position).
    return { params, totalCount: entries.length, pageCount: 1, rows: filtered.map(toRow), cards: [] };
  }

  const text = (a: string | null, b: string | null) =>
    a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b, "ar");
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "recent":
        return a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0;
      case "oldest":
        return a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : 0;
      case "title":
        return text(a.lyric.title, b.lyric.title);
      case "artist":
        return text(a.lyric.artist, b.lyric.artist);
    }
  });
  const pageItems = sorted.slice((page - 1) * FAVORITES_PAGE_SIZE, page * FAVORITES_PAGE_SIZE);
  return {
    params,
    totalCount: entries.length,
    pageCount: Math.max(1, Math.ceil(sorted.length / FAVORITES_PAGE_SIZE)),
    rows: pageItems.map(toRow),
    cards: pageItems.map(({ lyric }) => ({
      id: lyric.id,
      title: lyric.title,
      artist: lyric.artist,
      album: lyric.album,
      tags: lyric.tags,
      createdAt: lyric.createdAt,
      contentHtml: lyric.contentHtml,
    })),
  };
}

function FavoritesView({ data }: { data: FavoritesData }) {
  const { query, sort, page } = data.params;
  const isCustom = sort === "custom";
  // إعادة الترتيب لا معنى لها إلا على القائمة كاملة بلا تصفية.
  const reorderable = isCustom && query.length === 0;

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort !== "recent") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/favorites?${qs}` : "/favorites";
  }

  const emptyMessage = query
    ? "لا توجد أناشيد مطابقة لبحثك في مفضّلتك"
    : "لا توجد أناشيد في مفضّلتك بعد. أضف أناشيد إليها من صفحة الأنشودة.";

  return (
    <>
      <div className="sm:hidden">
        <FavoritesScreen
          totalCount={data.totalCount}
          query={query}
          sort={sort}
          sortOptions={FAVORITES_SORT_OPTIONS}
          isCustom={isCustom}
          reorderable={reorderable}
          items={data.rows}
          page={page}
          pageCount={data.pageCount}
        />
      </div>

      <div className="hidden flex-col gap-6 sm:flex">
        <div>
          <h1 className="text-2xl font-extrabold">المفضلة</h1>
          <p className="mt-1 text-sm text-neutral-500">الأناشيد التي أضفتها إلى مفضّلتك.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FavoritesSortSelect value={sort} query={query} options={FAVORITES_SORT_OPTIONS} />
          </div>
          <FavoritesSearchBar defaultValue={query} sort={sort} />
        </div>

        {isCustom ? (
          data.rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">{emptyMessage}</p>
          ) : (
            <>
              <p className="text-sm text-neutral-500">
                {reorderable
                  ? "استخدم الأسهم ▲▼ لإعادة ترتيب مفضّلتك. يُحفظ الترتيب تلقائياً."
                  : "امسح البحث لإعادة ترتيب مفضّلتك."}
              </p>
              <FavoritesReorderList initial={data.rows} reorderable={reorderable} />
            </>
          )
        ) : (
          <>
            {data.cards.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">{emptyMessage}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.cards.map((item) => (
                  <LyricsCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    artist={item.artist}
                    album={item.album}
                    tags={item.tags}
                    createdAt={new Date(item.createdAt)}
                    contentHtml={item.contentHtml}
                    action={<FavoriteButton lyricsId={item.id} initialFavorited variant="icon" refreshOnToggle />}
                  />
                ))}
              </ul>
            )}
            <Pagination page={page} pageCount={data.pageCount} hrefFor={pageHref} />
          </>
        )}
      </div>
    </>
  );
}
