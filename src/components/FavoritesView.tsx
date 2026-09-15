"use client";

import { LyricsCard } from "@/components/LyricsCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FavoritesSearchBar } from "@/components/FavoritesSearchBar";
import { FavoritesSortSelect } from "@/components/FavoritesSortSelect";
import { FavoritesReorderList } from "@/components/FavoritesReorderList";
import { Pagination } from "@/components/Pagination";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";
import { useOfflineFavorites, type FavoritesSsrData } from "@/hooks/use-offline-favorites";

/** صفحة المفضّلة على سطح المكتب. تعمل أيضًا للقراءة دون اتصال: `ssr` يُمرَّر
 * null حين لم تُصيَّر الصفحة على الخادم إطلاقًا (غلاف احتياطي)، فتُقرأ المفضّلة
 * من اللقطة المخزَّنة. */
export function FavoritesView({ ssr }: { ssr: FavoritesSsrData | null }) {
  const { view, online, loggedIn, sourcedFromCache, commitSearch, commitSort, commitPage, pageHref } =
    useOfflineFavorites(ssr);
  const { totalCount, query, sort, sortOptions, isCustom, reorderable, items, page, pageCount } = view;

  const header = (
    <div>
      <h1 className="text-2xl font-extrabold">المفضلة</h1>
      <p className="mt-1 text-sm text-neutral-500">
        الأناشيد التي أضفتها إلى مفضّلتك{totalCount > 0 ? ` (${totalCount.toLocaleString("en-US")})` : ""}.
      </p>
    </div>
  );

  if (!loggedIn) {
    return (
      <div className="hidden flex-col gap-6 sm:flex">
        {header}
        <OfflineEmptyState>سجّل الدخول وأنت متصل بالإنترنت لحفظ مفضّلتك للقراءة دون اتصال.</OfflineEmptyState>
      </div>
    );
  }

  const controls = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FavoritesSortSelect value={sort} query={query} options={sortOptions} onSort={commitSort} />
      </div>
      <FavoritesSearchBar defaultValue={query} sort={sort} onSearch={commitSearch} />
    </div>
  );

  return (
    <div className="hidden flex-col gap-6 sm:flex">
      <OfflineBanner online={online} sourcedFromCache={sourcedFromCache} />
      {header}
      {controls}

      {isCustom ? (
        items.length === 0 ? (
          <OfflineEmptyState>
            {query ? "لا توجد أناشيد مطابقة لبحثك في مفضّلتك" : "لا توجد أناشيد في مفضّلتك بعد. أضف أناشيد إليها من صفحة الأنشودة."}
          </OfflineEmptyState>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              {reorderable ? "استخدم الأسهم ▲▼ لإعادة ترتيب مفضّلتك. يُحفظ الترتيب تلقائياً." : "امسح البحث لإعادة ترتيب مفضّلتك."}
            </p>
            <FavoritesReorderList initial={items} reorderable={reorderable} />
          </>
        )
      ) : (
        <>
          {items.length === 0 ? (
            <OfflineEmptyState>
              {query ? "لا توجد أناشيد مطابقة لبحثك في مفضّلتك" : "لا توجد أناشيد في مفضّلتك بعد. أضف أناشيد إليها من صفحة الأنشودة."}
            </OfflineEmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <LyricsCard
                  key={item.lyricsId}
                  id={item.lyricsId}
                  title={item.title}
                  artist={item.artist}
                  album={item.album ?? null}
                  tags={item.tags ?? []}
                  createdAt={item.createdAt ? new Date(item.createdAt) : new Date()}
                  contentHtml={item.contentHtml ?? ""}
                  action={
                    online ? <FavoriteButton lyricsId={item.lyricsId} initialFavorited variant="icon" refreshOnToggle /> : undefined
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
        </>
      )}
    </div>
  );
}
