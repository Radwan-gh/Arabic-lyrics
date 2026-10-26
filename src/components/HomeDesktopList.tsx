"use client";

import { SearchBar } from "@/components/SearchBar";
import { TagFilterBar } from "@/components/TagFilterBar";
import { LyricsCard } from "@/components/LyricsCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LyricsSortSelect } from "@/components/LyricsSortSelect";
import { BackToTopButton } from "@/components/BackToTopButton";
import { Spinner } from "@/components/Spinner";
import { useLyricsFeed, type LyricsFeedItem } from "@/lib/use-lyrics-feed";
import { useHomeFilters, type HomeFilters } from "@/lib/use-home-filters";
import { focusRing } from "@/lib/ui";

interface HomeDesktopListProps {
  initialFilters: HomeFilters;
  initialItems: LyricsFeedItem[];
  initialHasMore: boolean;
  initialTotal: number;
  grandTotal: number;
  loggedIn: boolean;
}

const formatCount = (n: number) => n.toLocaleString("en-US");

/** فهرس الأناشيد على سطح المكتب: شبكة بطاقات مرتّبة أبجديًا (أو بالتاريخ) بتمرير
 * لانهائي (بلا ترقيم صفحات)، مع مفتاح ترتيب وزرّ عودة إلى الأعلى. النسخة
 * الغامرة على الموبايل في HomeScreen. */
export function HomeDesktopList({
  initialFilters,
  initialItems,
  initialHasMore,
  initialTotal,
  grandTotal,
  loggedIn,
}: HomeDesktopListProps) {
  const filters = useHomeFilters(initialFilters);
  const { query, tags: selectedTags, sort } = filters;
  const isFiltered = Boolean(query) || selectedTags.length > 0;
  const { items, hasMore, total, loading, error, retry, sentinelRef } = useLyricsFeed({
    filters,
    initialFilters,
    initialItems,
    initialHasMore,
    initialTotal,
  });

  // نُبقي الرابط نظيفًا حين يكون الترتيب الافتراضي (أبجدي تصاعدي) — يطابق سلوك
  // buildUrl في نسخة الموبايل.
  const sortParam = sort !== "title_asc" ? sort : undefined;

  return (
    <div className="flex flex-col gap-6">
      <SearchBar defaultValue={query} tags={selectedTags} sort={sortParam} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">تصفية حسب الوسوم</span>
        <TagFilterBar selected={selectedTags} q={query} sort={sortParam} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600" aria-live="polite">
          <span className="font-medium text-neutral-800">الكل : {formatCount(grandTotal)}</span>
          {isFiltered && <span> ، نتائج البحث : {formatCount(total)}</span>}
        </p>
        <LyricsSortSelect sort={sort} query={query} tags={selectedTags} className="text-neutral-600" />
      </div>

      {items.length === 0 && !hasMore ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          {isFiltered ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد أناشيد بعد"}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <LyricsCard
              key={item.id}
              id={item.id}
              title={item.title}
              artist={item.artist}
              album={item.album}
              tags={item.tags}
              createdAt={new Date(item.createdAt)}
              contentHtml={item.contentHtml}
              action={
                loggedIn ? (
                  <FavoriteButton lyricsId={item.id} initialFavorited={item.favorited} variant="icon" />
                ) : undefined
              }
            />
          ))}
        </ul>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          {error ? (
            <div className="flex flex-col items-center gap-2 text-sm text-neutral-500" role="alert">
              <span>تعذّر تحميل المزيد. تحقّق من اتصالك ثم أعد المحاولة.</span>
              <button type="button" onClick={retry} className={`rounded-md border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 ${focusRing}`}>
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <Spinner label="جارٍ تحميل المزيد…" className="text-sm text-neutral-500" />
          )}
        </div>
      )}
      {!hasMore && !loading && items.length > 0 && (
        <p className="py-2 text-center text-sm text-neutral-400">— نهاية القائمة —</p>
      )}

      <BackToTopButton className="fixed bottom-6 end-6 z-30 h-11 w-11" />
    </div>
  );
}
