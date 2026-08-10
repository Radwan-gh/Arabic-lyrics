"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { focusRing } from "@/lib/ui";

export interface FavoriteRow {
  lyricsId: string;
  title: string;
  artist: string | null;
  album: string | null;
}

/**
 * Single-column list for the "custom order" view. When `reorderable`, each row
 * has ▲/▼ controls that swap adjacent items and persist the whole order via
 * PATCH /api/favorites. Removal is handled by the favorite heart (which
 * refreshes the server list).
 */
export function FavoritesReorderList({
  initial,
  reorderable,
}: {
  initial: FavoriteRow[];
  reorderable: boolean;
}) {
  const [items, setItems] = useState(initial);

  async function persistOrder(next: FavoriteRow[]) {
    await fetch("/api/favorites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((i) => i.lyricsId) }),
    }).catch(() => {});
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    void persistOrder(next);
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item.lyricsId}
          className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-6 shrink-0 text-center text-sm text-neutral-500">{index + 1}</span>
            <div className="min-w-0">
              <Link
                href={`/lyrics/${item.lyricsId}`}
                className={`block truncate rounded-sm font-medium hover:text-emerald-700 ${focusRing}`}
              >
                {item.title}
              </Link>
              {item.artist && <p className="truncate text-xs text-emerald-700">{item.artist}</p>}
              {item.album && <p className="truncate text-xs text-neutral-500">{item.album}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {reorderable && (
              <>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="تحريك لأعلى"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition-colors hover:bg-neutral-50 disabled:opacity-30 ${focusRing}`}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="تحريك لأسفل"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition-colors hover:bg-neutral-50 disabled:opacity-30 ${focusRing}`}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
            <FavoriteButton lyricsId={item.lyricsId} initialFavorited variant="icon" refreshOnToggle />
          </div>
        </li>
      ))}
    </ul>
  );
}
