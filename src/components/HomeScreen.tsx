"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Music, Search } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MenuButton } from "@/components/MenuButton";
import { SearchOverlayScreen } from "@/components/SearchOverlayScreen";
import { Pagination } from "@/components/Pagination";
import type { TagCount } from "@/lib/tags";
import { focusRing } from "@/lib/ui";

export interface HomeRow {
  id: string;
  title: string;
  artist: string | null;
  tags: string[];
  favorited: boolean;
}

interface HomeScreenProps {
  query: string;
  selectedTags: string[];
  items: HomeRow[];
  grandTotal: number;
  filteredTotal: number;
  isFiltered: boolean;
  tagCounts: TagCount[];
  page: number;
  pageCount: number;
  loggedIn: boolean;
}

/** شاشة الرئيسية الغامرة على الموبايل (اتجاه 1a — قائمة هادئة): بحث دائم،
 * شريط وسوم أفقي، قائمة صفوف، وزرّ بحث عائم يفتح شاشة البحث الكاملة.
 * سطح المكتب يبقى على شبكة البطاقات الحالية. */
export function HomeScreen({
  query,
  selectedTags,
  items,
  grandTotal,
  filteredTotal,
  isFiltered,
  tagCounts,
  page,
  pageCount,
  loggedIn,
}: HomeScreenProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [tagQuery, setTagQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  function buildUrl(overrides: { q?: string; tags?: string[] }) {
    const params = new URLSearchParams();
    const nextQ = overrides.q ?? query;
    const nextTags = overrides.tags ?? selectedTags;
    if (nextQ) params.set("q", nextQ);
    if (nextTags.length) params.set("tags", nextTags.join(","));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  // بحث حيّ (مُؤخَّر) — يطابق سلوك SearchBar الحالي على سطح المكتب.
  useEffect(() => {
    if (search.trim() === query.trim()) return;
    const timer = setTimeout(() => router.replace(buildUrl({ q: search })), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    router.push(buildUrl({ tags: next }));
  }

  function clearTags() {
    router.push(buildUrl({ tags: [] }));
  }

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  const visibleTagCounts = tagQuery.trim()
    ? tagCounts.filter((t) => t.tag.toLowerCase().includes(tagQuery.trim().toLowerCase()))
    : tagCounts;

  if (searchOpen) {
    return (
      <SearchOverlayScreen initialQuery={query} popularTags={tagCounts.slice(0, 8)} onClose={() => setSearchOpen(false)} />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-2.5">
        <div className="flex items-center gap-2 text-xl font-extrabold text-emerald-700">
          <Music className="h-5 w-5" aria-hidden="true" />
          أناشيد
        </div>
        <MenuButton />
      </header>

      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-5 w-5 text-[#9aa39d]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن نشيد أو منشد أو كلمة..."
            aria-label="ابحث عن نشيد أو منشد أو كلمة"
            className="h-12 w-full rounded-2xl border border-[#e6e6e1] bg-white ps-11 pe-3.5 text-base text-[#14211c] placeholder:text-[#9aa39d] focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-5 pb-3.5">
        <div className="flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#c8d1cc] bg-white px-3 text-[#6b7670]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" />
            <path d="M6 9.01V9" />
          </svg>
          <input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="ابحث عن وسم"
            aria-label="ابحث عن وسم لعرضه في الشريط"
            className="w-[74px] border-0 bg-transparent text-sm text-[#14211c] outline-none placeholder:text-[#9aa39d]"
          />
        </div>
        <button
          type="button"
          onClick={clearTags}
          aria-pressed={selectedTags.length === 0}
          className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm ${
            selectedTags.length === 0 ? "bg-emerald-700 font-medium text-white" : "border border-[#e6e6e1] bg-white text-[#3c4a44]"
          } ${focusRing}`}
        >
          الكل
          <span className={selectedTags.length === 0 ? "text-xs text-white/75" : "text-xs text-[#9aa39d]"}>
            {grandTotal.toLocaleString("ar-EG")}
          </span>
        </button>
        {visibleTagCounts.map((t) => {
          const active = selectedTags.includes(t.tag);
          return (
            <button
              key={t.tag}
              type="button"
              onClick={() => toggleTag(t.tag)}
              aria-pressed={active}
              className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm ${
                active ? "bg-emerald-700 font-medium text-white" : "border border-[#e6e6e1] bg-white text-[#3c4a44]"
              } ${focusRing}`}
            >
              {t.tag}
              <span className={active ? "text-xs text-white/75" : "text-xs text-[#9aa39d]"}>{t.count.toLocaleString("ar-EG")}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 border-t border-[#e6e6e1] bg-white">
        <div className="flex items-center justify-between bg-[#f7f7f4] px-5 py-2.5">
          <span className="text-[13px] font-bold text-emerald-700">{isFiltered ? "نتائج البحث" : "الأحدث"}</span>
          <span className="text-[13px] text-[#6b7670]">{filteredTotal.toLocaleString("ar-EG")} نشيداً</span>
        </div>

        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6b7670]">{isFiltered ? "لا توجد نتائج مطابقة" : "لا توجد أناشيد بعد"}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex min-h-16 items-center gap-2.5 border-b border-[#f0f0ec] px-5 py-3">
              <Link href={`/lyrics/${item.id}`} className={`min-w-0 flex-1 rounded-sm ${focusRing}`}>
                <div className="truncate text-[17px] font-bold leading-[1.4]">{item.title}</div>
                <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">
                  {[item.artist, item.tags[0]].filter(Boolean).join(" · ")}
                </div>
              </Link>
              {loggedIn && <FavoriteButton lyricsId={item.id} initialFavorited={item.favorited} variant="plain" />}
            </div>
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="bg-white px-4 pb-6 pt-4">
          <Pagination page={page} pageCount={pageCount} hrefFor={pageHref} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="بحث"
        className="fixed bottom-7 start-5 z-30 inline-flex h-[60px] w-[60px] items-center justify-center rounded-full bg-emerald-700 text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]"
      >
        <Search className="h-[26px] w-[26px]" aria-hidden="true" />
      </button>
    </div>
  );
}
