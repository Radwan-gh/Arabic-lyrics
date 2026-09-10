"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Search, GripVertical } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Pagination } from "@/components/Pagination";
import { useReorderableList } from "@/lib/use-reorderable-list";
import { useDragReorder } from "@/lib/use-drag-reorder";
import { persistFavoritesOrder } from "@/lib/favorites-order";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";

export interface FavoritesRow {
  lyricsId: string;
  title: string;
  artist: string | null;
}

interface FavoritesScreenProps {
  totalCount: number;
  query: string;
  sort: string;
  sortOptions: { value: string; label: string }[];
  isCustom: boolean;
  reorderable: boolean;
  items: FavoritesRow[];
  page: number;
  pageCount: number;
}

/** شاشة المفضلة الغامرة على الموبايل: بحث دائم، شرائط ترتيب أفقية، وقائمة صفوف
 * (سحب بمقبض في الترتيب المخصّص). سطح المكتب يبقى على التخطيط الحالي (بطاقات/أسهم).
 *
 * `pageHref` يُبنى هنا محليًا لا يُمرَّر من الخادم — دوال JS غير قابلة للتسلسل
 * عبر حدّ خادم/عميل، وتمريرها كان يُسقط الصفحة بخطأ 500. */
export function FavoritesScreen({
  totalCount,
  query,
  sort,
  sortOptions,
  isCustom,
  reorderable,
  items: initialItems,
  page,
  pageCount,
}: FavoritesScreenProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const { items, move } = useReorderableList(initialItems, (i) => i.lyricsId, persistFavoritesOrder);
  const { draggingIndex, offsetY, startDrag, onDragMove, endDrag, onKeyDown } = useDragReorder(items.length, move);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (sort !== "recent") params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `/favorites?${qs}` : "/favorites");
  }

  function changeSort(next: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (next !== "recent") params.set("sort", next);
    const qs = params.toString();
    router.push(qs ? `/favorites?${qs}` : "/favorites");
  }

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort !== "recent") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/favorites?${qs}` : "/favorites";
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center gap-2 px-3 pb-1 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="text-xl font-extrabold">المفضلة</span>
        <span className="text-sm text-[#6b7670]">{totalCount.toLocaleString("ar-EG")}</span>
        <div className="flex-1" />
        <MenuButton />
      </header>

      <form onSubmit={submitSearch} className="px-5 pb-2 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-[14px] my-auto h-5 w-5 text-[#9aa39d]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في المفضلة..."
            aria-label="ابحث في المفضلة"
            className="h-12 w-full rounded-2xl border border-[#e6e6e1] bg-white ps-[44px] pe-3.5 text-base text-[#14211c] placeholder:text-[#9aa39d] focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </form>

      <div className="flex gap-2 overflow-x-auto px-5 pb-3.5" role="group" aria-label="ترتيب المفضلة">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => changeSort(opt.value)}
            aria-pressed={opt.value === sort}
            className={`h-[34px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm ${
              opt.value === sort
                ? "bg-emerald-700 font-medium text-white"
                : "border border-[#e6e6e1] bg-white text-[#3c4a44]"
            } ${focusRing}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex-1 border-t border-[#e6e6e1] bg-white">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6b7670]">
            {query ? "لا توجد أناشيد مطابقة لبحثك في مفضّلتك" : "لا توجد أناشيد في مفضّلتك بعد."}
          </p>
        ) : (
          <>
            {isCustom && reorderable && (
              <div className="bg-[#f7f7f4] px-5 py-2.5 text-[13px] text-[#6b7670]">اسحب المقبض لإعادة الترتيب</div>
            )}
            <ul>
              {items.map((item, index) => (
                <li
                  key={item.lyricsId}
                  data-drag-row
                  className="flex min-h-16 items-center gap-2.5 border-b border-[#f0f0ec] px-4 py-3"
                  style={
                    isCustom && draggingIndex === index
                      ? { transform: `translateY(${offsetY}px)`, position: "relative", zIndex: 10, background: "#fbfbf9", boxShadow: "0 6px 16px rgba(20,33,28,0.08)" }
                      : undefined
                  }
                >
                  {isCustom && reorderable && (
                    <button
                      type="button"
                      aria-label="إعادة ترتيب — اسحب أو استخدم مفاتيح الأسهم"
                      className={`inline-flex h-11 w-6 shrink-0 items-center justify-center text-[#c3c9c5] ${draggingIndex === index ? "text-emerald-700" : ""} ${focusRing}`}
                      style={{ touchAction: "none" }}
                      onPointerDown={(e) => startDrag(index, e)}
                      onPointerMove={onDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(e) => onKeyDown(index, e)}
                    >
                      <GripVertical className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/lyrics/${item.lyricsId}`} className={`block truncate text-[17px] font-bold ${focusRing}`}>
                      {item.title}
                    </Link>
                    {item.artist && <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">{item.artist}</div>}
                  </div>
                  <FavoriteButton lyricsId={item.lyricsId} initialFavorited variant="plain" refreshOnToggle />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!isCustom && pageCount > 1 && (
        <div className="px-4 py-4">
          <Pagination page={page} pageCount={pageCount} hrefFor={pageHref} />
        </div>
      )}
    </div>
  );
}
