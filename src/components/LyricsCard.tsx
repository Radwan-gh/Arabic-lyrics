"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { lyricsProseFormatCls } from "@/lib/lyrics-prose";
import { formatDate } from "@/lib/format";
import { focusRing } from "@/lib/ui";

interface LyricsCardProps {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  createdAt: Date;
  contentHtml: string;
  /** Optional action rendered at the card's inline-end (e.g. a favorite toggle). */
  action?: ReactNode;
}

export function LyricsCard({ id, title, artist, album, tags, createdAt, contentHtml, action }: LyricsCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/lyrics/${id}`} className={`block min-w-0 flex-1 rounded-sm ${focusRing}`}>
          <h2 className="truncate text-lg font-bold text-neutral-900 font-naskh">{title}</h2>
          {artist && <p className="truncate text-sm text-emerald-700">{artist}</p>}
          {album && <p className="truncate text-xs text-neutral-500">{album}</p>}
        </Link>
        {action}
      </div>

      <p className="mt-1 text-xs text-neutral-500">{formatDate(createdAt)}</p>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Link
              key={t}
              href={`/?tags=${encodeURIComponent(t)}`}
              className={`rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200 ${focusRing}`}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`mt-2 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-emerald-700 hover:underline ${focusRing}`}
      >
        {expanded ? "إخفاء الأنشودة" : "عرض الأنشودة كاملة"}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div
          dir="rtl"
          className={`mt-2 border-t border-neutral-100 pt-2 text-sm leading-loose ${lyricsProseFormatCls}`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </li>
  );
}
