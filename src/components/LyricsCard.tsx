"use client";

import Link from "next/link";
import { useState } from "react";
import { lyricsProseCls } from "@/lib/lyrics-prose";
import { formatDate } from "@/lib/format";

interface LyricsCardProps {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  createdAt: Date;
  contentHtml: string;
}

export function LyricsCard({ id, title, artist, album, tags, createdAt, contentHtml }: LyricsCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/lyrics/${id}`} className="block">
        <h2 className="truncate text-lg font-bold text-neutral-900">{title}</h2>
        {artist && <p className="truncate text-sm text-emerald-700">{artist}</p>}
        {album && <p className="truncate text-xs text-neutral-400">{album}</p>}
      </Link>

      <p className="mt-1 text-xs text-neutral-400">{formatDate(createdAt)}</p>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Link
              key={t}
              href={`/?tags=${encodeURIComponent(t)}`}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs font-medium text-emerald-700 hover:underline"
      >
        {expanded ? "إخفاء الكلمات ▲" : "عرض الكلمات كاملة ▼"}
      </button>

      {expanded && (
        <div
          dir="rtl"
          className={`mt-2 border-t border-neutral-100 pt-2 text-sm ${lyricsProseCls}`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </li>
  );
}
