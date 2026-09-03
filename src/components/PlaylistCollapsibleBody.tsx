"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { lyricsProseCls } from "@/lib/lyrics-prose";
import { focusRing } from "@/lib/ui";

export interface PlaylistBodyItem {
  lyricsId: string;
  title: string;
  artist: string | null;
  contentHtml: string;
}

/**
 * Shared reading body for a playlist: a collapsible summary/index of nasheed
 * titles, then each nasheed with lyrics that collapse/expand by clicking the
 * title. Used by both the owner view and the public shared view; each supplies
 * its own surrounding header/footer.
 */
export function PlaylistCollapsibleBody({ items }: { items: PlaylistBodyItem[] }) {
  // Nasheeds start expanded (reading view); clicking a title collapses it.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [summaryOpen, setSummaryOpen] = useState(true);

  function toggle(lyricsId: string) {
    setCollapsed((prev) => ({ ...prev, [lyricsId]: !prev[lyricsId] }));
  }

  function jumpTo(lyricsId: string) {
    setCollapsed((prev) => ({ ...prev, [lyricsId]: false }));
    document.getElementById(`nasheed-${lyricsId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
        هذه الوصلة فارغة.
      </p>
    );
  }

  return (
    <>
      {/* Collapsible summary / index of nasheed titles */}
      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSummaryOpen((v) => !v)}
          aria-expanded={summaryOpen}
          className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start ${focusRing}`}
        >
          <span className="text-sm font-semibold text-neutral-700">ملخّص الوصلة ({items.length})</span>
          <span aria-hidden className="text-neutral-400">
            {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {summaryOpen && (
          <ol className="flex flex-col gap-0.5 border-t border-neutral-100 px-2 py-2">
            {items.map((item, index) => (
              <li key={item.lyricsId}>
                <button
                  type="button"
                  onClick={() => jumpTo(item.lyricsId)}
                  className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-neutral-50 ${focusRing}`}
                >
                  <span className="w-6 shrink-0 text-center text-neutral-400">{index + 1}</span>
                  <span className="truncate font-medium text-neutral-800">{item.title}</span>
                  {item.artist && <span className="truncate text-xs text-emerald-700">— {item.artist}</span>}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Nasheeds — click a title to collapse/expand its lyrics */}
      <ol className="flex flex-col gap-4">
        {items.map((item, index) => {
          const isCollapsed = collapsed[item.lyricsId];
          return (
            <li
              key={item.lyricsId}
              id={`nasheed-${item.lyricsId}`}
              className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(item.lyricsId)}
                aria-expanded={!isCollapsed}
                className={`flex w-full items-baseline justify-between gap-3 rounded-sm text-start ${focusRing}`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-sm text-neutral-400">{index + 1}</span>
                  <span>
                    <span className="text-xl font-bold font-naskh hover:text-emerald-700">{item.title}</span>
                    {item.artist && <span className="mr-2 text-sm text-emerald-700">{item.artist}</span>}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-neutral-400">
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </span>
              </button>

              {!isCollapsed && (
                <div
                  dir="rtl"
                  className={`mt-3 border-t border-neutral-100 pt-3 ${lyricsProseCls}`}
                  dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
