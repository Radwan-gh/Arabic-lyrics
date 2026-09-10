"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { addRecentSearch, readRecentSearches } from "@/lib/recent-searches";
import type { TagCount } from "@/lib/tags";
import { focusRing } from "@/lib/ui";

interface HighlightSpan {
  before: string;
  match: string;
  after: string;
  truncatedStart?: boolean;
  truncatedEnd?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  artist: string | null;
  tags: string[];
  titleMatch: HighlightSpan | null;
  snippet: HighlightSpan | null;
}

function Highlight({ span }: { span: HighlightSpan }) {
  return (
    <>
      {span.truncatedStart && "… "}
      {span.before}
      <span className="rounded bg-[#d9f2e6] px-[3px]">{span.match}</span>
      {span.after}
      {span.truncatedEnd && " …"}
    </>
  );
}

/** شاشة البحث الكاملة (زر البحث العائم بالرئيسية): نتائج حيّة مع تظليل
 * المطابقة، عمليات بحث أخيرة، ووسوم شائعة عند خلوّ الحقل. */
export function SearchOverlayScreen({
  initialQuery,
  popularTags,
  onClose,
}: {
  initialQuery: string;
  popularTags: TagCount[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecent(readRecentSearches());
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term && !activeTag) {
      setResults(null);
      setTotal(0);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (activeTag) params.set("tags", activeTag);
      fetch(`/api/lyrics?${params.toString()}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          setResults(data.items ?? []);
          setTotal(data.total ?? 0);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults([]);
            setTotal(0);
          }
        });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, activeTag]);

  function runQuery(term: string) {
    setActiveTag(null);
    setQuery(term);
    addRecentSearch(term);
    setRecent(readRecentSearches());
  }

  function runTag(tag: string) {
    setQuery("");
    setActiveTag(tag);
  }

  const showIdle = !query.trim() && !activeTag;

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh flex-col bg-white text-[#14211c]">
      <div className="flex items-center gap-2.5 px-3 pb-3.5 pt-3">
        <button type="button" onClick={onClose} aria-label="رجوع" className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-5 w-5 text-emerald-700" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setActiveTag(null);
              setQuery(e.target.value);
            }}
            onBlur={() => query.trim() && addRecentSearch(query)}
            placeholder="ابحث عن نشيد أو منشد أو كلمة..."
            aria-label="ابحث عن نشيد أو منشد أو كلمة"
            className="h-12 w-full rounded-2xl border border-emerald-700 bg-white ps-11 pe-11 text-base text-[#14211c] focus:outline-none"
          />
          {(query || activeTag) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveTag(null);
              }}
              aria-label="مسح البحث"
              className="absolute inset-y-0 end-3 my-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#eceeed] text-[#6b7670]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!showIdle && (
        <div className="px-5 pb-2.5 text-[13px] text-[#6b7670]">
          {results === null ? "جارٍ البحث…" : `${total.toLocaleString("ar-EG")} نتيجة${activeTag ? ` لـ #${activeTag}` : query ? ` لـ «${query}»` : ""} · يتجاهل البحث التشكيل وصور الهمزة`}
        </div>
      )}

      <div className="flex-1 overflow-y-auto border-t border-[#f0f0ec]">
        {showIdle ? (
          <div className="flex flex-col gap-3 p-5">
            {recent.length > 0 && (
              <>
                <span className="text-[13px] font-bold text-[#6b7670]">عمليات بحث سابقة</span>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => runQuery(r)}
                      className={`h-[34px] rounded-full bg-[#f2f2ee] px-3.5 text-sm text-[#3c4a44] ${focusRing}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}
            {popularTags.length > 0 && (
              <>
                <span className="mt-1.5 text-[13px] font-bold text-[#6b7670]">الوسوم الأكثر استخداماً</span>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => runTag(t.tag)}
                      className={`inline-flex h-[34px] items-center gap-1.5 rounded-full bg-[#ecfdf5] px-3.5 text-sm font-medium text-emerald-700 ${focusRing}`}
                    >
                      #{t.tag}
                      <span className="text-xs text-[#6ba892]">{t.count.toLocaleString("ar-EG")}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : results === null || results.length === 0 ? (
          results !== null && (
            <p className="p-8 text-center text-sm text-[#6b7670]">لا توجد نتائج مطابقة</p>
          )
        ) : (
          results.map((r) => (
            <Link key={r.id} href={`/lyrics/${r.id}`} className={`block border-b border-[#f0f0ec] px-5 py-3.5 ${focusRing}`}>
              <div className="text-[17px] font-bold">{r.titleMatch ? <Highlight span={r.titleMatch} /> : r.title}</div>
              {r.snippet && (
                <div className="mt-1 text-sm leading-[1.9] text-[#3c4a44]">
                  <Highlight span={r.snippet} />
                </div>
              )}
              <div className="mt-1 text-[13px] text-[#6b7670]">{[r.artist, r.tags[0]].filter(Boolean).join(" · ")}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
