"use client";

import { SearchBar } from "@/components/SearchBar";
import { TagFilterBar } from "@/components/TagFilterBar";
import { LyricsCard } from "@/components/LyricsCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Pagination } from "@/components/Pagination";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useOfflineHome, type HomeSsrData } from "@/hooks/use-offline-home";

/** واجهة الرئيسية على سطح المكتب. تعمل أيضًا للقراءة دون اتصال: `ssr` يُمرَّر
 * null حين لم تُصيَّر الصفحة على الخادم إطلاقًا (غلاف احتياطي)، فتُقرأ ومُصفَّى
 * من اللقطة المخزَّنة عبر useOfflineHome — نفس المكوّن، نفس المسار "/‏". */
export function HomeView({ ssr }: { ssr: HomeSsrData | null }) {
  const { view, online, sourcedFromCache, commitSearch, commitTags, pageHref, commitPage } = useOfflineHome(ssr);
  const { query, selectedTags, items, grandTotal, filteredTotal, isFiltered, page, pageCount, loggedIn } = view;

  const formatCount = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="hidden flex-col gap-6 sm:flex">
      <OfflineBanner online={online} sourcedFromCache={sourcedFromCache} />

      <SearchBar defaultValue={query} tags={selectedTags} onSearch={commitSearch} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">تصفية حسب الوسوم</span>
        <TagFilterBar selected={selectedTags} q={query} onChange={commitTags} />
      </div>

      <p className="text-sm text-neutral-600" aria-live="polite">
        <span className="font-medium text-neutral-800">الكل : {formatCount(grandTotal)}</span>
        {isFiltered && <span> ، نتائج البحث : {formatCount(filteredTotal)}</span>}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          {query || selectedTags.length ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد أناشيد بعد"}
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
                loggedIn && online ? (
                  <FavoriteButton lyricsId={item.id} initialFavorited={item.favorited} variant="icon" />
                ) : undefined
              }
            />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefFor={pageHref}
        onPageChange={sourcedFromCache ? commitPage : undefined}
      />
    </div>
  );
}
